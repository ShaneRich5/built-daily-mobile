import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, PrivacyNote, StackedAvatars } from '@/components/groups/group-ui';
import { failureMessage, JoinPanel, NewGroupPanel, type NewGroupInput } from '@/components/groups/group-panels';
import { PlanRowItem } from '@/components/groups/plan-ui';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronRightIcon, HeartIcon, PlusIcon, ShareIcon } from '@/components/ui/icons';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetHost } from '@/components/ui/sheet';
import { BottomTabInset, Radius } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { useGroupsHome } from '@/hooks/use-groups';
import { useTheme } from '@/hooks/use-theme';
import {
  buildComingUpRow,
  buildGroupWeek,
  groupCompactSummary,
  groupDisplayName,
  groupSummary,
  joinNames,
  spacedCode,
  type PlanRow,
  trainedTodayOthers,
} from '@/lib/groups-model';
import { joinSharedPlan } from '@/services/firestore/group-plan-repository';
import { cheer, createGroup, joinGroupByCode } from '@/services/firestore/group-repository';
import { GROUP_LIMITS } from '@/types/group';

type Panel = 'new' | 'join' | null;

/**
 * G1: the groups the lifter is in. The first is featured — who's in it, how
 * each is doing this week, a cheer for whoever trained today — and the rest
 * are a row each. Plans together arrive with the next part of Groups.
 */
