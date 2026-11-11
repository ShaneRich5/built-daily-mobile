import { useEffect, useState } from 'react';

import { buildTogetherToday, type TogetherToday } from '@/lib/groups-model';
import { subscribeToSharedPlan } from '@/services/firestore/group-plan-repository';
import { subscribeToMembers } from '@/services/firestore/group-repository';
import type { GroupMember, SharedPlan } from '@/types/group';

type Linked = { groupId: string; sharedPlanId: string } | null;

type Loaded = { key: string; plan: SharedPlan | null; members: GroupMember[] };

/**
 * Home's "Training with someone today": the plan together that today's
 * planner entry points at, with who's going. Null until it has loaded, when
 * there is none, or when the plan is gone or can't be read (left the group,
 * cancelled) — the card simply doesn't show.
 */
export function useTogetherToday(linked: Linked, myUid: string | null): TogetherToday | null {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const groupId = linked?.groupId ?? '';
  const planId = linked?.sharedPlanId ?? '';
  const key = `${groupId}/${planId}`;

  useEffect(() => {
    if (!myUid || !groupId || !planId) return;

    const update = (patch: Partial<Omit<Loaded, 'key'>>) =>
      setLoaded((current) => ({
        key,
        plan: null,
        members: [],
        ...(current?.key === key ? current : {}),
        ...patch,
      }));

    const unsubscribes = [
      subscribeToSharedPlan(groupId, planId, {
        onData: (plan) => update({ plan }),
        onError: () => update({ plan: null }),
      }),
      subscribeToMembers(groupId, {
        onData: (members) => update({ members }),
        onError: () => update({ members: [] }),
      }),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [myUid, groupId, planId, key]);

  // Derived rather than cleared in the effect, so a different plan never shows the last one's details.
  if (!linked || !loaded || loaded.key !== key || !loaded.plan) return null;
  return buildTogetherToday(loaded.plan, loaded.members, myUid);
}
