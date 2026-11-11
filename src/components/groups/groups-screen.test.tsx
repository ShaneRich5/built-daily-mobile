import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { GroupScreen } from '@/components/groups/group-screen';
import { GroupsScreen } from '@/components/groups/groups-screen';
import { useSession } from '@/contexts/session';
import { confirm } from '@/services/confirm';
import {
  cheer,
  createGroup,
  deleteGroup,
  joinGroupByCode,
  leaveGroup,
  refreshInvitePreview,
  subscribeToCheers,
  subscribeToGroup,
  subscribeToMembers,
  subscribeToMemberships,
} from '@/services/firestore/group-repository';
import { syncGroups } from '@/services/group-sync';
import type { Cheer, Group, GroupMember, GroupMembership } from '@/types/group';

jest.mock('@/contexts/session');
jest.mock('@/services/confirm');
jest.mock('@/services/firestore/group-repository');
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

// Wednesday, Nov 11, 2026. The week runs Sun Nov 8 – Sat Nov 14.
const NOW = new Date(2026, 10, 11, 9, 0);
const ME = { uid: 'me', displayName: 'Sam Lee', email: 'sam@example.com' };

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

const crew: Group = {
  id: 'crew',
  name: 'Morning Crew',
  createdBy: 'me',
  createdAt: new Date(2026, 9, 1),
  inviteCode: 'K7Q2MDXA',
  memberCount: 2,
  kind: 'group',
  maxMembers: 12,
};

const maya = member('maya', 'Maya Chen', {
  trainedDays: ['2026-11-11'],
  lastWorkoutDateKey: '2026-11-11',
  lastWorkoutLabel: 'Push day',
});
const me = member('me', 'Sam Lee', { role: 'owner', trainedDays: ['2026-11-09'], lastWorkoutDateKey: '2026-11-09' });

let memberships: GroupMembership[];
let groups: Record<string, Group | null>;
let members: Record<string, GroupMember[]>;
let cheers: Cheer[];

const membership = (groupId: string, name: string, buddyNickname: string | null = null): GroupMembership => ({
  groupId,
  nameSnapshot: name,
  role: 'owner',
  joinedAt: new Date(2026, 9, 1),
  buddyNickname,
});

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  memberships = [];
  groups = {};
  members = {};
  cheers = [];

  jest.mocked(useSession).mockReturnValue({ user: ME as never, isLoading: false });
  jest.mocked(confirm).mockResolvedValue(true);
  jest.mocked(subscribeToMemberships).mockImplementation((_uid, { onData }) => {
    onData(memberships);
    return jest.fn();
  });
  jest.mocked(subscribeToGroup).mockImplementation((id, { onData }) => {
    onData(groups[id] ?? null);
    return jest.fn();
  });
  jest.mocked(subscribeToMembers).mockImplementation((id, { onData }) => {
    onData(members[id] ?? []);
    return jest.fn();
  });
  jest.mocked(subscribeToCheers).mockImplementation((_id, _day, { onData }) => {
    onData(cheers);
    return jest.fn();
  });
  jest.mocked(cheer).mockResolvedValue(undefined);
  jest.mocked(refreshInvitePreview).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('Groups tab', () => {
  it('invites someone with no groups to start one or join one', async () => {
    await render(<GroupsScreen />);

    expect(screen.getByText('Train with someone')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'I have a code' })).toBeTruthy();
    expect(syncGroups).toHaveBeenCalledWith(ME);
  });

  it('joins with a code and opens the group', async () => {
    jest.mocked(joinGroupByCode).mockResolvedValue('crew');
    await render(<GroupsScreen />);

    await user().press(screen.getByRole('button', { name: 'I have a code' }));
    await user().type(screen.getByLabelText('Invite code'), 'k7q2 mdxa');
    await user().press(screen.getByRole('button', { name: 'Join group' }));

    expect(joinGroupByCode).toHaveBeenCalledWith(ME, 'k7q2 mdxa');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/groups/[groupId]', params: { groupId: 'crew' } });
  });

  it('says why a code did not work', async () => {
    const failure = Object.assign(new Error('That code isn’t working. Ask for a fresh one.'), { name: 'GroupError' });
    jest.mocked(joinGroupByCode).mockRejectedValue(failure);
    await render(<GroupsScreen />);

    await user().press(screen.getByRole('button', { name: 'I have a code' }));
    await user().type(screen.getByLabelText('Invite code'), 'NOPENOPE');
    await user().press(screen.getByRole('button', { name: 'Join group' }));

    expect(screen.getByText('That code isn’t working. Ask for a fresh one.')).toBeTruthy();
  });

  it('starts a gym buddy and opens its invite', async () => {
    jest.mocked(createGroup).mockResolvedValue('buddy-1');
    await render(<GroupsScreen />);

    await user().press(screen.getByRole('button', { name: 'Start a buddy or group' }));
    await user().type(screen.getByLabelText('Who’s it with? (just for you)'), 'Alex');
    await user().press(screen.getByRole('button', { name: 'Create & get invite link' }));

    expect(createGroup).toHaveBeenCalledWith(ME, { kind: 'buddy', name: 'Gym buddies', buddyNickname: 'Alex' });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/groups/[groupId]',
      params: { groupId: 'buddy-1', invite: '1' },
    });
  });

  it('starts a named group', async () => {
    jest.mocked(createGroup).mockResolvedValue('g2');
    await render(<GroupsScreen />);

    await user().press(screen.getByRole('button', { name: 'New buddy or group' }));
    await user().press(screen.getByRole('radio', { name: /^Group\./ }));
    await user().type(screen.getByLabelText('Group name'), 'Morning Crew');
    await user().press(screen.getByRole('button', { name: 'Create & get invite link' }));

    expect(createGroup).toHaveBeenCalledWith(ME, { kind: 'group', name: 'Morning Crew', buddyNickname: null });
  });

  it('features the first group and cheers whoever trained today', async () => {
    memberships = [membership('crew', 'Morning Crew')];
    groups = { crew };
    members = { crew: [me, maya] };

    await render(<GroupsScreen />);

    expect(screen.getByText('Morning Crew')).toBeTruthy();
    expect(screen.getByText('2 members · 0 on track this week')).toBeTruthy();
    expect(screen.getByText('K7Q2 MDXA')).toBeTruthy();

    await user().press(screen.getByRole('button', { name: 'Cheer Maya' }));
    expect(cheer).toHaveBeenCalledWith('me', 'crew', ['maya'], '2026-11-11');
  });

  it('shows a cheer already sent', async () => {
    memberships = [membership('crew', 'Morning Crew')];
    groups = { crew };
    members = { crew: [me, maya] };
    cheers = [{ groupId: 'crew', toUid: 'maya', fromUid: 'me', dateKey: '2026-11-11', createdAt: NOW }];

    await render(<GroupsScreen />);

    expect(screen.getByRole('button', { name: 'Cheered' })).toBeDisabled();
  });
});

