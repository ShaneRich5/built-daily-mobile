import {
  cheerId,
  fromGroupMember,
  fromInvitePreview,
  fromNewGroup,
  fromNewSharedPlan,
  generateInviteCode,
  normalizeInviteCode,
  toCheer,
  toGroup,
  toGroupMember,
  toGroupMembership,
  toInviteCode,
  toInvitePreview,
  toSharedPlan,
} from '@/services/firestore/group-mappers';
import type { GroupMember } from '@/types/group';

const AT = new Date(2026, 10, 1, 9, 0);
const ts = (date: Date) => ({ toDate: () => date });

describe('invite codes', () => {
  it('makes eight characters with no look-alikes', () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  it('reads a typed code however it was typed', () => {
    expect(normalizeInviteCode(' k7q2 mdxa ')).toBe('K7Q2MDXA');
    expect(normalizeInviteCode('k7q2-mdxa')).toBe('K7Q2MDXA');
  });

  it('reads an invite, or nothing without its active flag', () => {
    expect(toInviteCode({ groupId: 'g', createdBy: 'u', createdAt: ts(AT), active: true })).toEqual({
      groupId: 'g',
      createdBy: 'u',
      createdAt: AT,
      active: true,
    });
    expect(toInviteCode({ groupId: 'g', createdBy: 'u', createdAt: ts(AT) })).toBeNull();
  });
});

describe('groups', () => {
  it('reads a group, treating ones from before buddies as groups of 12', () => {
    expect(
      toGroup('g1', { name: ' Morning Crew ', createdBy: 'u', createdAt: ts(AT), inviteCode: 'k7q2mdxa', memberCount: 3 }),
    ).toEqual({
      id: 'g1',
      name: 'Morning Crew',
      createdBy: 'u',
      createdAt: AT,
      inviteCode: 'K7Q2MDXA',
      memberCount: 3,
      kind: 'group',
      maxMembers: 12,
    });
  });

  it('reads a buddy as a group of two', () => {
    const buddy = toGroup('b', {
      name: 'Gym buddies',
      createdBy: 'u',
      createdAt: ts(AT),
      inviteCode: 'ABCDEFGH',
      memberCount: 1,
      kind: 'buddy',
      maxMembers: 2,
    });
    expect(buddy).toMatchObject({ kind: 'buddy', maxMembers: 2 });
  });

  it('skips one without a name or code', () => {
    expect(toGroup('g', { name: '', createdBy: 'u', createdAt: ts(AT), inviteCode: 'ABCDEFGH' })).toBeNull();
    expect(toGroup('g', { name: 'A', createdBy: 'u', createdAt: ts(AT) })).toBeNull();
    expect(toGroup('g', undefined)).toBeNull();
  });

  it('writes the fields the create rule checks', () => {
    expect(
      Object.keys(
        fromNewGroup({
          name: 'A',
          createdBy: 'u',
          createdAt: AT,
          inviteCode: 'ABCDEFGH',
          memberCount: 1,
          kind: 'group',
          maxMembers: 12,
        }),
      ).sort(),
    ).toEqual(['createdAt', 'createdBy', 'inviteCode', 'kind', 'maxMembers', 'memberCount', 'name']);
  });
});

describe('members', () => {
  const member: GroupMember = {
    uid: 'u1',
    displayName: 'Maya Chen',
    role: 'member',
    joinedAt: AT,
    lastWorkoutDateKey: '2026-11-10',
    lastWorkoutAt: AT,
    currentStreak: 4,
    weeklyGoal: 3,
    workoutsThisWeek: 2,
    trainedDays: ['2026-11-09', '2026-11-10'],
    lastWorkoutLabel: 'Push day',
    upcomingPlans: [{ dateKey: '2026-11-12', label: 'Legs' }],
  };

  it('round-trips a member row', () => {
    const data = fromGroupMember(member);
    expect(toGroupMember({ ...data, joinedAt: ts(AT), lastWorkoutAt: ts(AT) })).toEqual(member);
  });

  it('writes every field the create rule requires', () => {
    expect(Object.keys(fromGroupMember(member))).toEqual(
      expect.arrayContaining([
        'uid',
        'displayName',
        'role',
        'joinedAt',
        'lastWorkoutDateKey',
        'lastWorkoutAt',
        'currentStreak',
        'weeklyGoal',
      ]),
    );
  });

  it('fills in what older rows lack', () => {
    expect(toGroupMember({ uid: 'u', role: 'owner', joinedAt: ts(AT), displayName: '  ' })).toMatchObject({
      displayName: 'Member',
      lastWorkoutAt: null,
      currentStreak: 0,
      weeklyGoal: 3,
      trainedDays: [],
      upcomingPlans: [],
      lastWorkoutLabel: null,
    });
  });

  it('cleans up days and plans it cannot use', () => {
    const read = toGroupMember({
      uid: 'u',
      role: 'member',
      joinedAt: ts(AT),
      trainedDays: ['2026-11-10', 'yesterday', '2026-11-09', '2026-11-10'],
      upcomingPlans: [{ dateKey: '2026-11-12', label: ' Legs ' }, { dateKey: 'soon', label: 'X' }, { label: 'Y' }],
    });
    expect(read?.trainedDays).toEqual(['2026-11-09', '2026-11-10']);
    expect(read?.upcomingPlans).toEqual([{ dateKey: '2026-11-12', label: 'Legs' }]);
  });

  it('skips a row without a role', () => {
    expect(toGroupMember({ uid: 'u', role: 'admin', joinedAt: ts(AT) })).toBeNull();
  });
});

describe('memberships and cheers', () => {
  it('reads a membership with its buddy nickname', () => {
    expect(
      toGroupMembership({ groupId: 'g', nameSnapshot: 'Gym buddies', role: 'owner', joinedAt: ts(AT), buddyNickname: 'Alex' }),
    ).toEqual({ groupId: 'g', nameSnapshot: 'Gym buddies', role: 'owner', joinedAt: AT, buddyNickname: 'Alex' });
  });

  it('names a cheer by day, recipient and sender, as the rules require', () => {
    expect(cheerId({ dateKey: '2026-11-11', toUid: 'b', fromUid: 'a' })).toBe('2026-11-11_b_a');
    expect(toCheer({ groupId: 'g', toUid: 'b', fromUid: 'a', dateKey: '2026-11-11', createdAt: ts(AT) })).toEqual({
      groupId: 'g',
      toUid: 'b',
      fromUid: 'a',
      dateKey: '2026-11-11',
      createdAt: AT,
    });
  });
});

describe('invite previews', () => {
  it('writes only the keys the rules allow', () => {
    expect(
      Object.keys(
        fromInvitePreview({
          groupId: 'g',
          groupName: 'Crew',
          kind: 'group',
          invitedByName: 'Maya',
          memberFirstNames: ['Maya'],
          memberCount: 1,
          workoutsThisWeek: 0,
          plans: {},
          updatedAt: AT,
        }),
      ).sort(),
    ).toEqual([
      'groupId',
      'groupName',
      'invitedByName',
      'kind',
      'memberCount',
      'memberFirstNames',
      'plans',
      'updatedAt',
      'workoutsThisWeek',
    ]);
  });

  it('reads plans in a preview, dropping broken ones', () => {
    const preview = toInvitePreview({
      groupId: 'g',
      groupName: 'Crew',
      plans: {
        p1: { dateKey: '2026-11-12', label: 'Legs', time: '06:30', where: 'Iron Works', goingFirstNames: ['Maya'] },
        p2: { dateKey: 'later', label: 'X' },
      },
    });
    expect(preview?.plans).toEqual({
      p1: { dateKey: '2026-11-12', label: 'Legs', time: '06:30', where: 'Iron Works', goingFirstNames: ['Maya'] },
    });
    expect(preview?.invitedByName).toBe('A friend');
  });
});

describe('plans together', () => {
  const plan = {
    groupId: 'g',
    dateKey: '2026-11-12',
    time: '06:30',
    where: ' Iron Works ',
    label: ' Leg day ',
    exercises: [{ id: 'squat', name: 'Back squat', sets: 4 }],
    note: '',
    createdBy: 'me',
    createdByName: 'Sam Lee',
    going: ['me'],
    goingAt: { me: AT },
    createdAt: AT,
  };

  it('writes every key the rules require, tidied', () => {
    const data = fromNewSharedPlan(plan);
    expect(Object.keys(data ?? {}).sort()).toEqual(
      ['createdAt', 'createdBy', 'createdByName', 'dateKey', 'exercises', 'going', 'goingAt', 'groupId', 'label', 'note', 'time', 'where'],
    );
    expect(data).toMatchObject({ label: 'Leg day', where: 'Iron Works', note: null, going: ['me'] });
  });

  it('refuses a plan without a name, a real day or a real time', () => {
    expect(fromNewSharedPlan({ ...plan, label: '  ' })).toBeNull();
    expect(fromNewSharedPlan({ ...plan, dateKey: 'Thursday' })).toBeNull();
    expect(fromNewSharedPlan({ ...plan, time: '6:30' })).toBeNull();
  });

  it('reads a plan, dropping what it cannot use', () => {
    const read = toSharedPlan('p1', {
      ...plan,
      createdAt: ts(AT),
      time: 'early',
      going: ['me', 'me', 'maya', 7],
      goingAt: { me: ts(AT), maya: 'soon' },
      exercises: [{ id: 'squat', name: 'Back squat', sets: 40 }, { name: 'No id' }],
    });
    expect(read).toMatchObject({
      id: 'p1',
      label: 'Leg day',
      time: null,
      going: ['me', 'maya'],
      goingAt: { me: AT },
      exercises: [{ id: 'squat', name: 'Back squat', sets: 20 }],
    });
    expect(toSharedPlan('p', { ...plan, createdAt: ts(AT), label: '' })).toBeNull();
  });
});
