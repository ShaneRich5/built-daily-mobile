import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { failureMessage } from '@/components/groups/group-panels';
import { Avatar } from '@/components/groups/group-ui';
import { type MenuAction, MenuPanel } from '@/components/session/panels/list-panels';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { ArrowLeftIcon, EllipsisIcon, PlayIcon, Trash2Icon } from '@/components/ui/icons';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetHost } from '@/components/ui/sheet';
import { FontFamily, MaxContentWidth, Radius } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { useGroup } from '@/hooks/use-groups';
import { useStartWorkout } from '@/hooks/use-start-workout';
import { useTheme } from '@/hooks/use-theme';
import { shortDayLabel, weekdayShort } from '@/lib/date-keys';
import { firstName, formatPlanTime, goingDetail, groupDisplayName, joinNames } from '@/lib/groups-model';
import { confirm } from '@/services/confirm';
import {
  cancelSharedPlan,
  joinSharedPlan,
  leaveSharedPlan,
  startableExerciseIds,
  subscribeToSharedPlan,
} from '@/services/firestore/group-plan-repository';
import type { SharedPlan } from '@/types/group';
import type { ScheduledWorkout } from '@/types/planner';

/**
 * G7: one plan together — who's going, the workout, and "I'm in" or "Can't
 * make it". On the day, someone going can start it straight into a workout.
 */
