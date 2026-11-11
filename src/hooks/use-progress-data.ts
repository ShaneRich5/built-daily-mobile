import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
import { dateKey, endOfWeek, startOfWeek } from '@/lib/date-keys';
import { buildHomeConsistency, buildHomeWeek, buildWeekGoal } from '@/lib/home-model';
import {
  activeDaysThisWeek,
  bestLifts,
  computeMilestones,
  firstRecordDateKey,
  strongestLifts,
} from '@/lib/progress-insights';
import { describeReadError } from '@/lib/read-error';
import { goalWeekStreak, workoutsByDay } from '@/lib/workout-days';
import {
  subscribeToProgressSettings,
  subscribeToRecentActivities,
  subscribeToScheduledWorkouts,
} from '@/services/firestore/home-repository';
import { saveProgressSettings } from '@/services/firestore/planner-repository';
import { logBodyWeight, subscribeToBodyWeight } from '@/services/firestore/progress-repository';
import { subscribeToRecentSessions } from '@/services/firestore/workout-repository';
import { syncGroups } from '@/services/group-sync';
import type { Activity } from '@/types/activity';
import type { DatedScheduledWorkout } from '@/types/planner';
import {
  type BodyWeightEntry,
  DEFAULT_PROGRESS_SETTINGS,
  type ProgressSettings,
} from '@/types/progress';
import type { WorkoutSession } from '@/types/workout';

/** As on Home: enough to fill the 16-week chart for someone who walks most days. */
const ACTIVITY_HISTORY_DOCS = 120;
/** About four months of daily weigh-ins; the sparkline draws the last 30. */
const BODY_WEIGHT_DOCS = 120;

type Raw = {
  sessions: WorkoutSession[] | null;
  activities: Activity[];
  entries: DatedScheduledWorkout[];
  weights: BodyWeightEntry[];
  settings: ProgressSettings;
  error: string | null;
};

const EMPTY: Raw = {
  sessions: null,
  activities: [],
  entries: [],
  weights: [],
  settings: DEFAULT_PROGRESS_SETTINGS,
  error: null,
};

type Loaded = { uid: string; raw: Raw };

/**
 * Everything the Progress tab shows, live: this week against the goals, the
 * best lifts, body weight and milestones. Built the way `useHomeData` is — one
 * piece of state fed by several subscriptions, gated only on the workouts —
 * and reusing Home's builders, so the This week card reads the same on both.
 *
 * Its two writes, goals and weigh-ins, resolve to whether they saved, and the
 * subscriptions bring the result back onto the screen.
 */
export function useProgressData() {
  const { user } = useSession();
  const uid = user?.uid;
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
      subscribeToRecentActivities(uid, ACTIVITY_HISTORY_DOCS, {
        onData: (activities) => patch({ activities }),
        onError: quiet,
      }),
      subscribeToScheduledWorkouts(uid, startOfWeek(todayKey), endOfWeek(todayKey), {
        onData: (entries) => patch({ entries }),
        onError: quiet,
      }),
      subscribeToBodyWeight(uid, BODY_WEIGHT_DOCS, {
        onData: (weights) => patch({ weights }),
        onError: quiet,
      }),
      subscribeToProgressSettings(uid, {
        onData: (settings) => patch({ settings }),
        onError: quiet,
      }),
    ];

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [uid, todayKey]);

  const saveGoals = useCallback(
    async (settings: ProgressSettings): Promise<boolean> => {
      if (!uid) return false;
      try {
        await saveProgressSettings(uid, settings);
        // Groups show progress against the weekly goal.
        if (user) syncGroups(user);
        return true;
      } catch {
        return false;
      }
    },
    [uid, user],
  );

  const logWeight = useCallback(
    async (weightLbs: number): Promise<boolean> => {
      if (!uid) return false;
      try {
        await logBodyWeight(uid, todayKey, weightLbs);
        return true;
      } catch {
        return false;
      }
    },
    [uid, todayKey],
  );

  const raw = loaded && loaded.uid === uid ? loaded.raw : EMPTY;
  const sessions = raw.sessions ?? [];
  const { activities, entries, weights, settings } = raw;
  const streak = goalWeekStreak(workoutsByDay(sessions), settings.weeklyGoal, todayKey);

  return {
    todayKey,
    isLoading: Boolean(uid) && raw.sessions === null,
    error: raw.error,
    settings,
    weights,
    weekGoal: buildWeekGoal(sessions, settings.weeklyGoal, todayKey),
    week: buildHomeWeek(todayKey, sessions, activities, entries),
    consistency: buildHomeConsistency(todayKey, sessions, activities, entries, settings.weeklyGoal),
    activeDays: activeDaysThisWeek(sessions, activities, todayKey),
    lifts: strongestLifts(bestLifts(sessions)),
    milestones: computeMilestones({
      sessions,
      streak: streak.current,
      longestStreak: streak.longest,
      firstRecord: firstRecordDateKey(sessions),
      todayKey,
    }),
    saveGoals,
    logWeight,
  };
}

export type ProgressData = ReturnType<typeof useProgressData>;
