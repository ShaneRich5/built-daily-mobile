import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MuscleChart } from '@/components/muscle-chart';
import { type MenuAction, MenuPanel } from '@/components/session/panels/list-panels';
import { SessionActionBar } from '@/components/session/session-action-bar';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  PencilLineIcon,
  PersonStandingIcon,
  PlayIcon,
  Trash2Icon,
} from '@/components/ui/icons';
import { Pill } from '@/components/ui/pill';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetHost } from '@/components/ui/sheet';
import { StatTile } from '@/components/ui/stat-tile';
import { MaxContentWidth, Radius } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { useTheme } from '@/hooks/use-theme';
import { applyStatusTransition } from '@/lib/session-edit';
import { sessionDayLabel } from '@/lib/session-format';
import {
  musclesWorkedLabel,
  setChips,
  summaryStats,
  timeLabel,
} from '@/lib/session/session-summary';
import { confirm } from '@/services/confirm';
import { deleteSession, updateSession } from '@/services/firestore/workout-repository';
import type { SessionLine, WorkoutSession } from '@/types/workout';

/**
 * A finished workout, read first: a calm summary — what it was, a few figures,
 * the muscles it worked, and each exercise's sets. Editing is one tap away and
 * happens on the workout screen, not here.
 */
export function SavedWorkoutScreen({ session }: { session: WorkoutSession }) {
  const theme = useTheme();
  const { user } = useSession();
  const uid = user?.uid;

  const [menuOpen, setMenuOpen] = useState(false);
  const [musclesOpen, setMusclesOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const muscles = musclesWorkedLabel(session.lines);
  const when = [sessionDayLabel(session), session.workoutTime ? timeLabel(session.workoutTime) : null]
    .filter(Boolean)
    .join(' · ');

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  /** Back to logging: the route shows the workout screen once the status flips. */
  const reopen = async () => {
    setMenuOpen(false);
    if (!uid) return;

    setError(null);
    try {
      await updateSession(uid, session.id, applyStatusTransition(session, 'in_progress'));
    } catch {
      setError('Could not reopen this workout. Check your connection and try again.');
    }
  };

  const remove = async () => {
    setMenuOpen(false);
    if (!uid) return;

    const ok = await confirm({
      title: 'Delete this workout?',
      message: 'It is removed permanently and cannot be brought back.',
      confirmLabel: 'Delete workout',
      destructive: true,
    });
    if (!ok) return;

    setError(null);
    try {
      await deleteSession(uid, session.id);
      router.replace('/');
    } catch {
      setError('Could not delete this workout. Check your connection and try again.');
    }
  };

  const menuActions: MenuAction[] = [
    { label: 'Move back to in progress', icon: PlayIcon, onPress: () => void reopen() },
    { label: 'Delete workout', icon: Trash2Icon, destructive: true, onPress: () => void remove() },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon={ArrowLeftIcon}
            accessibilityLabel="Back"
            variant="plain"
            onPress={leave}
            style={styles.back}
          />
          <Pill label="Finished" tone="success" icon={CheckIcon} />
        </View>

        <View style={styles.summary}>
          <View style={styles.titles}>
            <ThemedText type="title" accessibilityRole="header">
              {session.title || 'Untitled workout'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {when}
            </ThemedText>
          </View>

          {session.lines.length > 0 ? (
            <View style={styles.stats}>
              {summaryStats(session).map((stat) => (
                <StatTile key={stat.label} value={stat.value} label={stat.label} />
              ))}
            </View>
          ) : null}

          {session.workoutNote ? (
            <Card style={styles.note}>
              <ThemedText type="small" themeColor="textBody">
                {session.workoutNote}
              </ThemedText>
            </Card>
          ) : null}

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
        </View>

        {muscles ? (
          <View style={styles.section}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: musclesOpen }}
              accessibilityLabel={`Muscles worked, ${muscles}`}
              onPress={() => setMusclesOpen((open) => !open)}
              style={({ pressed }) => [
                styles.muscles,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.musclesIcon, { backgroundColor: theme.inverse }]}>
                <PersonStandingIcon size={18} color={theme.onInverse} strokeWidth={2} />
              </View>
              <View style={styles.text}>
                <ThemedText type="label">Muscles worked</ThemedText>
                <ThemedText type="caption" numberOfLines={1}>
                  {muscles}
                </ThemedText>
              </View>
              <View style={musclesOpen && styles.flipped}>
                <ChevronDownIcon size={16} color={theme.textFaint} strokeWidth={2} />
              </View>
            </Pressable>

            {/* The row above already says "Muscles worked". */}
            {musclesOpen ? <MuscleChart lines={session.lines} title="Tap a muscle to name it" /> : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionLabel>Exercises</SectionLabel>

          {session.lines.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Logged without details — you still showed up.
            </ThemedText>
          ) : (
            session.lines.map((line) => (
              <ExerciseSummaryCard
                key={line.lineId}
                line={line}
                note={session.exerciseNotesByLineId?.[line.lineId] ?? null}
              />
            ))
          )}
        </View>
      </ScrollView>

      <SessionActionBar
        primaryLabel="Edit workout"
        primaryIcon={PencilLineIcon}
        primaryVariant="dark"
        onPrimary={() => router.push(`/session/${session.id}/edit`)}
        onMore={() => setMenuOpen(true)}
      />

      <SheetHost visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <MenuPanel title="Workout" actions={menuActions} />
      </SheetHost>
    </SafeAreaView>
  );
}

/** One exercise as it was done: its name, each logged set as a chip, and its note. */
function ExerciseSummaryCard({ line, note }: { line: SessionLine; note: string | null }) {
  const theme = useTheme();
  const chips = setChips(line);

  return (
    <Card style={styles.exercise}>
      <ThemedText type="labelStrong">{line.nameSnapshot || 'Unnamed exercise'}</ThemedText>

      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <View
              key={chip.number}
              accessible
              accessibilityLabel={`Set ${chip.number}: ${chip.text}${chip.note ? `. ${chip.note}` : ''}`}
              style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="monoSmall" themeColor="textFaint">
                {chip.number}
              </ThemedText>
              <ThemedText type="monoSmall">{chip.text}</ThemedText>
            </View>
          ))}
        </View>
      ) : (
        <ThemedText type="caption">No sets logged</ThemedText>
      )}

      {chips
        .filter((chip) => chip.note)
        .map((chip) => (
          <ThemedText key={chip.number} type="caption">
            Set {chip.number}: {chip.note}
          </ThemedText>
        ))}

      {note ? (
        <ThemedText type="small" themeColor="textMuted">
          {note}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    gap: 16,
    maxWidth: MaxContentWidth,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  back: {
    marginLeft: -10,
  },
  summary: {
    gap: 12,
  },
  titles: {
    gap: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  note: {
    paddingVertical: 10,
  },
  section: {
    gap: 8,
  },
  muscles: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  musclesIcon: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  text: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  flipped: {
    transform: [{ rotate: '180deg' }],
  },
  exercise: {
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    flexDirection: 'row',
    gap: 6,
    height: 30,
    paddingHorizontal: 10,
  },
  pressed: {
    opacity: 0.7,
  },
});
