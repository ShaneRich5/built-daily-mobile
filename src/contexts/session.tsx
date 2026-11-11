import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { getFirebaseAuth } from '@/services/firebase';
import { ensureUserProfile } from '@/services/firestore/user-profile-repository';

type SessionValue = {
  user: User | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside a <SessionProvider />');
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fires once with the persisted user (or null) on startup, then on every change.
    return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);

      // Creates `users/{uid}` the first time, and keeps its name and timezone
      // current after that. Not awaited: it is best-effort and must never hold
      // up getting into the app.
      if (nextUser) void ensureUserProfile(nextUser);
    });
  }, []);

  return <SessionContext value={{ user, isLoading }}>{children}</SessionContext>;
}
