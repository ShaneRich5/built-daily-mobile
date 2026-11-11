import { addDays, dateKey, monthDayLabel, startOfWeek, weekdayShort } from '@/lib/date-keys';
import { effectiveStreak } from '@/lib/workout-signals';
import { GROUP_LIMITS, type Group, type GroupMember, type InvitePreview } from '@/types/group';

/**
 * Groups, pure: who trained, who plans to, and how a group reads. Ported from
 * the web's `features/groups/groups-model.ts`, so a roster says the same
 * thing on both apps.
 *
 * Calm by design: a past day with no workout is just empty. There is no
 * "missed" anywhere in here.
 */

export type WeekDay = {
  dateKey: string;
  /** "S", "M", … */
  letter: string;
  /** "Thu" */
  short: string;
  dayOfMonth: number;
  isToday: boolean;
};

export type DayMark = 'trained' | 'planned' | 'none';

export type MemberWeek = {
  uid: string;
  name: string;
  isMe: boolean;
  /** Sunday to Saturday. */
  marks: DayMark[];
  done: number;
  goal: number;
  onTrack: boolean;
  trainedToday: boolean;
};

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** "Maya Chen" → "Maya". What groups show everywhere. */
export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || 'Member';
}

/** Sunday to Saturday of the week holding `todayKey`. */
export function buildWeekDays(todayKey: string): WeekDay[] {
  const start = startOfWeek(todayKey);
  return LETTERS.map((letter, i) => {
    const key = addDays(start, i);
    return {
      dateKey: key,
      letter,
      short: weekdayShort(key),
      dayOfMonth: Number(key.slice(8, 10)),
      isToday: key === todayKey,
    };
  });
}

/** "Nov 8 – 14", or "Oct 31 – Nov 6" across months. */
export function weekRangeLabel(todayKey: string): string {
  const start = startOfWeek(todayKey);
  const end = addDays(start, 6);
  return start.slice(5, 7) === end.slice(5, 7)
    ? `${monthDayLabel(start)} – ${Number(end.slice(8, 10))}`
    : `${monthDayLabel(start)} – ${monthDayLabel(end)}`;
}

/** Days the member trained. Rows written before `trainedDays` know only their last workout. */
function trainedDaySet(member: GroupMember): Set<string> {
  const days = new Set(member.trainedDays);
  if (member.lastWorkoutDateKey) days.add(member.lastWorkoutDateKey);
  return days;
}

export function memberPlansOn(member: GroupMember, key: string): boolean {
  return member.upcomingPlans.some((plan) => plan.dateKey === key);
}

/** Workouts this week. Rows without `trainedDays` fall back to the stored count. */
export function doneThisWeek(member: GroupMember, todayKey: string): number {
  const weekStart = startOfWeek(todayKey);
  const inWeek = [...trainedDaySet(member)].filter((key) => key >= weekStart && key <= todayKey).length;
  const lastInWeek = member.lastWorkoutDateKey !== null && member.lastWorkoutDateKey >= weekStart;
  return lastInWeek ? Math.max(inWeek, member.workoutsThisWeek) : inWeek;
}

/** On track: the goal is already hit, or the days still planned this week would get there. */
export function buildMemberWeek(member: GroupMember, todayKey: string, myUid: string | null): MemberWeek {
  const days = buildWeekDays(todayKey);
  const trained = trainedDaySet(member);
  const marks: DayMark[] = days.map(({ dateKey }) => {
    if (trained.has(dateKey)) return 'trained';
    if (dateKey >= todayKey && memberPlansOn(member, dateKey)) return 'planned';
    return 'none';
  });
  const done = doneThisWeek(member, todayKey);
  const plannedLeft = marks.filter((mark) => mark === 'planned').length;

  return {
    uid: member.uid,
    name: firstName(member.displayName),
    isMe: member.uid === myUid,
    marks,
    done,
    goal: member.weeklyGoal,
    onTrack: done >= member.weeklyGoal || done + plannedLeft >= member.weeklyGoal,
    trainedToday: trained.has(todayKey),
  };
}

/** Me first, then everyone else in join order. */
export function buildGroupWeek(
  members: readonly GroupMember[],
  todayKey: string,
  myUid: string | null,
): MemberWeek[] {
  const rows = members.map((member) => buildMemberWeek(member, todayKey, myUid));
  return [...rows.filter((row) => row.isMe), ...rows.filter((row) => !row.isMe)];
}

/** "Maya", "Maya and Priya", "Maya, Priya and Jordan", "Maya, Jordan and 2 others". */
export function joinNames(names: readonly string[], maxShown = 3): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length <= maxShown) return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  const shown = names.slice(0, maxShown - 1);
  const rest = names.length - shown.length;
  return `${shown.join(', ')} and ${rest} other${rest === 1 ? '' : 's'}`;
}

export function pluralMembers(n: number): string {
  return `${n} member${n === 1 ? '' : 's'}`;
}

/** "6 members · 4 on track this week" */
export function groupSummary(week: readonly MemberWeek[]): string {
  const onTrack = week.filter((row) => row.onTrack).length;
  return `${pluralMembers(week.length)} · ${onTrack} on track this week`;
}

