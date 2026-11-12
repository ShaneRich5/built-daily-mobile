import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { SetFieldInput } from '@/components/session/set-inputs';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
  ArrowDownUpIcon,
  ArrowLeftRightIcon,
  CheckIcon,
  CircleDashedIcon,
  CircleDotIcon,
  CopyIcon,
  type LucideIcon,
  NotebookTextIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from '@/components/ui/icons';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetFrame } from '@/components/ui/sheet';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ExercisePerformance } from '@/lib/exercise-history';
import { exerciseMeta } from '@/lib/session/exercise-search';
import { dayLabel, sessionDayLabel } from '@/lib/session-format';
import { summarizeSetLogs, type SessionExercise } from '@/lib/session/session-model';
import {
  extraFieldsForMetric,
  NOTE_MAX,
  quickFieldsForMetric,
  suggestionForSet,
  type SetRow,
} from '@/lib/session/set-row';

type ExerciseDetailsPanelProps = {
  item: SessionExercise;
  /** Where it sits in its section: "3 of 4". */
  position: number;
  total: number;
  /** Past performances, newest first. */
  history: readonly ExercisePerformance[];
  historyLoading: boolean;
  onUpdateSet: (setIndex: number, patch: Partial<SetRow>) => void;
  onAddSet: () => void;
  onCopyLastSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onUseHistory: (performance: ExercisePerformance) => void;
  onNoteChange: (note: string) => void;
  /** Machine taken: pick an alternate or something similar. */
  onSwapExercise: () => void;
  onMoveExercise: () => void;
  /** Flip between plan and maybe. */
  onToggleSection: () => void;
  onRemoveExercise: () => void;
  onDone: () => void;
};

/** How many past sessions to list. */
const HISTORY_LIMIT = 5;

