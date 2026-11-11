import { useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
import { addDays, dateKey } from '@/lib/date-keys';
import {
  buildHomeConsistency,
  buildHomeRecent,
  buildHomeTemplates,
  buildHomeWeek,
  buildWeekGoal,
  pickInProgress,
  pickMissed,
  pickNextPlanned,
} from '@/lib/home-model';
import { describeReadError } from '@/lib/read-error';
import {
  subscribeToProgressSettings,
  subscribeToRecentActivities,
  subscribeToScheduledWorkouts,
} from '@/services/firestore/home-repository';
import {
  subscribeToPlans,
  subscribeToRecentSessions,
} from '@/services/firestore/workout-repository';
import type { Activity } from '@/types/activity';
import type { DatedScheduledWorkout } from '@/types/planner';
import { DEFAULT_PROGRESS_SETTINGS } from '@/types/progress';
import type { WorkoutPlan, WorkoutSession } from '@/types/workout';

/** How far ahead Home looks for the next planned workout. */
const PLAN_LOOKAHEAD_DAYS = 14;
/** How far back it looks for a planned workout that slid past. */
const MISSED_LOOKBACK_DAYS = 7;
/** Enough activities to fill the 16-week chart for someone who walks most days. */
const ACTIVITY_HISTORY_DOCS = 120;

type Raw = {
  plans: WorkoutPlan[];
  sessions: WorkoutSession[] | null;
  activities: Activity[];
  entries: DatedScheduledWorkout[];
  weeklyGoal: number;
  error: string | null;
};

const EMPTY: Raw = {
  plans: [],
  // Null until the first snapshot: sessions are what Home cannot draw without.
  sessions: null,
  activities: [],
  entries: [],
  weeklyGoal: DEFAULT_PROGRESS_SETTINGS.weeklyGoal,
  error: null,
};

/** Tagged with the uid it belongs to, so a previous user's data is never shown. */
type Loaded = { uid: string; raw: Raw };

/**
 * Everything Home shows, live from Firestore: templates, workouts, activities,
 * the planner around today and the weekly goal, shaped by the pure builders in
 * `@/lib/home-model`.
 *
 * Five subscriptions feed one piece of state. Only the sessions gate
 * `isLoading` — the rest fill in as they arrive, and a failure in one of them
 * leaves its part of the screen empty rather than taking Home down. The
 * exception is the sessions themselves: without them there is no Home to show,
 * so that failure is reported.
 */
export function useHomeData() {
  const { user } = useSession();
  const uid = user?.uid;
  // Fixed for the life of the screen: a Home left open across midnight keeps
  // describing the day it was opened on until it is next mounted.
  const [todayKey] = useState(() => dateKey(new Date()));
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!uid) return;

    const patch = (next: Partial<Raw>) =>
      setLoaded((current) => ({
        uid,
        raw: { ...(current?.uid === uid ? current.raw : EMPTY), ...next },
      }));

    const quiet = () => {};

    const unsubscribes = [
      subscribeToRecentSessions(uid, {
        onData: (sessions) => patch({ sessions, error: null }),
        onError: (error) =>
          patch({ sessions: [], error: describeReadError(error, 'Could not load your workouts.') }),
      }),
      subscribeToPlans(uid, { onData: (plans) => patch({ plans }), onError: quiet }),
      subscribeToRecentActivities(uid, ACTIVITY_HISTORY_DOCS, {
        onData: (activities) => patch({ activities }),
        onError: quiet,
      }),
      // From before this week's Sunday, so last week's misses can still be caught up.
      subscribeToScheduledWorkouts(
        uid,
        addDays(todayKey, -MISSED_LOOKBACK_DAYS),
        addDays(todayKey, PLAN_LOOKAHEAD_DAYS),
        { onData: (entries) => patch({ entries }), onError: quiet },
      ),
      subscribeToProgressSettings(uid, {
        onData: (settings) => patch({ weeklyGoal: settings.weeklyGoal }),
        onError: quiet,
      }),
    ];

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [uid, todayKey]);

  // Derived rather than cleared in the effect, as in `useRecentSessions`.
  const raw = loaded && loaded.uid === uid ? loaded.raw : EMPTY;
  const sessions = raw.sessions ?? [];
  const { plans, activities, entries, weeklyGoal } = raw;

  const templates = buildHomeTemplates(plans, sessions, todayKey);

  return {
    todayKey,
    isLoading: Boolean(uid) && raw.sessions === null,
    error: raw.error,
    plans,
    templates,
    inProgress: pickInProgress(sessions),
    planned: pickNextPlanned(entries, todayKey),
    week: buildHomeWeek(todayKey, sessions, activities, entries),
    recent: buildHomeRecent(sessions, activities),
    weekGoal: buildWeekGoal(sessions, weeklyGoal, todayKey),
    consistency: buildHomeConsistency(todayKey, sessions, activities, entries, weeklyGoal),
    missed: pickMissed(entries, sessions, todayKey),
  };
}

export type HomeData = ReturnType<typeof useHomeData>;
