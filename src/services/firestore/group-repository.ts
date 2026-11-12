import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { dateKey } from '@/lib/date-keys';
import { buildInvitePreview } from '@/lib/groups-model';
import { displayNameFromAuth } from '@/lib/user-profile';
import { getDb } from '@/services/firebase';
import {
  cheerId,
  fromCheer,
  fromGroupMember,
  fromGroupMembership,
  fromInviteCode,
  fromInvitePreview,
  fromNewGroup,
  generateInviteCode,
  normalizeInviteCode,
  toCheer,
  toGroup,
  toGroupMember,
  toGroupMembership,
  toInviteCode,
  toInvitePreview,
} from '@/services/firestore/group-mappers';
import { getProgressSettings } from '@/services/firestore/home-repository';
import { type GroupUser, syncGroups } from '@/services/group-sync';
import {
  type Cheer,
  GROUP_LIMITS,
  type Group,
  type GroupKind,
  type GroupMember,
  type GroupMembership,
  type SharedPlan,
} from '@/types/group';
import type { WeeklyGoalTarget } from '@/types/progress';

// Groups: `groups/{id}` with its members and cheers, each lifter's private
// `groupMemberships` index, and `inviteCodes`. Ported from the web's
// `lib/group-repository.ts`; every write is shaped by `group-mappers.ts` to
// pass the same rules the web's do.

type Unsubscribe = () => void;

type Listener<T> = {
  onData: (value: T) => void;
  onError: (error: Error) => void;
};

export type { GroupUser };

/** A failure whose message is fit to show the lifter as it is. */
export class GroupError extends Error {
  override name = 'GroupError';
}

function isPermissionDenied(error: unknown): boolean {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  return code.includes('permission-denied');
}

// ── Reads ────────────────────────────────────────────────────────────────

/** The lifter's groups, most recently joined first. */
export function subscribeToMemberships(
  userId: string,
  { onData, onError }: Listener<GroupMembership[]>,
): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), 'users', userId, 'groupMemberships'), orderBy('joinedAt', 'desc')),
    (snapshot) =>
      onData(
        snapshot.docs
          .map((document) => toGroupMembership(document.data()))
          .filter((membership): membership is GroupMembership => membership !== null),
      ),
    onError,
  );
}

/** One group, live. Null when it is gone or the lifter is no longer in it. */
export function subscribeToGroup(groupId: string, { onData, onError }: Listener<Group | null>): Unsubscribe {
  return onSnapshot(
    doc(getDb(), 'groups', groupId),
    (snapshot) => onData(toGroup(snapshot.id, snapshot.data())),
    // Removed from the group, or it was deleted: the read is now refused.
    (error) => (isPermissionDenied(error) ? onData(null) : onError(error)),
  );
}

/** A group's members, in the order they joined. */
export function subscribeToMembers(
  groupId: string,
  { onData, onError }: Listener<GroupMember[]>,
): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), 'groups', groupId, 'members'), orderBy('joinedAt', 'asc')),
    (snapshot) =>
      onData(
        snapshot.docs
          .map((document) => toGroupMember(document.data()))
          .filter((member): member is GroupMember => member !== null),
      ),
    onError,
  );
}

/** Cheers in a group on one day. */
export function subscribeToCheers(
  groupId: string,
  dateKey: string,
  { onData, onError }: Listener<Cheer[]>,
): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), 'groups', groupId, 'cheers'), where('dateKey', '==', dateKey)),
    (snapshot) =>
      onData(
        snapshot.docs
          .map((document) => toCheer(document.data()))
          .filter((cheer): cheer is Cheer => cheer !== null),
      ),
    onError,
  );
}

// ── Joining and leaving ──────────────────────────────────────────────────

async function membershipCount(userId: string): Promise<number> {
  return (await getDocs(collection(getDb(), 'users', userId, 'groupMemberships'))).size;
}

/** A code no group is using yet. */
async function freshInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateInviteCode();
    if (!(await getDoc(doc(getDb(), 'inviteCodes', code))).exists()) return code;
  }
  throw new GroupError('Could not make an invite code. Try again.');
}

/** A new member row: the signals start empty and fill on the member's next sync. */
function newMember(user: GroupUser, role: GroupMember['role'], joinedAt: Date, weeklyGoal: WeeklyGoalTarget): GroupMember {
  return {
    uid: user.uid,
    displayName: displayNameFromAuth(user),
    role,
    joinedAt,
    lastWorkoutDateKey: null,
    lastWorkoutAt: null,
    currentStreak: 0,
    weeklyGoal,
    workoutsThisWeek: 0,
    trainedDays: [],
    lastWorkoutLabel: null,
    upcomingPlans: [],
  };
}

