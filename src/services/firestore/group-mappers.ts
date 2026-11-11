import { toDate } from '@/services/firestore/mappers';
import {
  type Cheer,
  GROUP_LIMITS,
  type Group,
  type GroupKind,
  type GroupMember,
  type GroupMemberRole,
  type GroupMembership,
  type InviteCode,
  type InvitePreview,
  type InvitePreviewPlan,
  type MemberUpcomingPlan,
} from '@/types/group';
import { DEFAULT_PROGRESS_SETTINGS, WEEKLY_GOAL_OPTIONS, type WeeklyGoalTarget } from '@/types/progress';

// Group documents ↔ app types. No firebase import, as in `mappers.ts`. These
// follow the web app's `lib/group-mapper.ts` field for field, and each write
// carries exactly what `firestore.rules` requires of it.

type DocData = Record<string, unknown>;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function dateKeyOrNull(value: unknown): string | null {
  return typeof value === 'string' && DATE_KEY.test(value) ? value : null;
}

function shortText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function role(value: unknown): GroupMemberRole | null {
  return value === 'owner' || value === 'member' ? value : null;
}

function weeklyGoal(value: unknown): WeeklyGoalTarget {
  return WEEKLY_GOAL_OPTIONS.includes(value as WeeklyGoalTarget)
    ? (value as WeeklyGoalTarget)
    : DEFAULT_PROGRESS_SETTINGS.weeklyGoal;
}

function nameList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((name) => shortText(name, GROUP_LIMITS.displayName))
    .filter((name): name is string => name !== null)
    .slice(0, max);
}

/** Eight characters from an alphabet without look-alikes (no 0/O, 1/I). */
export function generateInviteCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < GROUP_LIMITS.inviteCode; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** What was typed, as a code: capitals and digits only. "k7q2 mdxa" → "K7Q2MDXA". */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

export function cheerId(cheer: Pick<Cheer, 'dateKey' | 'toUid' | 'fromUid'>): string {
  return `${cheer.dateKey}_${cheer.toUid}_${cheer.fromUid}`;
}

export function groupKind(value: unknown): GroupKind {
  return value === 'buddy' ? 'buddy' : 'group';
}

// ── Groups ───────────────────────────────────────────────────────────────

export function toGroup(id: string, data: DocData | undefined): Group | null {
  if (!data) return null;

  const name = typeof data.name === 'string' ? data.name.trim().slice(0, GROUP_LIMITS.name) : '';
  const createdBy = typeof data.createdBy === 'string' ? data.createdBy : '';
  const createdAt = toDate(data.createdAt);
  const inviteCode = typeof data.inviteCode === 'string' ? normalizeInviteCode(data.inviteCode) : '';
  if (!name || !createdBy || !createdAt || !inviteCode) return null;

  return {
    id,
    name,
    createdBy,
    createdAt,
    inviteCode,
    memberCount: count(data.memberCount),
    kind: groupKind(data.kind),
    // Groups made before buddies existed have no cap stored: they hold 12.
    maxMembers: data.maxMembers === GROUP_LIMITS.buddyMembers ? GROUP_LIMITS.buddyMembers : GROUP_LIMITS.maxMembers,
  };
}

/** A new group: one member, its creator. */
export function fromNewGroup(group: Omit<Group, 'id'>): DocData {
  return {
    name: group.name,
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    inviteCode: group.inviteCode,
    memberCount: group.memberCount,
    kind: group.kind,
    maxMembers: group.maxMembers,
  };
}

// ── Members ──────────────────────────────────────────────────────────────

function upcomingPlans(value: unknown): MemberUpcomingPlan[] {
  if (!Array.isArray(value)) return [];

  const plans: MemberUpcomingPlan[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const { dateKey, label } = row as DocData;
    const day = dateKeyOrNull(dateKey);
    const name = shortText(label, GROUP_LIMITS.workoutLabel);
    if (day && name) plans.push({ dateKey: day, label: name });
  }
  return plans.slice(0, GROUP_LIMITS.upcomingPlansMax);
}

export function toGroupMember(data: DocData | undefined): GroupMember | null {
  if (!data) return null;

  const uid = typeof data.uid === 'string' ? data.uid : '';
  const memberRole = role(data.role);
  const joinedAt = toDate(data.joinedAt);
  if (!uid || !memberRole || !joinedAt) return null;

  const trainedDays = Array.isArray(data.trainedDays)
    ? [...new Set(data.trainedDays.map(dateKeyOrNull).filter((key): key is string => key !== null))]
        .sort()
        .slice(-GROUP_LIMITS.trainedDaysMax)
    : [];

  return {
    uid,
    displayName: shortText(data.displayName, GROUP_LIMITS.displayName) ?? 'Member',
    role: memberRole,
    joinedAt,
    lastWorkoutDateKey: dateKeyOrNull(data.lastWorkoutDateKey),
    lastWorkoutAt: data.lastWorkoutAt == null ? null : toDate(data.lastWorkoutAt),
    currentStreak: count(data.currentStreak),
    weeklyGoal: weeklyGoal(data.weeklyGoal),
    workoutsThisWeek: count(data.workoutsThisWeek),
    trainedDays,
    lastWorkoutLabel: shortText(data.lastWorkoutLabel, GROUP_LIMITS.workoutLabel),
    upcomingPlans: upcomingPlans(data.upcomingPlans),
  };
}

