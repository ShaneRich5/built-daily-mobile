import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { failureMessage, InvitePanel } from '@/components/groups/group-panels';
import { Avatar, DayTile, PrivacyNote } from '@/components/groups/group-ui';
import { PlanRowItem, PlanTogetherPanel } from '@/components/groups/plan-ui';
import { WeekGrid, WeekLegend } from '@/components/groups/week-grid';
import { type MenuAction, MenuPanel } from '@/components/session/panels/list-panels';
import { ThemedText } from '@/components/themed-text';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { ArrowLeftIcon, EllipsisIcon, HeartIcon, LogOutIcon, Trash2Icon, UserPlusIcon } from '@/components/ui/icons';
import { Pill } from '@/components/ui/pill';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetFrame, SheetHost } from '@/components/ui/sheet';
import { MaxContentWidth, Radius } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { useGroup } from '@/hooks/use-groups';
import { useTheme } from '@/hooks/use-theme';
import {
  buddiesSinceLabel,
  buildBuddySummary,
  buildGroupPlanRow,
  buildGroupWeek,
  crewCountsByDay,
  buildWeekDays,
  groupDisplayName,
  joinNames,
  nextPlannedLabel,
  nextSevenDays,
  type PlanRow,
  planTemplateOptions,
  pluralMembers,
  trainedTodayDetail,
  trainedTodayOthers,
  weekRangeLabel,
} from '@/lib/groups-model';
import { confirm } from '@/services/confirm';
import { createSharedPlan, joinSharedPlan } from '@/services/firestore/group-plan-repository';
import {
  cheer,
  convertBuddyToGroup,
  deleteGroup,
  leaveGroup,
  refreshInvitePreview,
  resetInviteCode,
} from '@/services/firestore/group-repository';

type Panel = 'menu' | 'invite' | 'convert' | 'plan' | null;

/**
 * G2 (a group) and G8 (a buddy): the shared week, who trained today with a
 * cheer, and the group's options. Plans together arrive with the next part of
 * Groups.
 */