/**
 * Starts a buddy or a group with the lifter as its owner, and answers with its
 * id. Rejects with a `GroupError` worth showing when it cannot.
 */
export async function createGroup(
  user: GroupUser,
  input: { kind: GroupKind; name: string; buddyNickname: string | null },
): Promise<string> {
  const db = getDb();
  const name = input.name.trim().slice(0, GROUP_LIMITS.name);
  if (!name) throw new GroupError('Give the group a name.');
  if ((await membershipCount(user.uid)) >= GROUP_LIMITS.maxGroupsPerUser) {
    throw new GroupError(`You can be in at most ${GROUP_LIMITS.maxGroupsPerUser} groups.`);
  }

  const [code, settings] = await Promise.all([freshInviteCode(), getProgressSettings(user.uid)]);
  const now = new Date();
  const groupRef = doc(collection(db, 'groups'));
  const kind: GroupKind = input.kind === 'buddy' ? 'buddy' : 'group';

  // The group and its code first: the member rule reads the group to check
  // its owner and its cap.
  const setup = writeBatch(db);
  setup.set(
    groupRef,
    fromNewGroup({
      name,
      createdBy: user.uid,
      createdAt: now,
      inviteCode: code,
      memberCount: 1,
      kind,
      maxMembers: kind === 'buddy' ? GROUP_LIMITS.buddyMembers : GROUP_LIMITS.maxMembers,
    }),
  );
  setup.set(doc(db, 'inviteCodes', code), fromInviteCode({ groupId: groupRef.id, createdBy: user.uid, createdAt: now, active: true }));
  await setup.commit();

  const membership = writeBatch(db);
  membership.set(
    doc(db, 'groups', groupRef.id, 'members', user.uid),
    fromGroupMember(newMember(user, 'owner', now, settings.weeklyGoal)),
  );
  membership.set(
    doc(db, 'users', user.uid, 'groupMemberships', groupRef.id),
    fromGroupMembership({
      groupId: groupRef.id,
      nameSnapshot: name,
      role: 'owner',
      joinedAt: now,
      buddyNickname: kind === 'buddy' ? input.buddyNickname?.trim().slice(0, GROUP_LIMITS.displayName) || null : null,
    }),
  );
  await membership.commit();

  syncGroups(user);
  return groupRef.id;
}

/**
 * Joins the group a code belongs to and answers with its id — also when the
 * lifter is already in it. Rejects with a `GroupError` worth showing.
 *
 * Never reads the group first: a joiner is not a member yet, and the rules
 * refuse that read. The count goes up with `increment`, so the rules enforce
 * the cap atomically. The group's real name is filled into the index after.
 */
export async function joinGroupByCode(user: GroupUser, raw: string): Promise<string> {
  const db = getDb();
  const code = normalizeInviteCode(raw);
  if (code.length < 6) throw new GroupError('That code is too short. Codes are 8 letters and numbers.');

  const invite = toInviteCode((await getDoc(doc(db, 'inviteCodes', code))).data());
  if (!invite || !invite.active) throw new GroupError('That code isn’t working. Ask for a fresh one.');

  const { groupId } = invite;
  const memberRef = doc(db, 'groups', groupId, 'members', user.uid);
  if ((await getDoc(memberRef)).exists()) return groupId;

  if ((await membershipCount(user.uid)) >= GROUP_LIMITS.maxGroupsPerUser) {
    throw new GroupError(`You can be in at most ${GROUP_LIMITS.maxGroupsPerUser} groups.`);
  }

  const now = new Date();
  const settings = await getProgressSettings(user.uid);
  const groupRef = doc(db, 'groups', groupId);
  const indexRef = doc(db, 'users', user.uid, 'groupMemberships', groupId);

  try {
    await runTransaction(db, async (transaction) => {
      transaction.set(memberRef, fromGroupMember(newMember(user, 'member', now, settings.weeklyGoal)));
      // A placeholder name: the rules require one, and the real one is
      // readable only once this lands.
      transaction.set(
        indexRef,
        fromGroupMembership({ groupId, nameSnapshot: 'Group', role: 'member', joinedAt: now, buddyNickname: null }),
      );
      transaction.update(groupRef, { memberCount: increment(1) });
    });
  } catch (error) {
    throw isPermissionDenied(error)
      ? new GroupError('That group is full.')
      : new GroupError('Could not join. Check your connection and try again.');
  }

  try {
    const group = toGroup(groupId, (await getDoc(groupRef)).data());
    if (group) await updateDoc(indexRef, { nameSnapshot: group.name });
  } catch {
    // Best-effort: the group screen always reads the live name.
  }

  syncGroups(user);
  return groupId;
}