/** Everything for one exercise: all set fields, notes, history, and swap/move/remove. */
export function ExerciseDetailsPanel({
  item,
  position,
  total,
  history,
  historyLoading,
  onUpdateSet,
  onAddSet,
  onCopyLastSet,
  onRemoveSet,
  onUseHistory,
  onNoteChange,
  onSwapExercise,
  onMoveExercise,
  onToggleSection,
  onRemoveExercise,
  onDone,
}: ExerciseDetailsPanelProps) {
  const theme = useTheme();
  const { exercise, sets } = item;
  // Set notes are tucked away until asked for; a set that has one shows it.
  const [notesOpen, setNotesOpen] = useState<ReadonlySet<number>>(() => new Set());

  const fields = quickFieldsForMetric(exercise.metric);
  const extraFields = extraFieldsForMetric(exercise.metric);
  const lastTimeSets = history[0]?.sets;

  const toggleNote = (setIndex: number) =>
    setNotesOpen((current) => {
      const next = new Set(current);
      if (next.has(setIndex)) next.delete(setIndex);
      else next.add(setIndex);
      return next;
    });

  return (
    <SheetFrame
      fill
      title={exercise.name}
      subtitle={`${exerciseMeta(exercise)} · ${position} of ${total}`}
      footer={<Button label="Done" variant="dark" size="lg" onPress={onDone} />}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.tiles}>
          <ActionTile icon={ArrowLeftRightIcon} label="Swap" onPress={onSwapExercise} />
          <ActionTile
            icon={ArrowDownUpIcon}
            label="Move…"
            onPress={onMoveExercise}
            disabled={total < 2}
          />
          <ActionTile
            icon={item.section === 'maybe' ? CircleDotIcon : CircleDashedIcon}
            label={item.section === 'maybe' ? 'To plan' : 'To maybe'}
            onPress={onToggleSection}
          />
          <ActionTile icon={Trash2Icon} label="Remove" onPress={onRemoveExercise} destructive />
        </View>

        <View style={styles.section}>
          <SectionLabel>Sets</SectionLabel>

          {sets.map((set, setIndex) => {
            const setNumber = setIndex + 1;
            const suggestion = suggestionForSet(sets, setIndex, lastTimeSets);
            const noteVisible = notesOpen.has(setIndex) || set.note.trim() !== '';

            return (
              // Sets have no id of their own; their position is the identity.
              <View
                key={setIndex}
                style={[
                  styles.set,
                  { backgroundColor: theme.background, borderColor: theme.borderSubtle },
                ]}>
                <View style={styles.setRow}>
                  <View
                    style={styles.setNumber}
                    accessible
                    accessibilityLabel={set.done ? `Set ${setNumber}, done` : `Set ${setNumber}`}>
                    {set.done ? (
                      <CheckIcon size={14} color={theme.tint} strokeWidth={3} />
                    ) : (
                      <ThemedText type="monoSmall" themeColor="textSecondary">
                        {setNumber}
                      </ThemedText>
                    )}
                  </View>
                  {fields.map((spec) => (
                    <SetFieldInput
                      key={spec.id}
                      spec={spec}
                      set={set}
                      setNumber={setNumber}
                      suggestion={set.done ? null : suggestion}
                      onChange={(patch) => onUpdateSet(setIndex, patch)}
                      showUnit
                    />
                  ))}
                  <IconButton
                    icon={NotebookTextIcon}
                    accessibilityLabel={`Add a note to set ${setNumber}`}
                    variant="plain"
                    // Dark once there is a note to read, grey while there is not.
                    muted={set.note.trim() === ''}
                    size={36}
                    onPress={() => toggleNote(setIndex)}
                  />
                  <IconButton
                    icon={XIcon}
                    accessibilityLabel={`Remove set ${setNumber}`}
                    variant="plain"
                    muted
                    size={36}
                    onPress={() => onRemoveSet(setIndex)}
                  />
                </View>

                {extraFields.length > 0 ? (
                  <View style={styles.setRow}>
                    <View style={styles.setNumber} />
                    {extraFields.map((spec) => (
                      <SetFieldInput
                        key={spec.id}
                        spec={spec}
                        set={set}
                        setNumber={setNumber}
                        suggestion={null}
                        onChange={(patch) => onUpdateSet(setIndex, patch)}
                      />
                    ))}
                  </View>
                ) : null}

                {noteVisible ? (
                  <TextInput
                    accessibilityLabel={`Note for set ${setNumber}`}
                    value={set.note}
                    onChangeText={(note) => onUpdateSet(setIndex, { note })}
                    maxLength={NOTE_MAX.set}
                    placeholder="One-off detail for this set…"
                    placeholderTextColor={theme.textFaint}
                    style={[
                      styles.setNote,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                  />
                ) : null}
              </View>
            );
          })}

          <View style={styles.setActions}>
            <Button
              label="Add set"
              icon={PlusIcon}
              variant="secondary"
              onPress={onAddSet}
              style={styles.flex}
            />
            <Button
              label="Copy last set"
              icon={CopyIcon}
              variant="secondary"
              onPress={onCopyLastSet}
              style={styles.flex}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel>Previous sessions</SectionLabel>

          {historyLoading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Checking previous workouts…
            </ThemedText>
          ) : history.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No previous sessions yet. Next time, your sets from today show up here.
            </ThemedText>
          ) : (
            history.slice(0, HISTORY_LIMIT).map((performance, index) => (
              <View
                // The same workout can hold an exercise twice, so the session
                // id alone is not unique.
                key={`${performance.sessionId}-${index}`}
                style={[styles.history, { borderBottomColor: theme.borderSubtle }]}>
                <View style={styles.historyText}>
                  <ThemedText type="label">{historyDate(performance)}</ThemedText>
                  <ThemedText type="monoSmall" themeColor="textMuted">
                    {summarizeSetLogs(performance.sets) || 'No sets recorded'}
                  </ThemedText>
                </View>
                <Button
                  label="Use these"
                  accessibilityLabel={`Use the sets from ${historyDate(performance)}`}
                  variant="secondary"
                  size="sm"
                  onPress={() => onUseHistory(performance)}
                />
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel>Exercise note</SectionLabel>
          <TextInput
            accessibilityLabel={`Note for ${exercise.name}`}
            value={item.note}
            onChangeText={onNoteChange}
            maxLength={NOTE_MAX.exercise}
            multiline
            placeholder="Equipment swaps, pain/limitations, cues for this lift…"
            placeholderTextColor={theme.textFaint}
            style={[
              styles.note,
              { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
            ]}
          />
        </View>
      </ScrollView>
    </SheetFrame>
  );
}

/** The day a past performance happened: the day it was filed under, if any. */
function historyDate(performance: ExercisePerformance): string {
  return performance.workoutDate
    ? sessionDayLabel({
        workoutDate: performance.workoutDate,
        endedAt: performance.performedAt,
        startedAt: performance.performedAt,
      })
    : dayLabel(performance.performedAt);
}

function ActionTile({
  icon: Icon,
  label,
  onPress,
  disabled = false,
  destructive = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const theme = useTheme();
  const color = destructive ? theme.danger : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Icon size={18} color={color} strokeWidth={2} />
      <ThemedText type="caption" style={{ color, fontFamily: FontFamily.medium }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 16,
  },
  tiles: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    height: 60,
    justifyContent: 'center',
  },
  section: {
    gap: 8,
  },
  set: {
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
    padding: 8,
  },
  setRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  setNumber: {
    alignItems: 'center',
    width: 24,
  },
  setNote: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    fontFamily: FontFamily.regular,
    fontSize: 16,
    height: 44,
    marginLeft: 30,
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  setActions: {
    flexDirection: 'row',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  history: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingVertical: 6,
  },
  historyText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  note: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontFamily: FontFamily.regular,
    fontSize: 16,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
