import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { getFirebaseAuth } from '@/services/firebase';

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
    });
  }, []);

  return <SessionContext value={{ user, isLoading }}>{children}</SessionContext>;
}
