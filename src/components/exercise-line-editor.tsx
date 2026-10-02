import { StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { FormField } from '@/components/form-field';
import { NoteField } from '@/components/note-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { startingSetsFrom, type ExercisePerformance } from '@/lib/exercise-history';
import {
  type DraftLine,
  type DraftSet,
  editableSetFields,
  isDraftLineBlank,
  nextDraftSet,
  toDraftSet,
} from '@/lib/session-edit';
import { dayLabel, formatSet } from '@/lib/session-format';

type ExerciseLineEditorProps = {
  line: DraftLine;
  note: string;
  onChangeLine: (line: DraftLine) => void;
  onChangeNote: (note: string) => void;
  onRemove: () => void;
  disabled: boolean;
  /** The last time this exercise was done, when it is in the recent window. */
  history?: ExercisePerformance;
};

/** One exercise: its name, its note, and the sets under it. */
export function ExerciseLineEditor({
  line,
  note,
  onChangeLine,
  onChangeNote,
  onRemove,
  disabled,
  history,
}: ExerciseLineEditorProps) {
  const fields = editableSetFields(line.metric);

  // Only offered where it cannot destroy anything: nothing typed yet, and the
  // exercise measured the same way it was then — a move logged for reps has
  // nothing to hand a line now being timed.
  const canUseHistory =
    history !== undefined && history.metric === line.metric && isDraftLineBlank(line);

  const useLastTime = () => {
    if (!history) return;
    onChangeLine({ ...line, sets: startingSetsFrom(history).map(toDraftSet) });
  };

  const updateSet = (index: number, patch: Partial<DraftSet>) => {
    onChangeLine({
      ...line,
      sets: line.sets.map((set, i) => (i === index ? { ...set, ...patch } : set)),
    });
  };

  const addSet = () => {
    onChangeLine({
      ...line,
      sets: [...line.sets, nextDraftSet(line.sets[line.sets.length - 1])],
    });
  };

  const removeSet = (index: number) => {
    onChangeLine({ ...line, sets: line.sets.filter((_, i) => i !== index) });
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <FormField
        label="Exercise"
        value={line.nameSnapshot}
        onChangeText={(nameSnapshot) => onChangeLine({ ...line, nameSnapshot })}
        placeholder="Unnamed exercise"
        editable={!disabled}
      />

      {history ? (
        <LastTime
          history={history}
          onUse={canUseHistory ? useLastTime : undefined}
          disabled={disabled}
        />
      ) : null}

      <NoteField
        label={`Note for ${line.nameSnapshot || 'this exercise'}`}
        caption="Note"
        value={note}
        onChange={onChangeNote}
        disabled={disabled}
      />

      <ThemedText type="small" themeColor="textSecondary">
        Sets
      </ThemedText>

      {line.sets.map((set, index) => (
        // Sets have no id of their own; their position is the identity, and the
        // list is only ever appended to or filtered.
        <View key={index} style={styles.set}>
          <View style={styles.setRow}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.setIndex}>
              {index + 1}
            </ThemedText>

            {fields.map((field) => (
              <SetNumberInput
                key={field.key}
                label={field.label}
                value={set[field.key]}
                onChangeText={(value) => updateSet(index, { [field.key]: value })}
                disabled={disabled}
              />
            ))}

            <ActionButton
              label="Remove"
              variant="danger"
              onPress={() => removeSet(index)}
              disabled={disabled}
              style={styles.removeSet}
            />
          </View>

          <NoteField
            label={`Note for set ${index + 1}`}
            caption={null}
            value={set.note}
            onChange={(note) => updateSet(index, { note })}
            disabled={disabled}
          />
        </View>
      ))}

      {line.sets.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No sets logged
        </ThemedText>
      ) : null}

      <View style={styles.lineActions}>
        <ActionButton
          label="Add set"
          variant="secondary"
          onPress={addSet}
          disabled={disabled}
          style={styles.flex}
        />
        <ActionButton
          label="Remove exercise"
          variant="danger"
          onPress={onRemove}
          disabled={disabled}
          style={styles.flex}
        />
      </View>
    </ThemedView>
  );
}

/**
 * What this exercise looked like last time, and a way to start from it. The
 * sets are spelled out rather than summarised — "135 lb × 8 · 135 lb × 8 ·
 * 145 lb × 6" is what tells a lifter whether to repeat the weight or add to
 * it, which a single top set would not.
 */
function LastTime({
  history,
  onUse,
  disabled,
}: {
  history: ExercisePerformance;
  onUse?: () => void;
  disabled: boolean;
}) {
  const sets = history.sets.map((set) => formatSet(set, history.metric)).join(' · ');

  return (
    <ThemedView type="backgroundSelected" style={styles.lastTime}>
      <ThemedText type="small" themeColor="textSecondary">
        Last time · {dayLabel(history.performedAt)}
      </ThemedText>
      <ThemedText type="small">{sets}</ThemedText>

      {onUse ? (
        <ActionButton
          label="Start from last time"
          variant="secondary"
          onPress={onUse}
          disabled={disabled}
        />
      ) : null}
    </ThemedView>
  );
}

function SetNumberInput({
  label,
  value,
  onChangeText,
  disabled,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  disabled: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={styles.setField}>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder="—"
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        editable={!disabled}
        style={[styles.setInput, { backgroundColor: theme.background, color: theme.text }]}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  set: {
    gap: Spacing.one,
  },
  lastTime: {
    borderRadius: Spacing.two,
    gap: Spacing.one,
    padding: Spacing.two,
  },
  setRow: {
    alignItems: 'center',
    flexDirection: 'row',
    // Wraps rather than pushing the remove button off a narrow screen.
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  setIndex: {
    minWidth: 16,
  },
  setField: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  setInput: {
    borderRadius: Spacing.two,
    fontSize: 16,
    // A fixed width, not a minimum: inside a row these stretch to fill and
    // crowd out the fields after them.
    width: 72,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  removeSet: {
    marginLeft: 'auto',
    minHeight: 36,
    paddingHorizontal: Spacing.two,
  },
  lineActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
