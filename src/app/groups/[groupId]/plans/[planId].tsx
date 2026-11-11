import { useLocalSearchParams } from 'expo-router';

import { PlanScreen } from '@/components/groups/plan-screen';

/** One plan together in a group. */
export default function PlanRoute() {
  const { groupId, planId } = useLocalSearchParams<{ groupId: string; planId: string }>();
  return <PlanScreen groupId={groupId} planId={planId} />;
}
