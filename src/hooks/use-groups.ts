import { useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
import { dateKey } from '@/lib/date-keys';
import { describeReadError } from '@/lib/read-error';
import {
  subscribeToCheers,
  subscribeToGroup,
  subscribeToMembers,
  subscribeToMemberships,
} from '@/services/firestore/group-repository';
import { syncGroups } from '@/services/group-sync';
import type { Cheer, Group, GroupMember, GroupMembership } from '@/types/group';

/** One group as the Groups tab holds it. `group` is undefined until read, null if gone. */
export type GroupSnapshot = { group: Group | null | undefined; members: GroupMember[] };

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
        [id]: { ...(current[id] ?? { group: undefined, members: [] }), ...next },
      }));

    const unsubscribes = ids.split(',').flatMap((id) => [
      subscribeToGroup(id, { onData: (group) => patch(id, { group }), onError: () => patch(id, { group: null }) }),
      subscribeToMembers(id, { onData: (members) => patch(id, { members }), onError: quiet }),
    ]);
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [ids]);

  const firstId = ids.split(',')[0] ?? '';
  useEffect(() => {
    if (!firstId) return;
    return subscribeToCheers(firstId, todayKey, {
      onData: (next) => setCheers({ groupId: firstId, cheers: next }),
      onError: quiet,
    });
  }, [firstId, todayKey]);

  return {
    todayKey,
    myUid: uid ?? null,
    memberships,
    error: loaded && loaded.uid === uid ? loaded.error : null,
    byGroup,
    firstGroupCheers: cheers && cheers.groupId === firstId ? cheers.cheers : [],
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
    membership: GroupMembership | null;
  } | null>(null);

  const key = `${uid}/${groupId}`;

  useEffect(() => {
    if (!uid) return;

    const patch = (next: Partial<NonNullable<typeof state>>) =>
      setState((current) => ({
        ...(current?.key === key ? current : { key, group: undefined, members: [], cheers: [], membership: null }),
        ...next,
      }));

    const unsubscribes = [
      subscribeToGroup(groupId, { onData: (group) => patch({ group }), onError: () => patch({ group: null }) }),
      subscribeToMembers(groupId, { onData: (members) => patch({ members }), onError: quiet }),
      subscribeToCheers(groupId, todayKey, { onData: (cheers) => patch({ cheers }), onError: quiet }),
      subscribeToMemberships(uid, {
        onData: (rows) => patch({ membership: rows.find((row) => row.groupId === groupId) ?? null }),
        onError: quiet,
      }),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [uid, groupId, todayKey, key]);

  const current = state?.key === key ? state : null;

  return {
    todayKey,
    myUid: uid ?? null,
    group: current?.group,
    members: current?.members ?? [],
    cheers: current?.cheers ?? [],
    buddyNickname: current?.membership?.buddyNickname ?? null,
  };
}