export function GroupScreen({ groupId, openInvite = false }: { groupId: string; openInvite?: boolean }) {
  const theme = useTheme();
  const { user } = useSession();
  const data = useGroup(groupId);
  const { group, members, todayKey, myUid } = data;
  const [panel, setPanel] = useState<Panel>(null);
  const [cheering, setCheering] = useState(false);
  const [joiningPlanId, setJoiningPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Straight from "Create & get invite link": the invite opens once the group has loaded.
  const invitedOnce = useRef(false);
  useEffect(() => {
    if (openInvite && group && !invitedOnce.current) {
      invitedOnce.current = true;
      setPanel('invite');
    }
  }, [openInvite, group]);

  // The link's signed-out preview is refreshed whenever the invite opens.
  useEffect(() => {
    if (panel === 'invite' && user && group) void refreshInvitePreview(user, group, members, data.plans);
    // Members are read when it opens on purpose: a refresh per roster change would be noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, user, group?.id, group?.inviteCode]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/groups'));

  if (group === undefined) {
    return (
      <SafeAreaView style={[styles.root, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (group === null) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <IconButton icon={ArrowLeftIcon} accessibilityLabel="Back" variant="plain" onPress={leave} style={styles.back} />
          <ThemedText type="heading">This group isn’t available</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            It may have been deleted, or you’re no longer in it.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = group.createdBy === myUid;
  const isBuddy = group.kind === 'buddy';
  const title = groupDisplayName(group, members, myUid, data.buddyNickname);
  const days = buildWeekDays(todayKey);
  const week = buildGroupWeek(members, todayKey, myUid);
  const others = trainedTodayOthers(week);
  const cheeredByMe = new Set(data.cheers.filter((c) => c.fromUid === myUid).map((c) => c.toUid));
  const toCheer = others.filter((row) => !cheeredByMe.has(row.uid));
  const cheered = others.length > 0 && toCheer.length === 0;
  const buddyName = week.find((row) => !row.isMe)?.name ?? data.buddyNickname?.trim() ?? 'your buddy';
  const alone = week.length < 2;

  const sendCheer = async () => {
    if (!user) return;
    setCheering(true);
    try {
      await cheer(user.uid, group.id, toCheer.map((row) => row.uid), todayKey);
    } catch {
      setError('Could not send that. Check your connection and try again.');
    } finally {
      setCheering(false);
    }
  };

  const leaveIt = async () => {
    setPanel(null);
    if (!user) return;
    if (isOwner && group.memberCount > 1) {
      setError('You started this, so it can’t be left while others are in it. Delete it for everyone instead.');
      return;
    }
    const ok = await confirm({
      title: `Leave ${title}?`,
      message: isOwner ? 'You’re the only one in it, so it will be deleted.' : 'They’ll stop seeing your week. You can rejoin with the code.',
      confirmLabel: 'Leave',
      destructive: true,
    });
    if (!ok) return;
    try {
      await leaveGroup(user.uid, group);
      leave();
    } catch (failure) {
      setError(failureMessage(failure, 'Could not leave. Check your connection and try again.'));
    }
  };

  const deleteIt = async () => {
    setPanel(null);
    if (!user) return;
    const ok = await confirm({
      title: `Delete ${title} for everyone?`,
      message: 'Everyone in it loses it. This can’t be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteGroup(user.uid, group);
      leave();
    } catch (failure) {
      setError(failureMessage(failure, 'Could not delete it. Check your connection and try again.'));
    }
  };

  const menu: MenuAction[] = [
    { label: 'Leave', icon: LogOutIcon, onPress: () => void leaveIt() },
    ...(isOwner
      ? [{ label: 'Delete for everyone', icon: Trash2Icon, destructive: true, onPress: () => void deleteIt() }]
      : []),
  ];

  const cheerCard =
    others.length > 0 ? (
      <Card style={styles.trained}>
        <View style={styles.flex}>
          <ThemedText type="labelStrong">{joinNames(others.map((row) => row.name))} trained today</ThemedText>
          <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
            {trainedTodayDetail(members, others, todayKey)}
          </ThemedText>
        </View>
        <CheerButton cheered={cheered} busy={cheering} onPress={() => void sendCheer()} />
      </Card>
    ) : null;

  const buddy = isBuddy ? buildBuddySummary(members, week, todayKey) : null;
  const planRows = data.plans.map((plan) => buildGroupPlanRow(plan, members, myUid));
  const nextTogether = planRows[0] ?? null;

  const openPlan = (row: PlanRow) =>
    router.push({ pathname: '/groups/[groupId]/plans/[planId]', params: { groupId: group.id, planId: row.id } });

  const imIn = async (row: PlanRow) => {
    if (!user) return;
    setJoiningPlanId(row.id);
    setError(null);
    try {
      await joinSharedPlan(user, group.id, row.id);
    } catch (failure) {
      setError(failureMessage(failure, 'Couldn’t add you to that plan. Check your connection and try again.'));
    } finally {
      setJoiningPlanId(null);
    }
  };

  const plansSection = buddy ? (
    <View style={styles.section}>
      <SectionLabel>Next together</SectionLabel>
      {nextTogether ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${nextTogether.title}. ${nextTogether.meta}`}
          onPress={() => openPlan(nextTogether)}
          style={({ pressed }) => [styles.next, { backgroundColor: theme.surface, borderColor: theme.tint }, pressed && styles.pressed]}>
          <DayTile weekday={nextTogether.weekday} day={nextTogether.dayOfMonth} tone="green" />
          <View style={styles.flex}>
            <ThemedText type="labelStrong" numberOfLines={1}>
              {nextTogether.title}
            </ThemedText>
            <ThemedText type="caption" numberOfLines={1}>
              {nextTogether.meta}
            </ThemedText>
          </View>
        </Pressable>
      ) : (
        <Card>
          <ThemedText type="small" themeColor="textMuted">
            Nothing planned together yet.
          </ThemedText>
        </Card>
      )}
      <Button label="Plan a session" variant="dark" onPress={() => setPanel('plan')} />
    </View>
  ) : (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <SectionLabel>Plans together</SectionLabel>
        <ThemedText type="caption">Join any, no pressure</ThemedText>
      </View>
      {planRows.length > 0 ? (
        <Card padded={false}>
          {planRows.map((row, i) => (
            <PlanRowItem
              key={row.id}
              row={row}
              divider={i > 0}
              busy={joiningPlanId === row.id}
              onOpen={() => openPlan(row)}
              onImIn={() => void imIn(row)}
            />
          ))}
        </Card>
      ) : (
        <Card>
          <ThemedText type="small" themeColor="textMuted">
            No plans this week yet. Pick a day and the group can join you.
          </ThemedText>
        </Card>
      )}
      <Button label="Plan a workout with the group" variant="dark" onPress={() => setPanel('plan')} />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <IconButton icon={ArrowLeftIcon} accessibilityLabel="Back to groups" variant="plain" onPress={leave} style={styles.back} />
          <IconButton icon={EllipsisIcon} accessibilityLabel={`${title} options`} variant="plain" onPress={() => setPanel('menu')} />
        </View>

        {buddy ? (
          <View style={styles.buddyHeader}>
            <View style={styles.pair}>
              <Avatar name="You" size="lg" style={[styles.pairAvatar, { borderColor: theme.background }]} />
              <Avatar name={buddyName} size="lg" style={[styles.pairAvatar, styles.pairSecond, { borderColor: theme.background }]} />
            </View>
            <View style={styles.flex}>
              <ThemedText type="title" accessibilityRole="header" numberOfLines={1}>
                {title}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {alone ? 'Waiting for them to join' : `Gym buddies since ${buddiesSinceLabel(group, members)}`}
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={styles.groupHeader}>
            <View style={styles.flex}>
              <ThemedText type="title" accessibilityRole="header" numberOfLines={1}>
                {title}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {pluralMembers(week.length)} · {weekRangeLabel(todayKey)}
              </ThemedText>
            </View>
            <Button label="Invite" icon={UserPlusIcon} variant="secondary" size="sm" onPress={() => setPanel('invite')} />
          </View>
        )}

        {error ? (
          <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
            {error}
          </ThemedText>
        ) : null}

        {buddy && alone ? (
          <Card style={styles.gap}>
            <ThemedText type="small" themeColor="textBody">
              Send {buddyName} the code. Once they join you’ll see each other’s week here.
            </ThemedText>
            <Button label="Send invite" icon={UserPlusIcon} variant="dark" onPress={() => setPanel('invite')} />
          </Card>
        ) : null}

        <Card style={styles.gap}>
          <View style={styles.weekTitle}>
            <ThemedText type="labelStrong" accessibilityRole="header">
              This week
            </ThemedText>
            {buddy?.bothOnTrack ? <Pill label="Both on track" tone="success" uppercase={false} /> : null}
          </View>
          <WeekGrid days={days} rows={week} togetherDays={buddy?.togetherDays} showCounts={!buddy} />
          {buddy ? (
            <View style={[styles.buddyCounts, { borderTopColor: theme.borderSubtle }]}>
              {week.map((row) => {
                const next = nextPlannedLabel(row, todayKey);
                return (
                  <View key={row.uid} style={styles.buddyCount}>
                    <ThemedText type="mono" style={styles.buddyCountNumber}>
                      {row.done} / {row.goal}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textMuted">
                      {row.isMe ? 'You' : row.name}
                      {next ? ` · ${next}` : ''}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          ) : (
            <WeekLegend />
          )}
        </Card>

        {buddy?.weeksBothHitGoal ? (
          <Card>
            <ThemedText type="stat">{buddy.weeksBothHitGoal} wk</ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              Both hit your goals
            </ThemedText>
          </Card>
        ) : null}

        {cheerCard}

        {plansSection}

        {buddy ? (
          <ThemedText type="caption" style={styles.centerText}>
            A buddy is a group of two. Want more people?{' '}
            {isOwner ? '' : 'Ask whoever started it to turn it into a group.'}
          </ThemedText>
        ) : null}
        {buddy && isOwner ? (
          <Button label="Turn this into a group" variant="ghost" size="sm" onPress={() => setPanel('convert')} style={styles.centerSelf} />
        ) : null}

        <PrivacyNote />
      </ScrollView>

      <SheetHost visible={panel !== null} onClose={() => setPanel(null)} size={panel === 'plan' ? 'tall' : 'content'}>
        {panel === 'plan' ? (
          <PlanTogetherPanel
            todayKey={todayKey}
            templates={planTemplateOptions(data.templates)}
            groups={data.memberships.map((membership) => ({
              id: membership.groupId,
              name:
                membership.groupId === group.id
                  ? title
                  : membership.buddyNickname
                    ? `You & ${membership.buddyNickname}`
                    : membership.nameSnapshot,
            }))}
            defaultGroupId={group.id}
            crewCounts={crewCountsByDay(members, nextSevenDays(todayKey), myUid)}
            onSubmit={async (input) => {
              if (!user) return 'You are not signed in.';
              try {
                const created = await createSharedPlan(user, input);
                setPanel(null);
                router.push({
                  pathname: '/groups/[groupId]/plans/[planId]',
                  params: { groupId: created.groupId, planId: created.planId },
                });
                return null;
              } catch (failure) {
                return failureMessage(failure, 'Couldn’t save the plan. Check your connection and try again.');
              }
            }}
          />
        ) : panel === 'menu' ? (
          <MenuPanel title={title} actions={menu} />
        ) : panel === 'invite' ? (
          <InvitePanel
            groupName={title}
            memberCount={group.memberCount}
            maxMembers={group.maxMembers}
            code={group.inviteCode}
            isOwner={isOwner}
            onReset={async () => {
              if (!user) return false;
              const ok = await confirm({
                title: 'Reset the code?',
                message: 'The old code and link stop working.',
                confirmLabel: 'Reset',
              });
              if (!ok) return true;
              try {
                await resetInviteCode(user.uid, group);
                return true;
              } catch {
                return false;
              }
            }}
          />
        ) : panel === 'convert' ? (
          <ConvertPanel
            onConvert={async (name) => {
              if (!user) return 'You are not signed in.';
              try {
                await convertBuddyToGroup(user.uid, group.id, name);
                setPanel(null);
                return null;
              } catch (failure) {
                return failureMessage(failure, 'Could not change it. Check your connection and try again.');
              }
            }}
          />
        ) : null}
      </SheetHost>
    </SafeAreaView>
  );
}

function CheerButton({ cheered, busy, onPress }: { cheered: boolean; busy: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy || cheered }}
      disabled={busy || cheered}
      onPress={onPress}
      style={({ pressed }) => [styles.cheer, { backgroundColor: theme.tintSubtle }, (pressed || busy) && styles.pressed]}>
      <HeartIcon size={16} color={theme.tintText} fill={cheered ? theme.tintText : 'transparent'} strokeWidth={2} />
      <ThemedText type="smallBold" style={{ color: theme.tintText }}>
        {cheered ? 'Cheered' : 'Cheer'}
      </ThemedText>
    </Pressable>
  );
}

/** "Turn this into a group": a name, and the cap goes up to 12. */
function ConvertPanel({ onConvert }: { onConvert: (name: string) => Promise<string | null> }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convert = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(await onConvert(name));
    setBusy(false);
  };

  return (
    <SheetFrame
      title="Turn this into a group"
      subtitle="Up to 12 people. Your week together carries over."
      footer={<Button label="Make it a group" size="lg" onPress={() => void convert()} disabled={!name.trim()} busy={busy} />}>
      <FormField label="Group name" value={name} onChangeText={setName} placeholder="Morning Crew" error={error} autoFocus />
    </SheetFrame>
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
    gap: 16,
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
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  back: {
    marginLeft: -10,
  },
  groupHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  buddyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  pair: {
    flexDirection: 'row',
  },
  pairAvatar: {
    borderWidth: 2,
  },
  pairSecond: {
    marginLeft: -12,
  },
  gap: {
    gap: 12,
  },
  weekTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buddyCounts: {
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 8,
  },
  buddyCount: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
  },
  buddyCountNumber: {
    fontSize: 13,
  },
  trained: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  cheer: {
    alignItems: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  centerText: {
    textAlign: 'center',
  },
  section: {
    gap: 8,
  },
  labelRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  next: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  centerSelf: {
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