describe('a group', () => {
  beforeEach(() => {
    memberships = [membership('crew', 'Morning Crew')];
    groups = { crew };
    members = { crew: [me, maya] };
  });

  it('shows the week and who trained today', async () => {
    await render(<GroupScreen groupId="crew" />);

    expect(screen.getByRole('header', { name: 'Morning Crew' })).toBeTruthy();
    expect(screen.getByText('2 members · Nov 8 – 14')).toBeTruthy();
    expect(screen.getByLabelText(/^You, 1 of 3 this week\. Sun 8: nothing yet\. Mon 9: trained/)).toBeTruthy();
    expect(screen.getByText('Maya trained today')).toBeTruthy();
    expect(screen.getByText('Maya: Push day')).toBeTruthy();

    await user().press(screen.getByRole('button', { name: 'Cheer' }));
    expect(cheer).toHaveBeenCalledWith('me', 'crew', ['maya'], '2026-11-11');
  });

  it('opens the invite with the code, and refreshes the link’s preview', async () => {
    await render(<GroupScreen groupId="crew" openInvite />);

    expect(screen.getByText('K7Q2 MDXA')).toBeTruthy();
    expect(screen.getByText('2 of 12 spots taken')).toBeTruthy();
    expect(refreshInvitePreview).toHaveBeenCalledWith(ME, crew, [me, maya]);
  });

  it('keeps an owner from leaving while others are in it', async () => {
    await render(<GroupScreen groupId="crew" />);

    await user().press(screen.getByRole('button', { name: 'Morning Crew options' }));
    await user().press(screen.getByRole('button', { name: 'Leave' }));

    expect(leaveGroup).not.toHaveBeenCalled();
    expect(screen.getByText(/Delete it for everyone instead/)).toBeTruthy();
  });

  it('lets an owner delete it for everyone', async () => {
    jest.mocked(deleteGroup).mockResolvedValue(undefined);
    await render(<GroupScreen groupId="crew" />);

    await user().press(screen.getByRole('button', { name: 'Morning Crew options' }));
    await user().press(screen.getByRole('button', { name: 'Delete for everyone' }));

    expect(deleteGroup).toHaveBeenCalledWith('me', crew);
    expect(router.back).toHaveBeenCalled();
  });

  it('lets a member leave', async () => {
    groups = { crew: { ...crew, createdBy: 'maya' } };
    jest.mocked(leaveGroup).mockResolvedValue(true);
    await render(<GroupScreen groupId="crew" />);

    await user().press(screen.getByRole('button', { name: 'Morning Crew options' }));
    expect(screen.queryByRole('button', { name: 'Delete for everyone' })).toBeNull();
    await user().press(screen.getByRole('button', { name: 'Leave' }));

    expect(leaveGroup).toHaveBeenCalledWith('me', { ...crew, createdBy: 'maya' });
  });

  it('says so when the group is gone', async () => {
    groups = {};
    await render(<GroupScreen groupId="crew" />);

    expect(screen.getByText('This group isn’t available')).toBeTruthy();
  });
});

describe('a buddy', () => {
  const buddy: Group = { ...crew, id: 'b', name: 'Gym buddies', kind: 'buddy', maxMembers: 2, memberCount: 1 };

  it('waits for them to join, under the nickname', async () => {
    memberships = [membership('b', 'Gym buddies', 'Alex')];
    groups = { b: buddy };
    members = { b: [me] };

    await render(<GroupScreen groupId="b" />);

    expect(screen.getByRole('header', { name: 'You & Alex' })).toBeTruthy();
    expect(screen.getByText('Waiting for them to join')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send invite' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Turn this into a group' })).toBeTruthy();
  });

  it('is named after them once they join', async () => {
    memberships = [membership('b', 'Gym buddies', 'Alex')];
    groups = { b: { ...buddy, memberCount: 2 } };
    members = { b: [me, member('maya', 'Maya Chen', { joinedAt: new Date(2026, 9, 3) })] };

    await render(<GroupScreen groupId="b" />);

    expect(screen.getByRole('header', { name: 'You & Maya' })).toBeTruthy();
    expect(screen.getByText('Gym buddies since Oct 3')).toBeTruthy();
  });
});