export function GroupsScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const data = useGroupsHome();
  const { todayKey, myUid } = data;
  const [panel, setPanel] = useState<Panel>(null);
  const [cheering, setCheering] = useState(false);
  const [joiningPlanId, setJoiningPlanId] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const memberships = data.memberships ?? [];
  const groups = memberships.map((membership) => {
    const snapshot = data.byGroup[membership.groupId];
    const members = snapshot?.members ?? [];
    const name = snapshot?.group
      ? groupDisplayName(snapshot.group, members, myUid, membership.buddyNickname)
      : membership.buddyNickname
        ? `You & ${membership.buddyNickname}`
        : membership.nameSnapshot;
    return {
      id: membership.groupId,
      group: snapshot?.group,
      name,
      members,
      plans: snapshot?.plans ?? [],
      week: buildGroupWeek(members, todayKey, myUid),
    };
  });

  const comingUp = groups
    .filter((group) => group.group)
    .flatMap((group) => group.plans.map((plan) => buildComingUpRow(plan, group.name, group.members, myUid)))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.meta.localeCompare(b.meta));

  const openPlan = (row: PlanRow) =>
    router.push({ pathname: '/groups/[groupId]/plans/[planId]', params: { groupId: row.groupId, planId: row.id } });

  const imIn = async (row: PlanRow) => {
    if (!user) return;
    setJoiningPlanId(row.id);
    setPlanError(null);
    try {
      await joinSharedPlan(user, row.groupId, row.id);
    } catch (error) {
      setPlanError(failureMessage(error, 'Couldn’t add you to that plan. Check your connection and try again.'));
    } finally {
      setJoiningPlanId(null);
    }
  };

  const loading =
    data.memberships === null || groups.some((group) => group.group === undefined && group.week.length === 0);
  const [featured, ...others] = groups.filter((group) => group.group !== null);

  const cheeredByMe = new Set(data.firstGroupCheers.filter((c) => c.fromUid === myUid).map((c) => c.toUid));
  const trainedToday = featured ? trainedTodayOthers(featured.week) : [];
  const toCheer = trainedToday.filter((row) => !cheeredByMe.has(row.uid));
  const cheeredAll = trainedToday.length > 0 && toCheer.length === 0;

  const cheerAll = async () => {
    if (!user || !featured) return;
    setCheering(true);
    try {
      await cheer(user.uid, featured.id, toCheer.map((row) => row.uid), todayKey);
    } catch {
      // The button stays as it was; tapping again tries again.
    } finally {
      setCheering(false);
    }
  };

  const create = async (input: NewGroupInput): Promise<string | null> => {
    if (!user) return 'You are not signed in.';
    try {
      const groupId = await createGroup(user, input);
      setPanel(null);
      router.push({ pathname: '/groups/[groupId]', params: { groupId, invite: '1' } });
      return null;
    } catch (error) {
      return failureMessage(error, 'Could not create it. Check your connection and try again.');
    }
  };

  const join = async (code: string): Promise<string | null> => {
    if (!user) return 'You are not signed in.';
    try {
      const groupId = await joinGroupByCode(user, code);
      setPanel(null);
      router.push({ pathname: '/groups/[groupId]', params: { groupId } });
      return null;
    } catch (error) {
      return failureMessage(error, 'Could not join. Check your connection and try again.');
    }
  };

  const open = (groupId: string, invite = false) =>
    router.push({ pathname: '/groups/[groupId]', params: invite ? { groupId, invite: '1' } : { groupId } });

  return (
    <>
      <Screen contentStyle={{ paddingBottom: BottomTabInset + 24 }}>
        <View style={styles.header}>
          <ThemedText type="title" accessibilityRole="header" style={styles.flex}>
            Groups
          </ThemedText>
          <Button label="Join" variant="secondary" size="sm" onPress={() => setPanel('join')} />
          <Button
            label="New"
            icon={PlusIcon}
            variant="dark"
            size="sm"
            accessibilityLabel="New buddy or group"
            onPress={() => setPanel('new')}
          />
        </View>

        {data.error ? (
          <ThemedText type="small" themeColor="danger">
            {data.error}
          </ThemedText>
        ) : loading ? (
          <ActivityIndicator style={styles.loading} />
        ) : !featured ? (
          <Card style={styles.empty}>
            <ThemedText type="heading">Train with someone</ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              A gym buddy or a small group sees the days you train and plan. No feed, no leaderboard.
            </ThemedText>
            <Button label="Start a buddy or group" size="lg" onPress={() => setPanel('new')} />
            <Button label="I have a code" variant="secondary" size="lg" onPress={() => setPanel('join')} />
          </Card>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <SectionLabel>Coming up together</SectionLabel>
                <ThemedText type="caption">Next 7 days</ThemedText>
              </View>
              {comingUp.length > 0 ? (
                <Card padded={false}>
                  {comingUp.map((row, i) => (
                    <PlanRowItem
                      key={`${row.groupId}-${row.id}`}
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
                    Nothing planned together yet. Open a group and plan a workout; anyone can say I’m in.
                  </ThemedText>
                </Card>
              )}
              {planError ? (
                <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
                  {planError}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.section}>
              <SectionLabel>Your groups</SectionLabel>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${featured.name}. ${groupSummary(featured.week)}`}
                onPress={() => open(featured.id)}
                style={({ pressed }) => [
                  styles.featured,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.featuredTitle}>
                  <ThemedText type="heading" style={styles.flex} numberOfLines={1}>
                    {featured.name}
                  </ThemedText>
                  <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
                </View>
                <ThemedText type="small" themeColor="textMuted">
                  {groupSummary(featured.week)}
                </ThemedText>
                <View style={styles.people}>
                  {featured.week.map((row) => (
                    <View key={row.uid} style={styles.person}>
                      {/* A fixed slot, so a ringed avatar does not push its name down. */}
                      <View style={styles.avatarSlot}>
                        <Avatar name={row.name} ring={row.trainedToday} />
                      </View>
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        style={[styles.personName, row.isMe && { color: theme.text }]}>
                        {row.isMe ? 'You' : row.name}
                      </ThemedText>
                      <ThemedText type="monoSmall" themeColor="textMuted">
                        {row.done}/{row.goal}
                      </ThemedText>
                    </View>
                  ))}
                </View>
                <View style={styles.ringLegend}>
                  <View style={[styles.ringSwatch, { borderColor: theme.tint }]} />
                  <ThemedText type="caption">Trained today</ThemedText>
                </View>
              </Pressable>

              {trainedToday.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: cheering || cheeredAll }}
                  disabled={cheering || cheeredAll}
                  onPress={() => void cheerAll()}
                  style={({ pressed }) => [
                    styles.cheer,
                    { backgroundColor: theme.tintSubtle },
                    (pressed || cheering) && styles.pressed,
                  ]}>
                  <HeartIcon
                    size={16}
                    color={theme.tintText}
                    fill={cheeredAll ? theme.tintText : 'transparent'}
                    strokeWidth={2}
                  />
                  <ThemedText type="smallBold" style={{ color: theme.tintText }}>
                    {cheeredAll ? 'Cheered' : `Cheer ${joinNames(toCheer.map((row) => row.name), 3)}`}
                  </ThemedText>
                </Pressable>
              ) : null}

              {others.length > 0 ? (
                <Card padded={false}>
                  {others.map((group, i) => (
                    <Pressable
                      key={group.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${group.name}. ${groupCompactSummary(group.week)}`}
                      onPress={() => open(group.id)}
                      style={({ pressed }) => [
                        styles.otherRow,
                        i > 0 && { borderTopColor: theme.borderSubtle, borderTopWidth: 1 },
                        pressed && styles.pressed,
                      ]}>
                      <StackedAvatars names={group.week.map((row) => row.name)} />
                      <View style={styles.flex}>
                        <ThemedText type="label" numberOfLines={1}>
                          {group.name}
                        </ThemedText>
                        <ThemedText type="caption" numberOfLines={1}>
                          {groupCompactSummary(group.week)}
                        </ThemedText>
                      </View>
                      <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
                    </Pressable>
                  ))}
                </Card>
              ) : null}
            </View>

            {featured.group ? (
              <View style={[styles.bring, { borderColor: theme.borderStrong }]}>
                <View style={styles.flex}>
                  <ThemedText type="labelStrong">Bring someone along</ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    {featured.name} code{' '}
                    <ThemedText type="monoSmall" style={{ color: theme.text }}>
                      {spacedCode(featured.group.inviteCode)}
                    </ThemedText>
                  </ThemedText>
                </View>
                <Button
                  label="Share"
                  icon={ShareIcon}
                  variant="secondary"
                  size="sm"
                  accessibilityLabel={`Invite someone to ${featured.name}`}
                  onPress={() => open(featured.id, true)}
                />
              </View>
            ) : null}

            <PrivacyNote />
          </>
        )}
      </Screen>

      <SheetHost visible={panel !== null} onClose={() => setPanel(null)} size={panel === 'new' ? 'tall' : 'content'}>
        {panel === 'new' ? (
          <NewGroupPanel atLimit={memberships.length >= GROUP_LIMITS.maxGroupsPerUser} onCreate={create} />
        ) : panel === 'join' ? (
          <JoinPanel onJoin={join} />
        ) : null}
      </SheetHost>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  loading: {
    marginTop: 32,
  },
  empty: {
    gap: 12,
    padding: 20,
  },
  section: {
    gap: 8,
  },
  labelRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featured: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 2,
    padding: 16,
  },
  featuredTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  people: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  person: {
    alignItems: 'center',
    gap: 4,
    width: 52,
  },
  avatarSlot: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
  },
  personName: {
    textAlign: 'center',
    width: '100%',
  },
  ringLegend: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  ringSwatch: {
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  cheer: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  otherRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bring: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
