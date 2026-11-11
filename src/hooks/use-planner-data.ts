import { useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
import { dateKey, endOfWeek, startOfWeek } from '@/lib/date-keys';
import { describeReadError } from '@/lib/read-error';
import { buildWeekBoard, toBoardCard } from '@/lib/week-board';
import {
  subscribeToProgressSettings,
  subscribeToRecentActivities,
  subscribeToScheduledWorkouts,
} from '@/services/firestore/home-repository';
import { subscribeToUnscheduledWorkouts } from '@/services/firestore/planner-repository';
import {
  subscribeToPlans,
  subscribeToRecentSessions,
} from '@/services/firestore/workout-repository';
import type { Activity } from '@/types/activity';
import type { DatedScheduledWorkout, ScheduledWorkout } from '@/types/planner';
import { DEFAULT_PROGRESS_SETTINGS, type ProgressSettings } from '@/types/progress';
import type { WorkoutPlan, WorkoutSession } from '@/types/workout';

/** Enough activities to cover the weeks a lifter is likely to page back through. */
const ACTIVITY_HISTORY_DOCS = 120;

type Shared = {
  plans: WorkoutPlan[];
  sessions: WorkoutSession[] | null;
  activities: Activity[];
  unscheduled: ScheduledWorkout[];
  settings: ProgressSettings;
  error: string | null;
};

const EMPTY_SHARED: Shared = {
  plans: [],
  sessions: null,
  activities: [],
  unscheduled: [],
  settings: DEFAULT_PROGRESS_SETTINGS,
  error: null,
};

/** Tagged so neither a previous user's data nor a previous week's entries is ever shown. */
type Loaded<T> = { key: string; value: T };

/**
 * Everything the planner shows for one week: that week's planned entries, the
 * Unscheduled tray, templates, and what was logged — shaped into the week
 * board. `weekStartKey` is any day in the week to show.
 *
 * The week's entries are their own subscription, re-opened as the lifter pages
 * through weeks; everything else is opened once.
 */
export function usePlannerData(weekStartKey: string) {
  const { user } = useSession();
  const uid = user?.uid;
  const [todayKey] = useState(() => dateKey(new Date()));
  const [shared, setShared] = useState<Loaded<Shared> | null>(null);
  const [week, setWeek] = useState<Loaded<DatedScheduledWorkout[]> | null>(null);

  const start = startOfWeek(weekStartKey);
  const weekKey = uid ? `${uid}/${start}` : '';

  useEffect(() => {
    if (!uid) return;

    const patch = (next: Partial<Shared>) =>
      setShared((current) => ({
        key: uid,
        value: { ...(current?.key === uid ? current.value : EMPTY_SHARED), ...next },
      }));
    const quiet = () => {};

    const unsubscribes = [
      subscribeToRecentSessions(uid, {
        onData: (sessions) => patch({ sessions, error: null }),
        onError: (error) =>
          patch({ sessions: [], error: describeReadError(error, 'Could not load your planner.') }),
      }),
      subscribeToPlans(uid, { onData: (plans) => patch({ plans }), onError: quiet }),
      subscribeToRecentActivities(uid, ACTIVITY_HISTORY_DOCS, {
        onData: (activities) => patch({ activities }),
        onError: quiet,
      }),
      subscribeToUnscheduledWorkouts(uid, {
        onData: (unscheduled) => patch({ unscheduled }),
        onError: quiet,
      }),
      subscribeToProgressSettings(uid, {
        onData: (settings) => patch({ settings }),
        onError: quiet,
      }),
    ];

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    return subscribeToScheduledWorkouts(uid, start, endOfWeek(start), {
      onData: (entries) => setWeek({ key: weekKey, value: entries }),
      onError: () => setWeek({ key: weekKey, value: [] }),
    });
  }, [uid, start, weekKey]);

  const loaded = shared && shared.key === uid ? shared.value : EMPTY_SHARED;
  const entries = week && week.key === weekKey ? week.value : [];
  const sessions = loaded.sessions ?? [];

  return {
    todayKey,
    weekStartKey: start,
    isLoading: Boolean(uid) && (loaded.sessions === null || week?.key !== weekKey),
    error: loaded.error,
    plans: loaded.plans,
    settings: loaded.settings,
    entries,
    board: buildWeekBoard({
      weekStartKey: start,
      todayKey,
      scheduled: entries,
      sessions,
      activities: loaded.activities,
      weeklyGoal: loaded.settings.weeklyGoal,
    }),
    tray: loaded.unscheduled.map((entry) => toBoardCard(entry, todayKey)),
  };
}

export type PlannerData = ReturnType<typeof usePlannerData>;
