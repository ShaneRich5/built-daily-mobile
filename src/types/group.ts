import type { WeeklyGoalTarget } from '@/types/progress';

// Mirrors the web app's `lib/group-types.ts`. docs/DATA_MODEL.md is the
// contract between the two clients — change it there first.

export const GROUP_LIMITS = {
  name: 100,
  displayName: 80,
  inviteCode: 8,
  maxMembers: 12,
  /** A gym buddy is just a group capped at two. */
  buddyMembers: 2,
  maxGroupsPerUser: 20,
  /** Days of upcoming plans copied onto a member doc. */
  upcomingPlanDays: 7,
  upcomingPlansMax: 14,
  /** Trained days kept on a member doc: this week and last. */
  trainedDaysMax: 14,
  workoutLabel: 80,
} as const;

export type GroupMemberRole = 'owner' | 'member';

/** `buddy` is a group of two with friendlier copy; nothing else differs. */
export type GroupKind = 'group' | 'buddy';

/** `groups/{groupId}` */
export type Group = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  inviteCode: string;
  memberCount: number;
  kind: GroupKind;
  /** 2 for a buddy, 12 for a group. */
  maxMembers: number;
};

/** One upcoming planner day copied onto a member doc: the day and the label, nothing more. */
export type MemberUpcomingPlan = { dateKey: string; label: string };

/**
 * `groups/{groupId}/members/{uid}`. What groupmates see of each other: days
 * trained and planned, the workout name, the weekly goal. Never sets,
 * weights, notes or body weight.
 */
export type GroupMember = {
  uid: string;
  displayName: string;
  role: GroupMemberRole;
  joinedAt: Date;
  lastWorkoutDateKey: string | null;
  lastWorkoutAt: Date | null;
  /** Consecutive weeks the member met their own weekly goal. */
  currentStreak: number;
  weeklyGoal: WeeklyGoalTarget;
  workoutsThisWeek: number;
  trainedDays: string[];
  lastWorkoutLabel: string | null;
  upcomingPlans: MemberUpcomingPlan[];
};

/** `users/{uid}/groupMemberships/{groupId}`: the private index of one's groups. */
export type GroupMembership = {
  groupId: string;
  nameSnapshot: string;
  role: GroupMemberRole;
  joinedAt: Date;
  /** Buddy only: what the creator calls the other person before they join. */
  buddyNickname: string | null;
};

/** `inviteCodes/{code}` */
export type InviteCode = {
  groupId: string;
  createdBy: string;
  createdAt: Date;
  active: boolean;
};

export type InvitePreviewPlan = {
  dateKey: string;
  time: string | null;
  where: string | null;
  label: string;
  goingFirstNames: string[];
};

/** `invitePreviews/{code}`: all a signed-out visitor with the link may see. */
export type InvitePreview = {
  groupId: string;
  groupName: string;
  kind: GroupKind;
  invitedByName: string;
  memberFirstNames: string[];
  memberCount: number;
  workoutsThisWeek: number;
  plans: Record<string, InvitePreviewPlan>;
  updatedAt: Date;
};

/** `groups/{groupId}/cheers/{dateKey}_{toUid}_{fromUid}`: one nudge per sender, recipient and day. */
export type Cheer = {
  groupId: string;
  toUid: string;
  fromUid: string;
  dateKey: string;
  createdAt: Date;
};

export const SHARED_PLAN_LIMITS = {
  label: 80,
  where: 80,
  note: 140,
  exercises: 20,
  going: 12,
} as const;

/** An exercise in a plan together: what to do, never how much. */
export type SharedPlanExercise = {
  id: string;
  name: string;
  /** The template's target set count, or null. */
  sets: number | null;
};

/** `groups/{groupId}/plans/{planId}`: a plan together anyone in the group can join. */
export type SharedPlan = {
  id: string;
  groupId: string;
  dateKey: string;
  /** Local `HH:mm`, or null for "anytime". */
  time: string | null;
  where: string | null;
  label: string;
  /** Names and set counts only; empty for "something else". */
  exercises: SharedPlanExercise[];
  note: string | null;
  createdBy: string;
  createdByName: string;
  /** Who said "I'm in"; the creator starts in it. */
  going: string[];
  goingAt: Record<string, Date>;
  createdAt: Date;
};
