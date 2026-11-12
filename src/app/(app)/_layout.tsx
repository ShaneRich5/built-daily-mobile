import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useUserProfile } from '@/hooks/use-user-profile';
import { needsOnboarding } from '@/lib/onboarding';

/**
 * The tabs, behind the onboarding gate: an account that has never been through
 * onboarding — on either app — is sent there first. While the profile is still
 * loading the tabs show as normal, so nobody waits on it.
 */
export default function AppLayout() {
  const { profile } = useUserProfile();

  if (needsOnboarding(profile)) return <Redirect href="/onboarding" />;

  return <AppTabs />;
}
