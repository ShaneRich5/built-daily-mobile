import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { findActivityType } from '@/lib/activity-catalog';
import { addDays, dateKey } from '@/lib/date-keys';
import { displayNameFromAuth, type AuthIdentity } from '@/lib/user-profile';
import { type ActivityDay, memberSignals, upcomingPlansFromEntries } from '@/lib/workout-signals';
import { getDb } from '@/services/firebase';
import { toActivity, toScheduledWorkout } from '@/services/firestore/home-mappers';
import { getProgressSettings } from '@/services/firestore/home-repository';
import { toWorkoutSession } from '@/services/firestore/mappers';
import { GROUP_LIMITS } from '@/types/group';

/**
 * Keeps the lifter's row in each of their groups in step with their own
 * history: days trained, the latest workout's name, the goal streak, the
 * weekly goal and the next seven days of plans. There is no server doing
 * this, so each app does it after a write that changes any of them — the web
 * after its own, mobile after its own.
 *
 * Ported from the web's `bumpGroupWorkoutSignals` and
 * `syncUpcomingPlansToGroups`, done together here: one read of the history,
 * one write per group.
 *
 * Best-effort throughout. A failed sync never fails the write that asked for
 * it; the next one puts things right, since everything is recomputed.
 */

/** The signed-in lifter, as groups need them: an id and a name to show. */
export type GroupUser = AuthIdentity & { uid: string };

/** As on the web: enough history for any realistic streak. */
const LOOKBACK = 400;
/** Writes in quick succession — a planner drag, a finish then a goal — share one sync. */
const DEBOUNCE_MS = 1500;

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: GroupUser | null = null;

/** Syncs a moment from now, once for a burst of writes. Fire and forget. */
export function syncGroups(user: GroupUser): void {
  pending = user;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const next = pending;
    pending = null;
    if (next) void syncGroupsNow(next);
  }, DEBOUNCE_MS);
}

/** Syncs now. Resolves when every group has been tried; never rejects. */
export async function syncGroupsNow(user: GroupUser): Promise<void> {
  try {
    const db = getDb();
    const memberships = await getDocs(collection(db, 'users', user.uid, 'groupMemberships'));
    if (memberships.empty) return;

    const todayKey = dateKey(new Date());
    const [sessions, activities, planned, settings] = await Promise.all([
      getDocs(
        query(
          collection(db, 'users', user.uid, 'sessions'),
          where('status', '==', 'completed'),
          orderBy('endedAt', 'desc'),
          limit(LOOKBACK),
        ),
      ),
      getDocs(
        query(collection(db, 'users', user.uid, 'activities'), orderBy('activityDate', 'desc'), limit(LOOKBACK)),
      ),
      getDocs(
        query(
          collection(db, 'users', user.uid, 'scheduledWorkouts'),
          where('dateKey', '>=', todayKey),
          where('dateKey', '<=', addDays(todayKey, GROUP_LIMITS.upcomingPlanDays - 1)),
        ),
      ),
      getProgressSettings(user.uid),
    ]);

    const activityDays: ActivityDay[] = activities.docs.flatMap((document) => {
      const activity = toActivity(document.id, document.data());
      return activity
        ? [
            {
              activityDate: activity.activityDate,
              at: activity.createdAt,
              label: findActivityType(activity.activityTypeId)?.name ?? 'Activity',
            },
          ]
        : [];
    });

    const signals = memberSignals(
      sessions.docs.map((document) => toWorkoutSession(document.id, document.data())),
      activityDays,
      settings.weeklyGoal,
      todayKey,
    );
    const upcomingPlans = upcomingPlansFromEntries(
      planned.docs.flatMap((document) => {
        const entry = toScheduledWorkout(document.id, document.data());
        return entry ? [entry] : [];
      }),
      todayKey,
    );

    // Days, names and counts only — never sets, weights or notes.
    const patch = { ...signals, displayName: displayNameFromAuth(user), upcomingPlans };

    await Promise.all(
      memberships.docs.map(async (membership) => {
        try {
          await updateDoc(doc(db, 'groups', membership.id, 'members', user.uid), patch);
        } catch {
          // This group only: it may have been deleted under us.
        }
      }),
    );
  } catch {
    // Best-effort.
  }
}
