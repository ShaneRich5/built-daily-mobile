import {
  buddiesSinceLabel,
  buildBuddySummary,
  buildGroupWeek,
  buildInvitePreview,
  buildMemberWeek,
  buildWeekDays,
  doneThisWeek,
  firstName,
  groupCompactSummary,
  groupDisplayName,
  groupSummary,
  inviteUrl,
  joinNames,
  nextPlannedLabel,
  spacedCode,
  trainedTodayDetail,
  trainedTodayOthers,
  weekRangeLabel,
} from '@/lib/groups-model';
import { effectiveStreak, memberSignals, upcomingPlansFromEntries } from '@/lib/workout-signals';
import { session } from '@/lib/session/session-test-helpers';
import type { Group, GroupMember } from '@/types/group';

// Wednesday. The week runs Sun Nov 8 – Sat Nov 14.
const TODAY = '2026-11-11';

const member = (uid: string, name: string, overrides: Partial<GroupMember> = {}): GroupMember => ({
  uid,
  displayName: name,
  role: 'member',
  joinedAt: new Date(2026, 9, 1),
  lastWorkoutDateKey: null,
  lastWorkoutAt: null,
  currentStreak: 0,
  weeklyGoal: 3,
  workoutsThisWeek: 0,
  trainedDays: [],
  lastWorkoutLabel: null,
  upcomingPlans: [],
  ...overrides,
});

const group: Group = {
  id: 'g1',
  name: 'Morning Crew',
  createdBy: 'me',
  createdAt: new Date(2026, 9, 1),
  inviteCode: 'K7Q2MDXA',
  memberCount: 3,
  kind: 'group',
  maxMembers: 12,
};

const me = member('me', 'Sam Lee', {
  trainedDays: ['2026-11-09'],
  lastWorkoutDateKey: '2026-11-09',
  upcomingPlans: [{ dateKey: '2026-11-12', label: 'Legs' }],
});
const maya = member('maya', 'Maya Chen', {
  trainedDays: ['2026-11-08', '2026-11-10', '2026-11-11'],
  lastWorkoutDateKey: '2026-11-11',
  lastWorkoutLabel: 'Push day',
  weeklyGoal: 3,
});
const jo = member('jo', 'Jo', { weeklyGoal: 4 });

describe('the week', () => {
  it('runs Sunday to Saturday with today marked', () => {
    const days = buildWeekDays(TODAY);
    expect(days.map((day) => day.dayOfMonth)).toEqual([8, 9, 10, 11, 12, 13, 14]);
    expect(days.find((day) => day.isToday)?.short).toBe('Wed');
  });

  it('labels the range, across months too', () => {
    expect(weekRangeLabel(TODAY)).toBe('Nov 8 – 14');
    expect(weekRangeLabel('2026-11-03')).toBe('Nov 1 – 7');
    expect(weekRangeLabel('2026-10-01')).toBe('Sep 27 – Oct 3');
  });
});

describe('a member’s week', () => {
  it('marks days trained, and days ahead planned', () => {
    const week = buildMemberWeek(me, TODAY, 'me');
    expect(week.marks).toEqual(['none', 'trained', 'none', 'none', 'planned', 'none', 'none']);
    expect(week).toMatchObject({ name: 'Sam', isMe: true, done: 1, goal: 3, onTrack: false, trainedToday: false });
  });

  it('is on track once done plus planned reaches the goal', () => {
    expect(buildMemberWeek(maya, TODAY, 'me')).toMatchObject({ done: 3, onTrack: true, trainedToday: true });
  });

  it('counts older rows by their stored total', () => {
    const old = member('old', 'Old', { lastWorkoutDateKey: '2026-11-10', workoutsThisWeek: 2 });
    expect(doneThisWeek(old, TODAY)).toBe(2);
    const stale = member('stale', 'Stale', { lastWorkoutDateKey: '2026-11-01', workoutsThisWeek: 5 });
    expect(doneThisWeek(stale, TODAY)).toBe(0);
  });

  it('puts me first, then join order', () => {
    expect(buildGroupWeek([maya, jo, me], TODAY, 'me').map((row) => row.uid)).toEqual(['me', 'maya', 'jo']);
  });
});

describe('how a group reads', () => {
  const week = buildGroupWeek([me, maya, jo], TODAY, 'me');

  it('joins names', () => {
    expect(joinNames(['Maya'])).toBe('Maya');
    expect(joinNames(['Maya', 'Priya'])).toBe('Maya and Priya');
    expect(joinNames(['Maya', 'Priya', 'Jo'])).toBe('Maya, Priya and Jo');
    expect(joinNames(['Maya', 'Priya', 'Jo', 'Dev'])).toBe('Maya, Priya and 2 others');
  });

  it('summarises a group', () => {
    expect(groupSummary(week)).toBe('3 members · 1 on track this week');
    expect(groupCompactSummary(week)).toBe('3 members · 1 on track · Maya trained today');
  });

  it('says who trained today, with the workout name', () => {
    const others = trainedTodayOthers(week);
    expect(others.map((row) => row.name)).toEqual(['Maya']);
    expect(trainedTodayDetail([me, maya, jo], others, TODAY)).toBe('Maya: Push day');
  });

  it('uses first names', () => {
    expect(firstName('  Maya  Chen ')).toBe('Maya');
    expect(firstName('')).toBe('Member');
  });
});

