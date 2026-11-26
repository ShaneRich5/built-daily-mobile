import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
import { createCalendarFeedUrl, getCalendarFeedUrl } from '@/services/calendar-feed';

/** Tagged with whose link it is, so another user's link never shows. */
type Loaded = { uid: string; url: string | null };

/** The signed-in user's calendar feed link: load it, make it, or swap it for a new one. */
export function useCalendarFeed() {
  const { user } = useSession();
  const uid = user?.uid;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getCalendarFeedUrl().then(
      (url) => {
        if (!cancelled) setLoaded({ uid, url });
      },
      () => {
        if (cancelled) return;
        setError('Couldn’t load your calendar link. Check your connection and try again.');
        setLoaded({ uid, url: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uid]);

  /** Used for both the first link and "Get a new link". */
  const create = useCallback(async () => {
    if (!uid || busy) return;
    setBusy(true);
    setError(null);
    try {
      setLoaded({ uid, url: await createCalendarFeedUrl() });
    } catch {
      setError('Couldn’t make a calendar link. Try again.');
    } finally {
      setBusy(false);
    }
  }, [uid, busy]);

  const current = loaded && loaded.uid === uid ? loaded : null;
  return { isLoaded: current !== null, url: current?.url ?? null, busy, error, create };
}