/** "4 members · 2 on track · Dev trained today" */
export function groupCompactSummary(week: readonly MemberWeek[]): string {
  const onTrack = week.filter((row) => row.onTrack).length;
  const today = week.filter((row) => row.trainedToday && !row.isMe).map((row) => row.name);
  const parts = [pluralMembers(week.length), `${onTrack} on track`];
  if (today.length > 0) parts.push(`${joinNames(today, 2)} trained today`);
  return parts.join(' · ');
}

/** Everyone else who trained today, for the cheer card. */
export function trainedTodayOthers(week: readonly MemberWeek[]): MemberWeek[] {
  return week.filter((row) => row.trainedToday && !row.isMe);
}

/** "Maya: Push day · Priya: Run" — workout names only. */
export function trainedTodayDetail(
  members: readonly GroupMember[],
  others: readonly MemberWeek[],
  todayKey: string,
): string {
  const byUid = new Map(members.map((member) => [member.uid, member]));
  return others
    .map((row) => {
      const member = byUid.get(row.uid);
      const label = member?.lastWorkoutDateKey === todayKey ? member.lastWorkoutLabel : null;
      return label ? `${row.name}: ${label}` : row.name;
    })
    .join(' · ');
}

/** "Morning Crew" — or, for a buddy, "You & Alex" (their own name once they join). */
export function groupDisplayName(
  group: Pick<Group, 'name' | 'kind'>,
  members: readonly GroupMember[],
  myUid: string | null,
  buddyNickname: string | null,
): string {
  if (group.kind !== 'buddy') return group.name;
  const other = members.find((member) => member.uid !== myUid);
  const name = other ? firstName(other.displayName) : buddyNickname?.trim();
  return name ? `You & ${name}` : 'You & your buddy';
}

/** "Oct 3": when the second person joined, or when it was made if they have not. */
export function buddiesSinceLabel(group: Group, members: readonly GroupMember[]): string {
  const latest = members.reduce(
    (max, member) => (member.joinedAt > max ? member.joinedAt : max),
    group.createdAt,
  );
  return monthDayLabel(dateKey(latest));
}

export type BuddySummary = {
  bothOnTrack: boolean;
  /** Weeks in a row you both hit your own goals: the shorter streak. Null at zero. */
  weeksBothHitGoal: number | null;
  /** Days this week you both trained or planned. */
  togetherDays: Set<string>;
};

export function buildBuddySummary(
  members: readonly GroupMember[],
  week: readonly MemberWeek[],
  todayKey: string,
): BuddySummary {
  const days = buildWeekDays(todayKey);
  const togetherDays = new Set<string>();
  if (week.length === 2) {
    days.forEach((day, i) => {
      if (week[0].marks[i] !== 'none' && week[1].marks[i] !== 'none') togetherDays.add(day.dateKey);
    });
  }

  const weeks = members.length === 2 ? Math.min(...members.map((m) => effectiveStreak(m, todayKey))) : 0;

  return {
    bothOnTrack: week.length === 2 && week.every((row) => row.onTrack),
    weeksBothHitGoal: weeks > 0 ? weeks : null,
    togetherDays,
  };
}

/** "Sat planned": the next day still planned this week. */
export function nextPlannedLabel(row: MemberWeek, todayKey: string): string | null {
  const days = buildWeekDays(todayKey);
  const i = row.marks.findIndex((mark, index) => mark === 'planned' && days[index].dateKey >= todayKey);
  return i >= 0 ? `${days[i].short} planned` : null;
}

/** "K7Q2 MDXA": easier to read aloud. */
export function spacedCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

/** The web's join page for a code; it opens the group, or asks them to sign up first. */
export function inviteUrl(webOrigin: string, code: string): string {
  return `${webOrigin}/join/${code}`;
}

const MAX_PREVIEW_PLANS = 10;

/**
 * What a signed-out visitor with the link may see: first names and counts,
 * and plans already shared by link that are still ahead. Mobile has no plans
 * together yet, so it only carries forward the ones the web put there.
 */
export function buildInvitePreview(input: {
  group: Group;
  members: readonly GroupMember[];
  inviterName: string;
  previous: InvitePreview | null;
  todayKey: string;
  now: Date;
}): InvitePreview {
  const weekStart = startOfWeek(input.todayKey);
  const workoutsThisWeek = input.members.reduce(
    (sum, member) =>
      sum + member.trainedDays.filter((key) => key >= weekStart && key <= input.todayKey).length,
    0,
  );

  const kept = Object.entries(
    input.previous?.groupId === input.group.id ? input.previous.plans : {},
  )
    .filter(([, plan]) => plan.dateKey >= input.todayKey)
    .sort(([, a], [, b]) => a.dateKey.localeCompare(b.dateKey))
    .slice(0, MAX_PREVIEW_PLANS);

  return {
    groupId: input.group.id,
    groupName: input.group.name,
    kind: input.group.kind,
    invitedByName: firstName(input.inviterName),
    memberFirstNames: input.members
      .map((member) => firstName(member.displayName))
      .slice(0, GROUP_LIMITS.maxMembers),
    memberCount: input.group.memberCount,
    workoutsThisWeek,
    plans: Object.fromEntries(kept),
    updatedAt: input.now,
  };
}