/** A member row: every field the create rule requires, and the Groups Together ones. */
export function fromGroupMember(member: GroupMember): DocData {
  return {
    uid: member.uid,
    displayName: member.displayName,
    role: member.role,
    joinedAt: member.joinedAt,
    lastWorkoutDateKey: member.lastWorkoutDateKey,
    lastWorkoutAt: member.lastWorkoutAt,
    currentStreak: member.currentStreak,
    weeklyGoal: member.weeklyGoal,
    workoutsThisWeek: member.workoutsThisWeek,
    trainedDays: member.trainedDays,
    lastWorkoutLabel: member.lastWorkoutLabel,
    upcomingPlans: member.upcomingPlans,
  };
}

// ── Memberships, invite codes, cheers ────────────────────────────────────

export function toGroupMembership(data: DocData | undefined): GroupMembership | null {
  if (!data) return null;

  const groupId = typeof data.groupId === 'string' ? data.groupId : '';
  const nameSnapshot = shortText(data.nameSnapshot, GROUP_LIMITS.name);
  const memberRole = role(data.role);
  const joinedAt = toDate(data.joinedAt);
  if (!groupId || !nameSnapshot || !memberRole || !joinedAt) return null;

  return {
    groupId,
    nameSnapshot,
    role: memberRole,
    joinedAt,
    buddyNickname: shortText(data.buddyNickname, GROUP_LIMITS.displayName),
  };
}

export function fromGroupMembership(membership: GroupMembership): DocData {
  return {
    groupId: membership.groupId,
    nameSnapshot: membership.nameSnapshot,
    role: membership.role,
    joinedAt: membership.joinedAt,
    buddyNickname: membership.buddyNickname,
  };
}

export function toInviteCode(data: DocData | undefined): InviteCode | null {
  if (!data) return null;

  const groupId = typeof data.groupId === 'string' ? data.groupId : '';
  const createdBy = typeof data.createdBy === 'string' ? data.createdBy : '';
  const createdAt = toDate(data.createdAt);
  if (!groupId || !createdBy || !createdAt || typeof data.active !== 'boolean') return null;

  return { groupId, createdBy, createdAt, active: data.active };
}

export function fromInviteCode(invite: InviteCode): DocData {
  return {
    groupId: invite.groupId,
    createdBy: invite.createdBy,
    createdAt: invite.createdAt,
    active: invite.active,
  };
}

export function toCheer(data: DocData | undefined): Cheer | null {
  if (!data) return null;

  const groupId = typeof data.groupId === 'string' ? data.groupId : '';
  const toUid = typeof data.toUid === 'string' ? data.toUid : '';
  const fromUid = typeof data.fromUid === 'string' ? data.fromUid : '';
  const dateKey = dateKeyOrNull(data.dateKey);
  const createdAt = toDate(data.createdAt);
  if (!groupId || !toUid || !fromUid || !dateKey || !createdAt) return null;

  return { groupId, toUid, fromUid, dateKey, createdAt };
}

export function fromCheer(cheer: Cheer): DocData {
  return {
    groupId: cheer.groupId,
    toUid: cheer.toUid,
    fromUid: cheer.fromUid,
    dateKey: cheer.dateKey,
    createdAt: cheer.createdAt,
  };
}

// ── Invite previews ──────────────────────────────────────────────────────

export function toInvitePreview(data: DocData | undefined): InvitePreview | null {
  if (!data) return null;

  const groupId = typeof data.groupId === 'string' ? data.groupId : '';
  const groupName = shortText(data.groupName, GROUP_LIMITS.name);
  if (!groupId || !groupName) return null;

  const plans: Record<string, InvitePreviewPlan> = {};
  if (data.plans && typeof data.plans === 'object') {
    for (const [id, raw] of Object.entries(data.plans as DocData)) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as DocData;
      const dateKey = dateKeyOrNull(row.dateKey);
      const label = shortText(row.label, 80);
      if (!dateKey || !label) continue;
      plans[id] = {
        dateKey,
        label,
        time: typeof row.time === 'string' && TIME.test(row.time) ? row.time : null,
        where: shortText(row.where, 80),
        goingFirstNames: nameList(row.goingFirstNames, 12),
      };
    }
  }

  return {
    groupId,
    groupName,
    kind: groupKind(data.kind),
    invitedByName: shortText(data.invitedByName, GROUP_LIMITS.displayName) ?? 'A friend',
    memberFirstNames: nameList(data.memberFirstNames, GROUP_LIMITS.maxMembers),
    memberCount: count(data.memberCount),
    workoutsThisWeek: count(data.workoutsThisWeek),
    plans,
    updatedAt: toDate(data.updatedAt) ?? new Date(0),
  };
}

/** Only the keys the rules allow on a preview. */
export function fromInvitePreview(preview: InvitePreview): DocData {
  return {
    groupId: preview.groupId,
    groupName: preview.groupName,
    kind: preview.kind,
    invitedByName: preview.invitedByName,
    memberFirstNames: preview.memberFirstNames,
    memberCount: preview.memberCount,
    workoutsThisWeek: preview.workoutsThisWeek,
    plans: preview.plans,
    updatedAt: preview.updatedAt,
  };
}
