import { StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type DraftLine, type DraftSet, editableSetFields } from '@/lib/session-edit';

type ExerciseLineEditorProps = {
  line: DraftLine;
  note: string;
  onChangeLine: (line: DraftLine) => void;
  onChangeNote: (note: string) => void;
  onRemove: () => void;
  disabled: boolean;
};

/** One exercise: its name, its note, and the sets under it. */
export function ExerciseLineEditor({
  line,
  note,
  onChangeLine,
  onChangeNote,
  onRemove,
  disabled,
}: ExerciseLineEditorProps) {
  const fields = editableSetFields(line.metric);

  const updateSet = (index: number, patch: Partial<DraftSet>) => {
    onChangeLine({
      ...line,
      sets: line.sets.map((set, i) => (i === index ? { ...set, ...patch } : set)),
    });
  };

  const addSet = () => {
    // A new set copies the one before it, since sets in a row usually repeat.
    const last = line.sets[line.sets.length - 1];
    const blank: DraftSet = last
      ? { ...last }
      : {
          original: {
            weight: null,
            reps: null,
            durationSec: null,
            timedSetSec: null,
            paceMph: null,
            inclinePercent: null,
            resistanceLevel: null,
            distanceMiles: null,
            note: null,
          },
          weight: '',
          reps: '',
          durationSec: '',
          distanceMiles: '',
        };

    onChangeLine({ ...line, sets: [...line.sets, blank] });
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

      <FormField
        label="Note"
        value={note}
        onChangeText={onChangeNote}
        placeholder="Anything worth remembering"
        editable={!disabled}
      />

      <ThemedText type="small" themeColor="textSecondary">
        Sets
      </ThemedText>

      {line.sets.map((set, index) => (
        // Sets have no id of their own; their position is the identity, and the
        // list is only ever appended to or filtered.
        <View key={index} style={styles.setRow}>
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
