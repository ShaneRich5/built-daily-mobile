import { useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
import { addDays, dateKey } from '@/lib/date-keys';
import { describeReadError } from '@/lib/read-error';
import {
  subscribeToCheers,
  subscribeToGroup,
  subscribeToMembers,
  subscribeToMemberships,
} from '@/services/firestore/group-repository';
import { subscribeToGroupPlans } from '@/services/firestore/group-plan-repository';
import { subscribeToPlans } from '@/services/firestore/workout-repository';
import { syncGroups } from '@/services/group-sync';
import type { Cheer, Group, GroupMember, GroupMembership, SharedPlan } from '@/types/group';
import type { WorkoutPlan } from '@/types/workout';

/** One group as the Groups tab holds it. `group` is undefined until read, null if gone. */
export type GroupSnapshot = { group: Group | null | undefined; members: GroupMember[]; plans: SharedPlan[] };

/** Plans together look a week ahead: today and the six days after. */
export const PLAN_WINDOW_DAYS = 7;

/** The lifter's templates, for the plan sheet's workout chips. */
function useTemplates(uid: string | undefined): WorkoutPlan[] {
  const [loaded, setLoaded] = useState<{ uid: string; plans: WorkoutPlan[] } | null>(null);
  useEffect(() => {
    if (!uid) return;
    return subscribeToPlans(uid, { onData: (plans) => setLoaded({ uid, plans }), onError: quiet });
  }, [uid]);
  return loaded && loaded.uid === uid ? loaded.plans : [];
}

const quiet = () => {};

/**
 * The Groups tab: every group the lifter is in, each with its members, and
 * today's cheers in the first one (the one the tab features).
 *
 * Opening it also refreshes the lifter's own row in each group, which rolls
 * the "next seven days" of plans forward as days pass.
 */
export function useGroupsHome() {
  const { user } = useSession();
  const uid = user?.uid;
  const [todayKey] = useState(() => dateKey(new Date()));
  const [loaded, setLoaded] = useState<{ uid: string; memberships: GroupMembership[]; error: string | null } | null>(null);
  const [byGroup, setByGroup] = useState<Record<string, GroupSnapshot>>({});
  const [cheers, setCheers] = useState<{ groupId: string; cheers: Cheer[] } | null>(null);

  useEffect(() => {
    if (!user) return;
    syncGroups(user);
    return subscribeToMemberships(user.uid, {
      onData: (memberships) => setLoaded({ uid: user.uid, memberships, error: null }),
      onError: (error) =>
        setLoaded({ uid: user.uid, memberships: [], error: describeReadError(error, 'Could not load your groups.') }),
    });
  }, [user]);

  const memberships = loaded && loaded.uid === uid ? loaded.memberships : null;
  const ids = (memberships ?? []).map((membership) => membership.groupId).join(',');

  useEffect(() => {
    if (!ids) return;

    const patch = (id: string, next: Partial<GroupSnapshot>) =>
      setByGroup((current) => ({
        ...current,
        [id]: { ...(current[id] ?? { group: undefined, members: [], plans: [] }), ...next },
      }));

    const end = addDays(todayKey, PLAN_WINDOW_DAYS - 1);
    const unsubscribes = ids.split(',').flatMap((id) => [
      subscribeToGroup(id, { onData: (group) => patch(id, { group }), onError: () => patch(id, { group: null }) }),
      subscribeToMembers(id, { onData: (members) => patch(id, { members }), onError: quiet }),
      subscribeToGroupPlans(id, todayKey, end, { onData: (plans) => patch(id, { plans }), onError: quiet }),
    ]);
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [ids, todayKey]);

  const firstId = ids.split(',')[0] ?? '';
  useEffect(() => {
    if (!firstId) return;
    return subscribeToCheers(firstId, todayKey, {
      onData: (next) => setCheers({ groupId: firstId, cheers: next }),
      onError: quiet,
    });
  }, [firstId, todayKey]);

  const templates = useTemplates(uid);

  return {
    todayKey,
    myUid: uid ?? null,
    memberships,
    error: loaded && loaded.uid === uid ? loaded.error : null,
    byGroup,
    firstGroupCheers: cheers && cheers.groupId === firstId ? cheers.cheers : [],
    templates,
  };
}

/** One group, live: the group, its members, today's cheers and the lifter's own index entry. */
export function useGroup(groupId: string) {
  const { user } = useSession();
  const uid = user?.uid;
  const [todayKey] = useState(() => dateKey(new Date()));
  const [state, setState] = useState<{
    key: string;
    group: Group | null | undefined;
    members: GroupMember[];
    cheers: Cheer[];
    plans: SharedPlan[];
    memberships: GroupMembership[];
  } | null>(null);

  const key = `${uid}/${groupId}`;

  useEffect(() => {
    if (!uid) return;

    const patch = (next: Partial<NonNullable<typeof state>>) =>
      setState((current) => ({
        ...(current?.key === key
          ? current
          : { key, group: undefined, members: [], cheers: [], plans: [], memberships: [] }),
        ...next,
      }));

    const unsubscribes = [
      subscribeToGroup(groupId, { onData: (group) => patch({ group }), onError: () => patch({ group: null }) }),
      subscribeToMembers(groupId, { onData: (members) => patch({ members }), onError: quiet }),
      subscribeToCheers(groupId, todayKey, { onData: (cheers) => patch({ cheers }), onError: quiet }),
      subscribeToGroupPlans(groupId, todayKey, addDays(todayKey, PLAN_WINDOW_DAYS - 1), {
        onData: (plans) => patch({ plans }),
        onError: quiet,
      }),
      subscribeToMemberships(uid, { onData: (memberships) => patch({ memberships }), onError: quiet }),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [uid, groupId, todayKey, key]);

  const current = state?.key === key ? state : null;
  const templates = useTemplates(uid);
  const memberships = current?.memberships ?? [];

  return {
    todayKey,
    myUid: uid ?? null,
    group: current?.group,
    members: current?.members ?? [],
    cheers: current?.cheers ?? [],
    plans: current?.plans ?? [],
    /** Every group the lifter is in, for the plan sheet's "Share with". */
    memberships,
    buddyNickname: memberships.find((row) => row.groupId === groupId)?.buddyNickname ?? null,
    templates,
  };
}
