import { useLocalSearchParams } from 'expo-router';

import { JoinScreen } from '@/components/groups/join-screen';

/** An invite link opened in the app. `?plan=ID` also says "I'm in" to that plan together. */
export default function JoinRoute() {
  const { code, plan } = useLocalSearchParams<{ code: string; plan?: string }>();
  return <JoinScreen code={code} planId={plan ?? null} />;
}
