import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CheckIcon, ShareIcon, XIcon } from '@/components/ui/icons';
import { SheetFrame } from '@/components/ui/sheet';
import { WEB_APP_URL } from '@/constants/links';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { inviteUrl, spacedCode } from '@/lib/groups-model';
import { GROUP_LIMITS, type GroupKind } from '@/types/group';

export type NewGroupInput = { kind: GroupKind; name: string; buddyNickname: string | null };

/** The message for a failed write: a `GroupError`'s own words, else a generic line. */
export function failureMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.name === 'GroupError' ? error.message : fallback;
}

const KINDS: { kind: GroupKind; title: string; body: string }[] = [
  {
    kind: 'buddy',
    title: 'Gym buddy',
    body: 'Just you and one person. See each other’s week, plan sessions, keep each other going.',
  },
  { kind: 'group', title: 'Group', body: 'Up to 12 people. A running club, coworkers, the 6 AM regulars.' },
];

/** G4: a buddy or a group, a name, and exactly what is shared. */
export function NewGroupPanel({
  atLimit,
  onCreate,
}: {
  atLimit: boolean;
  /** Resolves to null when created, or the message to show when not. */
  onCreate: (input: NewGroupInput) => Promise<string | null>;
}) {
  const theme = useTheme();
  const [kind, setKind] = useState<GroupKind>('buddy');
  const [nickname, setNickname] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = !atLimit && (kind === 'buddy' || name.trim().length > 0);

  const create = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const failed = await onCreate({
      kind,
      name: kind === 'buddy' ? 'Gym buddies' : name.trim(),
      buddyNickname: kind === 'buddy' ? nickname.trim() || null : null,
    });
    setBusy(false);
    setError(failed);
  };

  return (
    <SheetFrame
      fill
      title="Train with someone"
      subtitle="You’ll get a link to send. Nothing is shared until they join."
      footer={
        <Button label="Create & get invite link" size="lg" onPress={() => void create()} disabled={!ready} busy={busy} />
      }>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.kinds} accessibilityRole="radiogroup">
          {KINDS.map((option) => {
            const on = option.kind === kind;
            return (
              <Pressable
                key={option.kind}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${option.title}. ${option.body}`}
                onPress={() => setKind(option.kind)}
                style={[
                  styles.kind,
                  on
                    ? { backgroundColor: theme.tintSubtle, borderColor: theme.tint }
                    : { backgroundColor: theme.surface, borderColor: theme.border },
                ]}>
                <View style={[styles.radio, { borderColor: on ? theme.tint : theme.borderStrong }]}>
                  {on ? <View style={[styles.radioDot, { backgroundColor: theme.tint }]} /> : null}
                </View>
                <View style={styles.flex}>
                  <ThemedText type="labelStrong">{option.title}</ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    {option.body}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>

        {kind === 'buddy' ? (
          <FormField
            label="Who’s it with? (just for you)"
            value={nickname}
            onChangeText={setNickname}
            maxLength={GROUP_LIMITS.displayName}
            placeholder="Alex"
            hint={`Shows as “You & ${nickname.trim() || 'Alex'}” until they join with their own name.`}
          />
        ) : (
          <FormField
            label="Group name"
            value={name}
            onChangeText={setName}
            maxLength={GROUP_LIMITS.name}
            placeholder="Morning Crew"
          />
        )}

        <View style={[styles.shared, { backgroundColor: theme.background }]}>
          <ThemedText type="overline">What they’ll see</ThemedText>
          <SharedLine on text="Days you train and plan, and the workout name" />
          <SharedLine on text="Your weekly goal and how close you are" />
          <SharedLine on={false} text="Never your sets, weights, notes or body weight" />
        </View>

        {atLimit ? (
          <ThemedText type="small" themeColor="textMuted">
            You’re in {GROUP_LIMITS.maxGroupsPerUser} groups, the most for now.
          </ThemedText>
        ) : null}
        {error ? (
          <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
            {error}
          </ThemedText>
        ) : null}
      </ScrollView>
    </SheetFrame>
  );
}

function SharedLine({ on, text }: { on: boolean; text: string }) {
  const theme = useTheme();
  const Icon = on ? CheckIcon : XIcon;
  return (
    <View style={styles.sharedLine}>
      <Icon size={16} color={on ? theme.tintText : theme.textFaint} strokeWidth={2} />
      <ThemedText type="small" themeColor="textBody" style={styles.flex}>
        {text}
      </ThemedText>
    </View>
  );
}

/** Groups › Join: type the code someone gave you. */
export function JoinPanel({ onJoin }: { onJoin: (code: string) => Promise<string | null> }) {
  const theme = useTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    const failed = await onJoin(code);
    setBusy(false);
    setError(failed);
  };

  return (
    <SheetFrame
      title="Join with a code"
      subtitle="Ask someone in the group for their code."
      footer={<Button label="Join group" size="lg" onPress={() => void join()} disabled={!code.trim()} busy={busy} />}>
      <View style={styles.content}>
        <TextInput
          value={code}
          onChangeText={(text) => {
            setCode(text);
            if (error) setError(null);
          }}
          onSubmitEditing={() => void join()}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          placeholder="K7Q2 MDXA"
          placeholderTextColor={theme.textFaint}
          accessibilityLabel="Invite code"
          style={[
            styles.codeInput,
            { backgroundColor: theme.background, borderColor: error ? theme.danger : theme.border, color: theme.text },
          ]}
        />
        {error ? (
          <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
            {error}
          </ThemedText>
        ) : null}
      </View>
    </SheetFrame>
  );
}

/**
 * G5: the code to say out loud, and the link to send. The link opens the web
 * app's join page, which works whether or not they have this app; the code
 * works typed into Groups › Join here.
 */
export function InvitePanel({
  groupName,
  memberCount,
  maxMembers,
  code,
  isOwner,
  onReset,
}: {
  groupName: string;
  memberCount: number;
  maxMembers: number;
  code: string;
  isOwner: boolean;
  /** Resolves to whether the code was reset. */
  onReset: () => Promise<boolean>;
}) {
  const theme = useTheme();
  const [note, setNote] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const url = inviteUrl(WEB_APP_URL, code);
  const full = memberCount >= maxMembers;

  const share = async () => {
    setNote(null);
    try {
      await Share.share({ message: `Join ${groupName} on Built Daily: ${url}\nOr enter code ${spacedCode(code)} in Groups › Join.` });
    } catch {
      setNote('Couldn’t open sharing. Read them the code instead.');
    }
  };

  const reset = async () => {
    setResetting(true);
    setNote(null);
    if (!(await onReset())) setNote('Couldn’t reset the link. Try again.');
    setResetting(false);
  };

  return (
    <SheetFrame
      title={`Invite to ${groupName}`}
      subtitle={`${memberCount} of ${maxMembers} spots taken`}
      footer={<Button label="Share invite" icon={ShareIcon} size="lg" onPress={() => void share()} />}>
      <View style={styles.content}>
        {full ? (
          <ThemedText type="small" themeColor="textMuted" style={[styles.full, { backgroundColor: theme.background }]}>
            Every spot is taken right now, so the code won’t let anyone else in.
          </ThemedText>
        ) : null}

        <View style={[styles.codeCard, { borderColor: theme.border }]}>
          <ThemedText type="overline">Invite code</ThemedText>
          <ThemedText selectable style={styles.code} accessibilityLabel={`Invite code ${code.split('').join(' ')}`}>
            {spacedCode(code)}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            Say it in person, or they can type it in Groups › Join.
          </ThemedText>
        </View>

        <ThemedText type="caption" selectable numberOfLines={1} style={styles.link}>
          {url.replace(/^https?:\/\//, '')}
        </ThemedText>

        {note ? (
          <ThemedText type="small" themeColor="textMuted" style={styles.center}>
            {note}
          </ThemedText>
        ) : null}

        <View style={styles.resetRow}>
          <ThemedText type="caption" style={styles.center}>
            Anyone with the code can join until it’s reset.
          </ThemedText>
          {isOwner ? (
            <Button label="Reset code" variant="ghost" size="sm" busy={resetting} onPress={() => void reset()} />
          ) : null}
        </View>
      </View>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 8,
  },
  flex: {
    flex: 1,
  },
  kinds: {
    gap: 8,
  },
  kind: {
    alignItems: 'flex-start',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  radio: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginTop: 1,
    width: 20,
  },
  radioDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  shared: {
    borderRadius: Radius.lg,
    gap: 8,
    padding: 14,
  },
  sharedLine: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  codeInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontFamily: FontFamily.monoMedium,
    fontSize: 22,
    letterSpacing: 2,
    minHeight: 52,
    paddingHorizontal: 14,
    textAlign: 'center',
  },
  full: {
    borderRadius: Radius.lg,
    padding: 12,
  },
  codeCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  code: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 30,
    letterSpacing: 3,
    lineHeight: 38,
  },
  link: {
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  resetRow: {
    alignItems: 'center',
    gap: 2,
  },
});