/**
 * Leaves a group. An owner with others still in it cannot leave — they delete
 * it for everyone instead — so this answers false for them. An owner on their
 * own deletes it.
 */
export async function leaveGroup(userId: string, group: Group): Promise<boolean> {
  const db = getDb();
  if (group.createdBy === userId) {
    if (group.memberCount > 1) return false;
    await deleteGroup(userId, group);
    return true;
  }

  await runTransaction(db, async (transaction) => {
    const groupRef = doc(db, 'groups', group.id);
    const current = toGroup(group.id, (await transaction.get(groupRef)).data());
    if (!current) throw new GroupError('That group is gone.');

    transaction.delete(doc(db, 'groups', group.id, 'members', userId));
    transaction.delete(doc(db, 'users', userId, 'groupMemberships', group.id));
    transaction.update(groupRef, { memberCount: Math.max(0, current.memberCount - 1) });
  });
  return true;
}

/** Deletes a group for everyone, with each member's row and index entry. Owner only. */
export async function deleteGroup(userId: string, group: Group): Promise<void> {
  const db = getDb();
  if (group.createdBy !== userId) throw new GroupError('Only whoever started it can delete it.');

  const members = await getDocs(collection(db, 'groups', group.id, 'members'));
  const batch = writeBatch(db);
  for (const member of members.docs) {
    batch.delete(member.ref);
    batch.delete(doc(db, 'users', member.id, 'groupMemberships', group.id));
  }
  batch.set(doc(db, 'inviteCodes', group.inviteCode), { active: false }, { merge: true });
  batch.delete(doc(db, 'invitePreviews', group.inviteCode));
  batch.delete(doc(db, 'groups', group.id));
  await batch.commit();
}

/** A new code for the group; the old one, and its link, stop working. Owner only. */
export async function resetInviteCode(userId: string, group: Group): Promise<string> {
  const db = getDb();
  const code = await freshInviteCode();

  const batch = writeBatch(db);
  batch.set(doc(db, 'inviteCodes', group.inviteCode), { active: false }, { merge: true });
  batch.set(doc(db, 'inviteCodes', code), fromInviteCode({ groupId: group.id, createdBy: userId, createdAt: new Date(), active: true }));
  batch.update(doc(db, 'groups', group.id), { inviteCode: code });
  batch.delete(doc(db, 'invitePreviews', group.inviteCode));
  await batch.commit();
  return code;
}

/** "Turn this into a group": a buddy's cap goes up to 12 and it takes a name. Owner only. */
export async function convertBuddyToGroup(userId: string, groupId: string, rawName: string): Promise<void> {
  const name = rawName.trim().slice(0, GROUP_LIMITS.name);
  if (!name) throw new GroupError('Give the group a name.');

  await updateDoc(doc(getDb(), 'groups', groupId), { kind: 'group', maxMembers: GROUP_LIMITS.maxMembers, name });
  await updateDoc(doc(getDb(), 'users', userId, 'groupMemberships', groupId), {
    nameSnapshot: name,
    buddyNickname: null,
  });
}

// ── Cheers and the invite preview ────────────────────────────────────────

/** Cheers each of `toUids` who has not had one from the lifter today. */
export async function cheer(userId: string, groupId: string, toUids: readonly string[], dateKey: string): Promise<void> {
  await Promise.all(
    toUids
      .filter((toUid) => toUid !== userId)
      .map((toUid) => {
        const value: Cheer = { groupId, toUid, fromUid: userId, dateKey, createdAt: new Date() };
        return setDoc(doc(getDb(), 'groups', groupId, 'cheers', cheerId(value)), fromCheer(value));
      }),
  );
}

/** Takes back a cheer. */
export async function uncheer(userId: string, groupId: string, toUid: string, dateKey: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'groups', groupId, 'cheers', cheerId({ dateKey, toUid, fromUid: userId })));
}

/**
 * Refreshes what the invite link shows a signed-out visitor — first names and
 * counts — from what the inviting member can already see. Called when the
 * invite sheet opens. Best-effort: the web's join page falls back to a plain
 * "You're invited" without it.
 */
export async function refreshInvitePreview(
  user: GroupUser,
  group: Group,
  members: readonly GroupMember[],
  plans: readonly SharedPlan[] = [],
): Promise<void> {
  try {
    const ref = doc(getDb(), 'invitePreviews', group.inviteCode);
    const previous = toInvitePreview((await getDoc(ref)).data());
    const now = new Date();
    const preview = buildInvitePreview({
      group,
      members,
      inviterName: displayNameFromAuth(user),
      previous,
      plans,
      todayKey: dateKey(now),
      now,
    });
    await setDoc(ref, fromInvitePreview(preview));
  } catch {
    // Best-effort.
  }
}