describe('buddies', () => {
  const buddy: Group = { ...group, kind: 'buddy', maxMembers: 2, name: 'Gym buddies', memberCount: 2 };

  it('is named after the other person, or the nickname until they join', () => {
    expect(groupDisplayName(buddy, [me], 'me', 'Alex')).toBe('You & Alex');
    expect(groupDisplayName(buddy, [me], 'me', null)).toBe('You & your buddy');
    expect(groupDisplayName(buddy, [me, maya], 'me', 'Alex')).toBe('You & Maya');
    expect(groupDisplayName(group, [me, maya], 'me', null)).toBe('Morning Crew');
  });

  it('dates the pair from when the second one joined', () => {
    const joined = { ...maya, joinedAt: new Date(2026, 9, 3) };
    expect(buddiesSinceLabel(buddy, [me, joined])).toBe('Oct 3');
  });

  it('finds days together and the shorter streak', () => {
    const a = member('me', 'Sam', {
      trainedDays: ['2026-11-09'],
      lastWorkoutDateKey: '2026-11-09',
      currentStreak: 5,
      upcomingPlans: [{ dateKey: '2026-11-12', label: 'Legs' }],
    });
    const b = member('b', 'Alex', {
      trainedDays: ['2026-11-09', '2026-11-10'],
      lastWorkoutDateKey: '2026-11-10',
      currentStreak: 3,
      upcomingPlans: [{ dateKey: '2026-11-12', label: 'Legs' }],
    });
    const summary = buildBuddySummary([a, b], buildGroupWeek([a, b], TODAY, 'me'), TODAY);

    expect([...summary.togetherDays]).toEqual(['2026-11-09', '2026-11-12']);
    expect(summary.weeksBothHitGoal).toBe(3);
    expect(summary.bothOnTrack).toBe(false);
  });

  it('names the next planned day', () => {
    expect(nextPlannedLabel(buildMemberWeek(me, TODAY, 'me'), TODAY)).toBe('Thu planned');
    expect(nextPlannedLabel(buildMemberWeek(jo, TODAY, 'me'), TODAY)).toBeNull();
  });
});

describe('invites', () => {
  it('spaces a code and builds the link', () => {
    expect(spacedCode('K7Q2MDXA')).toBe('K7Q2 MDXA');
    expect(inviteUrl('https://example.app', 'K7Q2MDXA')).toBe('https://example.app/join/K7Q2MDXA');
  });

  it('builds the signed-out preview: first names, counts and plans still ahead', () => {
    const preview = buildInvitePreview({
      group,
      members: [me, maya, jo],
      inviterName: 'Sam Lee',
      previous: {
        groupId: 'g1',
        groupName: 'Morning Crew',
        kind: 'group',
        invitedByName: 'Maya',
        memberFirstNames: [],
        memberCount: 2,
        workoutsThisWeek: 0,
        plans: {
          ahead: { dateKey: '2026-11-12', label: 'Legs', time: null, where: null, goingFirstNames: ['Maya'] },
          past: { dateKey: '2026-11-01', label: 'Old', time: null, where: null, goingFirstNames: [] },
        },
        updatedAt: new Date(0),
      },
      todayKey: TODAY,
      now: new Date(2026, 10, 11),
    });

    expect(preview).toMatchObject({
      groupName: 'Morning Crew',
      invitedByName: 'Sam',
      memberFirstNames: ['Sam', 'Maya', 'Jo'],
      memberCount: 3,
      workoutsThisWeek: 4,
    });
    expect(Object.keys(preview.plans)).toEqual(['ahead']);
  });
});

describe('member signals', () => {
  it('works out days, the latest name and this week from workouts and activities', () => {
    const signals = memberSignals(
      [
        session('a', [], { workoutDate: '2026-11-02', title: 'Old' }),
        session('b', [], { workoutDate: '2026-11-09', title: 'Push day' }),
        session('open', [], { workoutDate: '2026-11-11', status: 'in_progress', title: 'Not yet' }),
      ],
      [{ activityDate: '2026-11-10', at: new Date(2026, 10, 10, 8), label: 'Run' }],
      3,
      TODAY,
    );

    expect(signals).toMatchObject({
      lastWorkoutDateKey: '2026-11-10',
      lastWorkoutLabel: 'Run',
      workoutsThisWeek: 2,
      weeklyGoal: 3,
      trainedDays: ['2026-11-02', '2026-11-09', '2026-11-10'],
    });
  });

  it('is empty for someone with nothing logged', () => {
    expect(memberSignals([], [], 3, TODAY)).toMatchObject({
      lastWorkoutDateKey: null,
      lastWorkoutAt: null,
      lastWorkoutLabel: null,
      currentStreak: 0,
      workoutsThisWeek: 0,
      trainedDays: [],
    });
  });

  it('copies open plans in the next seven days, soonest first', () => {
    expect(
      upcomingPlansFromEntries(
        [
          { dateKey: '2026-11-13', label: 'Pull' },
          { dateKey: '2026-11-11', label: ' Legs ' },
          { dateKey: '2026-11-12', label: 'Done', status: 'completed' },
          { dateKey: '2026-11-18', label: 'Too far' },
          { dateKey: '2026-11-10', label: 'Gone' },
          { dateKey: null, label: 'Someday' },
        ],
        TODAY,
      ),
    ).toEqual([
      { dateKey: '2026-11-11', label: 'Legs' },
      { dateKey: '2026-11-13', label: 'Pull' },
    ]);
  });

  it('shows a streak as 0 once the last workout is older than last week', () => {
    expect(effectiveStreak({ currentStreak: 4, lastWorkoutDateKey: '2026-11-03' }, TODAY)).toBe(4);
    expect(effectiveStreak({ currentStreak: 4, lastWorkoutDateKey: '2026-10-31' }, TODAY)).toBe(0);
    expect(effectiveStreak({ currentStreak: 4, lastWorkoutDateKey: null }, TODAY)).toBe(0);
  });
});
