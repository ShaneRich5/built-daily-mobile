import { useLocalSearchParams } from 'expo-router';

import { GroupScreen } from '@/components/groups/group-screen';

/** A group or a buddy. `?invite=1` opens the invite straight away, as after creating one. */
export default function GroupRoute() {
  const { groupId, invite } = useLocalSearchParams<{ groupId: string; invite?: string }>();
  return <GroupScreen groupId={groupId} openInvite={invite === '1'} />;
}
