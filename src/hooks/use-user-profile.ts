import { useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
import { subscribeToUserProfile } from '@/services/firestore/user-profile-repository';
import type { UserProfile } from '@/types/user-profile';

/** Tagged with the uid it belongs to, so a previous user's profile is never read. */
type Loaded = { uid: string; profile: UserProfile | null };

/**
 * The signed-in lifter's profile, live. `profile` is null both while loading
 * and when there is no usable document yet — `isLoading` tells them apart.
 * A failed read reads as "no profile", which is the safe answer for the one
 * thing that asks: whether to show onboarding.
 */
export function useUserProfile(): { profile: UserProfile | null; isLoading: boolean } {
  const { user } = useSession();
  const uid = user?.uid;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!uid) return;

    return subscribeToUserProfile(uid, {
      onData: (profile) => setLoaded({ uid, profile }),
      onError: () => setLoaded({ uid, profile: null }),
    });
  }, [uid]);

  if (!uid) return { profile: null, isLoading: false };
  if (!loaded || loaded.uid !== uid) return { profile: null, isLoading: true };

  return { profile: loaded.profile, isLoading: false };
}
