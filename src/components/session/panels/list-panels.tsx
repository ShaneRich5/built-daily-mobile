import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionRow, type ActionRowProps } from '@/components/ui/action-row';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpToLineIcon,
  SearchIcon,
} from '@/components/ui/icons';
import { Pill } from '@/components/ui/pill';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetFrame } from '@/components/ui/sheet';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type CatalogExercise, exerciseGroup, muscleGroupLabel } from '@/lib/exercise-catalog';
import { exerciseMeta, similarExercises } from '@/lib/session/exercise-search';
import {
  exerciseProgress,
  summarizeSetRows,
  type SessionExercise,
} from '@/lib/session/session-model';

// The short, list-shaped sheets of the workout screen. Each is a `SheetFrame`
// to put inside the screen's one `SheetHost`.

export type MenuAction = Pick<ActionRowProps, 'label' | 'icon' | 'destructive' | 'disabled'> & {
  onPress: () => void;
};

/** The "More actions" menu: a short list of things to do with this workout. */
export function MenuPanel({ title, actions }: { title: string; actions: readonly MenuAction[] }) {
  return (
    <SheetFrame title={title} flush>
      <View style={styles.rows}>
        {actions.map((action) => (
          <ActionRow key={action.label} {...action} />
        ))}
      </View>
    </SheetFrame>
  );
}

type MoveExercisePanelProps = {
  /** The exercises of one section, in order, including the one being moved. */
  exercises: readonly SessionExercise[];
  lineId: string;
  /** `toIndex` is a slot among the *other* exercises in the section. */
  onMove: (lineId: string, toIndex: number) => void;
  onCancel: () => void;
};

/** One tap to put an exercise anywhere: "Move to the top" or "After …". */
export function MoveExercisePanel({ exercises, lineId, onMove, onCancel }: MoveExercisePanelProps) {
  const from = exercises.findIndex((item) => item.lineId === lineId);
  const moving = exercises[from];

  if (!moving) return null;

  // Slots are positions in the list without the moving exercise.
  const others = exercises.filter((item) => item.lineId !== lineId);
  const hereNow = <Pill label="Here now" style={styles.pill} />;

  return (
    <SheetFrame
      flush
      title={`Move ${moving.exercise.name}`}
      subtitle={`Currently ${from + 1} of ${exercises.length} · pick where it goes`}
      footer={<Button label="Cancel" variant="secondary" size="lg" onPress={onCancel} />}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.rows}>
        <ActionRow
          label="Move to the top"
          icon={ArrowUpToLineIcon}
          disabled={from === 0}
          trailing={from === 0 ? hereNow : undefined}
          onPress={() => onMove(lineId, 0)}
        />
        {others.map((item, index) => {
          const toIndex = index + 1;
          const current = toIndex === from;

          return (
            <ActionRow
              key={item.lineId}
              label={`After ${item.exercise.name}`}
              disabled={current}
              leading={
                <ThemedText type="monoSmall" themeColor="textFaint" style={styles.position}>
                  {index + 1}
                </ThemedText>
              }
              trailing={current ? hereNow : undefined}
              onPress={() => onMove(lineId, toIndex)}
            />
          );
        })}
      </ScrollView>
    </SheetFrame>
  );
}

type ReorderPanelProps = {
  /** The exercises of one section, in order. */
  exercises: readonly SessionExercise[];
  onMove: (lineId: string, toIndex: number) => void;
  onDone: () => void;
};

/**
 * The whole list on one screen, one line each, with arrows to nudge an
 * exercise up or down. Each move is applied as it is made.
 */
export function ReorderPanel({ exercises, onMove, onDone }: ReorderPanelProps) {
  const theme = useTheme();

  return (
    <SheetFrame
      fill
      title="Reorder exercises"
      subtitle="Use the arrows. Saves as you go."
      footer={<Button label="Done" variant="dark" size="lg" onPress={onDone} />}>
      <ScrollView contentContainerStyle={styles.reorder}>
        {exercises.map((item, index) => {
          const progress = exerciseProgress(item.sets);
          const logged = summarizeSetRows(item.sets, item.exercise.metric);

          return (
            <View
              key={item.lineId}
              style={[
                styles.reorderRow,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <ThemedText type="monoSmall" themeColor="textFaint" style={styles.position}>
                {index + 1}
              </ThemedText>
              <View style={styles.text}>
                <ThemedText type="label" numberOfLines={1}>
                  {item.exercise.name}
                </ThemedText>
                <ThemedText type="caption" numberOfLines={1}>
                  {progress === 'not_started' ? 'Not started' : logged || 'Started'}
                </ThemedText>
              </View>
              <IconButton
                icon={ArrowUpIcon}
                accessibilityLabel={`Move ${item.exercise.name} up`}
                variant="plain"
                size={40}
                disabled={index === 0}
                // Slots are counted among the others: one up is the slot before.
                onPress={() => onMove(item.lineId, index - 1)}
              />
              <IconButton
                icon={ArrowDownIcon}
                accessibilityLabel={`Move ${item.exercise.name} down`}
                variant="plain"
                size={40}
                disabled={index === exercises.length - 1}
                onPress={() => onMove(item.lineId, index + 1)}
              />
            </View>
          );
        })}
      </ScrollView>
    </SheetFrame>
  );
}

type SwapExercisePanelProps = {
  item: SessionExercise;
  onSwap: (exercise: CatalogExercise) => void;
  onSearchAll: () => void;
  onKeep: () => void;
};

/** Machine taken? Pick what fills this slot. The current one becomes an alternate. */
export function SwapExercisePanel({ item, onSwap, onSearchAll, onKeep }: SwapExercisePanelProps) {
  const similar = similarExercises(item.exercise, item.alternates);
  const group = exerciseGroup(item.exercise);

  const list = (exercises: readonly CatalogExercise[]) =>
    exercises.map((exercise) => (
      <ActionRow
        key={exercise.id}
        label={exercise.name}
        detail={exerciseMeta(exercise)}
        accessibilityLabel={`Use ${exercise.name}`}
        trailing={<ThemedText type="link">Use</ThemedText>}
        onPress={() => onSwap(exercise)}
      />
    ));

  return (
    <SheetFrame
      flush
      title={`Swap ${item.exercise.name}`}
      subtitle="Machine taken? Sets you log go to whatever you pick."
      footer={
        <Button
          label={`Keep ${item.exercise.name}`}
          variant="secondary"
          size="lg"
          onPress={onKeep}
        />
      }>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.rows}>
        <ActionRow label="Search any exercise" icon={SearchIcon} onPress={onSearchAll} />

        {item.alternates.length > 0 ? (
          <>
            <SectionLabel style={styles.label}>Your alternates for this slot</SectionLabel>
            {list(item.alternates)}
          </>
        ) : null}

        {similar.length > 0 ? (
          <>
            <SectionLabel style={styles.label}>{`Similar · ${muscleGroupLabel(group)}`}</SectionLabel>
            {list(similar)}
          </>
        ) : null}
      </ScrollView>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  rows: {
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  // A `content` sheet sizes to its body; a long list still has to stop somewhere.
  scroll: {
    maxHeight: 420,
  },
  position: {
    textAlign: 'center',
    width: 18,
  },
  pill: {
    alignSelf: 'center',
  },
  label: {
    paddingBottom: 4,
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  reorder: {
    gap: 8,
    paddingBottom: 16,
  },
  reorderRow: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 60,
    paddingLeft: 12,
    paddingRight: 4,
  },
  text: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
});