export function PlanScreen({ groupId, planId }: { groupId: string; planId: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const data = useGroup(groupId);
  const { group, members, todayKey, myUid } = data;
  const { startPlanned, isStarting } = useStartWorkout();
  const [plan, setPlan] = useState<{ key: string; plan: SharedPlan | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = `${groupId}/${planId}`;
  useEffect(() => {
    if (!myUid) return;
    return subscribeToSharedPlan(groupId, planId, {
      onData: (next) => setPlan({ key, plan: next }),
      onError: () => setPlan({ key, plan: null }),
    });
  }, [myUid, groupId, planId, key]);

  const current = plan?.key === key ? plan.plan : undefined;
  const leave = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/groups/[groupId]', params: { groupId } }));

  if (current === undefined || group === undefined) {
    return (
      <SafeAreaView style={[styles.root, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (current === null || group === null) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <IconButton icon={ArrowLeftIcon} accessibilityLabel="Back" variant="plain" onPress={leave} style={styles.back} />
          <ThemedText type="heading">This plan isn’t here anymore</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            It may have been cancelled.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const names = new Map(members.map((member) => [member.uid, firstName(member.displayName)]));
  const nameOf = (uid: string) => (uid === myUid ? 'You' : (names.get(uid) ?? 'Someone'));
  const notYet = members
    .filter((member) => !current.going.includes(member.uid) && member.uid !== myUid)
    .map((member) => firstName(member.displayName));
  const isGoing = myUid !== null && current.going.includes(myUid);
  const isCreator = current.createdBy === myUid;
  const isPast = current.dateKey < todayKey;
  const isToday = current.dateKey === todayKey;
  const day = shortDayLabel(current.dateKey);
  const meta = [formatPlanTime(current.time) ?? 'Anytime', current.where].filter(Boolean).join(' · ');
  const plannedBy = isCreator ? 'you' : firstName(current.createdByName);

  const run = async (write: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await write();
    } catch (failure) {
      setError(failureMessage(failure, fallback));
    } finally {
      setBusy(false);
    }
  };

  const imIn = () =>
    user && void run(() => joinSharedPlan(user, groupId, planId), 'Couldn’t add you. Check your connection and try again.');

  const cantMake = () =>
    user && void run(() => leaveSharedPlan(user, groupId, planId), 'Couldn’t save that. Check your connection and try again.');

  const start = () => {
    // What a linked planner entry holds, so the workout is built the same way.
    const entry: ScheduledWorkout = {
      id: '',
      dateKey: current.dateKey,
      label: current.label,
      planId: null,
      exerciseIds: startableExerciseIds(current.exercises),
      status: 'planned',
      sessionId: null,
      createdAt: new Date(),
      sharedPlanId: current.id,
      groupId,
    };
    void startPlanned(entry);
  };

  const cancelPlan = async () => {
    setMenuOpen(false);
    if (!user) return;
    const ok = await confirm({
      title: `Cancel ${current.label}?`,
      message: 'It comes off the group. Anyone going keeps it on their own planner.',
      confirmLabel: 'Cancel plan',
      destructive: true,
    });
    if (!ok) return;
    await run(() => cancelSharedPlan(user, groupId, planId), 'Couldn’t cancel it. Check your connection and try again.');
    leave();
  };

  const menu: MenuAction[] = [{ label: 'Cancel plan', icon: Trash2Icon, destructive: true, onPress: () => void cancelPlan() }];

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <IconButton icon={ArrowLeftIcon} accessibilityLabel="Back" variant="plain" onPress={leave} style={styles.back} />
          <ThemedText type="labelStrong" numberOfLines={1} style={styles.topTitle}>
            {groupDisplayName(group, members, myUid, data.buddyNickname)}
          </ThemedText>
          {isCreator ? (
            <IconButton icon={EllipsisIcon} accessibilityLabel="Plan options" variant="plain" onPress={() => setMenuOpen(true)} />
          ) : (
            <View style={styles.spacer} />
          )}
        </View>

        <View style={styles.header}>
          <View style={[styles.tile, { backgroundColor: theme.inverse }]}>
            <ThemedText style={[styles.tileWeekday, { color: theme.onInverse }]}>
              {weekdayShort(current.dateKey).toUpperCase()}
            </ThemedText>
            <ThemedText style={[styles.tileDay, { color: theme.onInverse }]}>{Number(current.dateKey.slice(8, 10))}</ThemedText>
          </View>
          <View style={styles.flex}>
            <ThemedText type="title" accessibilityRole="header" numberOfLines={1}>
              {current.label}
            </ThemedText>
            <ThemedText type="small" themeColor="textBody" numberOfLines={1}>
              {meta}
            </ThemedText>
            <ThemedText type="caption">Planned by {plannedBy}</ThemedText>
          </View>
        </View>

        {current.note ? (
          <View style={[styles.note, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textBody">
              <ThemedText type="smallBold">{isCreator ? 'You' : firstName(current.createdByName)}:</ThemedText> {current.note}
            </ThemedText>
          </View>
        ) : null}

        {error ? (
          <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
            {error}
          </ThemedText>
        ) : null}

        <View style={styles.section}>
          <SectionLabel>{`Going · ${current.going.length}`}</SectionLabel>
          <Card padded={false}>
            {current.going.map((uid, i) => (
              <View
                key={uid}
                style={[styles.person, i > 0 && { borderTopColor: theme.borderSubtle, borderTopWidth: 1 }]}>
                <Avatar name={nameOf(uid)} size="sm" />
                <View style={styles.flex}>
                  <ThemedText type="label">{nameOf(uid)}</ThemedText>
                  <ThemedText type="caption">{goingDetail(current.goingAt[uid], uid === current.createdBy, todayKey)}</ThemedText>
                </View>
              </View>
            ))}
          </Card>
          {notYet.length > 0 ? (
            <ThemedText type="small" themeColor="textMuted">
              {joinNames(notYet)} {notYet.length === 1 ? 'hasn’t' : 'haven’t'} said yet. No pressure either way.
            </ThemedText>
          ) : null}
        </View>

        {current.exercises.length > 0 ? (
          <View style={styles.section}>
            <SectionLabel>The workout</SectionLabel>
            <Card padded={false}>
              {current.exercises.map((exercise, i) => (
                <View
                  key={`${exercise.id}-${i}`}
                  style={[styles.exercise, i > 0 && { borderTopColor: theme.borderSubtle, borderTopWidth: 1 }]}>
                  <ThemedText type="monoSmall" themeColor="textFaint" style={styles.index}>
                    {i + 1}
                  </ThemedText>
                  <ThemedText type="label" numberOfLines={1} style={styles.flex}>
                    {exercise.name}
                  </ThemedText>
                  {exercise.sets ? <ThemedText type="caption">{exercise.sets} sets</ThemedText> : null}
                </View>
              ))}
            </Card>
            <ThemedText type="small" themeColor="textMuted">
              You’ll log your own sets. Starting it copies these exercises into your workout.
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      {!isPast ? (
        <View
          style={[
            styles.bar,
            { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 12) },
          ]}>
          <View style={styles.barButtons}>
            {isGoing ? (
              <Button label="Can’t make it" variant="secondary" size="lg" disabled={busy} onPress={cantMake} style={styles.flex} />
            ) : null}
            {isGoing && isToday ? (
              <Button label="Start" icon={PlayIcon} size="lg" busy={isStarting} onPress={start} style={styles.flexTwo} />
            ) : !isGoing ? (
              <Button label="I’m in" size="lg" busy={busy} onPress={imIn} style={styles.flexTwo} />
            ) : null}
          </View>
          <ThemedText type="caption" style={styles.centerText}>
            {isGoing ? `It’s on your planner for ${day}.` : `I’m in adds it to your planner for ${day}.`}
          </ThemedText>
        </View>
      ) : null}

      <SheetHost visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <MenuPanel title={current.label} actions={menu} />
      </SheetHost>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignSelf: 'center',
    gap: 18,
    maxWidth: MaxContentWidth,
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 8,
    width: '100%',
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  flexTwo: {
    flex: 2,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
  },
  spacer: {
    width: 44,
  },
  back: {
    marginLeft: -10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  tile: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  tileWeekday: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 13,
    opacity: 0.7,
  },
  tileDay: {
    fontFamily: FontFamily.semibold,
    fontSize: 20,
    lineHeight: 24,
  },
  note: {
    borderRadius: Radius.lg,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  section: {
    gap: 8,
  },
  person: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  exercise: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  index: {
    textAlign: 'right',
    width: 20,
  },
  bar: {
    borderTopWidth: 1,
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  barButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  centerText: {
    textAlign: 'center',
  },
});
