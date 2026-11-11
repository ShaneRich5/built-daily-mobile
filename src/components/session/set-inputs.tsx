import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { CheckIcon, XIcon } from '@/components/ui/icons';
import { FontFamily, MinTouchTarget, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SetFieldSpec, SetRow } from '@/lib/session/set-row';

/**
 * What a number box will accept: digits and, for a decimal field, one point.
 * A comma is read as the point — the decimal key on many keyboards types one.
 */
export function cleanNumberInput(raw: string, decimal: boolean): string {
  const digits = raw.replace(/,/g, '.').replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '');
  const [whole, ...rest] = digits.split('.');

  return rest.length > 0 ? `${whole}.${rest.join('')}` : whole;
}

type SetFieldInputProps = {
  spec: SetFieldSpec;
  set: SetRow;
  setNumber: number;
  /** Shown greyed out while the box is empty: "same as last time". */
  suggestion: SetRow | null;
  onChange: (patch: Partial<SetRow>) => void;
  /** Draws the unit inside the box, where there is no column header to say it. */
  showUnit?: boolean;
};

/** One number box in a set row. */
export function SetFieldInput({
  spec,
  set,
  setNumber,
  suggestion,
  onChange,
  showUnit = false,
}: SetFieldInputProps) {
  const theme = useTheme();
  const suggested = suggestion ? spec.read(suggestion) : '';

  return (
    <View style={styles.field}>
      <TextInput
        accessibilityLabel={spec.accessibilityLabel(setNumber)}
        keyboardType={spec.decimal ? 'decimal-pad' : 'number-pad'}
        // Tapping a filled box selects it, so typing replaces rather than appends.
        selectTextOnFocus
        value={spec.read(set)}
        placeholder={suggested || (showUnit ? '' : spec.label)}
        placeholderTextColor={theme.textFaint}
        onChangeText={(value) => onChange(spec.write(set, cleanNumberInput(value, spec.decimal)))}
        style={[
          styles.input,
          { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
          showUnit && styles.withUnit,
        ]}
      />
      {showUnit ? (
        <ThemedText type="caption" style={styles.unit} accessibilityElementsHidden>
          {spec.label}
        </ThemedText>
      ) : null}
    </View>
  );
}

type SetDoneButtonProps = {
  done: boolean;
  setNumber: number;
  onToggle: () => void;
};

/** The tick at the end of a set row. */
export function SetDoneButton({ done, setNumber, onToggle }: SetDoneButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`Set ${setNumber} done`}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.done,
        done
          ? { backgroundColor: theme.tint, borderColor: theme.tint }
          : { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <CheckIcon size={16} color={done ? theme.onTint : theme.textFaint} strokeWidth={2.5} />
    </Pressable>
  );
}

type QuickSetRowProps = {
  setNumber: number;
  set: SetRow;
  fields: readonly SetFieldSpec[];
  suggestion: SetRow | null;
  onChange: (patch: Partial<SetRow>) => void;
  onToggleDone: () => void;
  /**
   * Given, the row ends in a remove button instead of the tick — a finished
   * workout has nothing left to tick off, but a mistyped set still has to go.
   */
  onRemove?: () => void;
};

/** A set on the quick card: number, boxes, and a tick (or a remove button). */
export function QuickSetRow({
  setNumber,
  set,
  fields,
  suggestion,
  onChange,
  onToggleDone,
  onRemove,
}: QuickSetRowProps) {
  return (
    <View style={styles.row}>
      <ThemedText type="monoSmall" themeColor="textSecondary" style={styles.number}>
        {setNumber}
      </ThemedText>
      {fields.map((spec) => (
        <SetFieldInput
          key={spec.id}
          spec={spec}
          set={set}
          setNumber={setNumber}
          // A ticked set shows what it holds, not what it might have held.
          suggestion={set.done || onRemove ? null : suggestion}
          onChange={onChange}
        />
      ))}
      {onRemove ? (
        <IconButton icon={XIcon} accessibilityLabel={`Remove set ${setNumber}`} onPress={onRemove} />
      ) : (
        <SetDoneButton done={set.done} setNumber={setNumber} onToggle={onToggleDone} />
      )}
    </View>
  );
}

/** The header over the quick card's rows, in the same columns as `QuickSetRow`. */
export function SetColumnHeader({ fields }: { fields: readonly SetFieldSpec[] }) {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <ThemedText style={[styles.column, styles.number]} themeColor="textSecondary">
        Set
      </ThemedText>
      {fields.map((spec) => (
        <ThemedText key={spec.id} style={[styles.column, styles.field]} themeColor="textSecondary">
          {spec.label}
        </ThemedText>
      ))}
      <View style={styles.doneSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  number: {
    width: 24,
  },
  column: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 0.44,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  field: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    fontFamily: FontFamily.mono,
    // 16, not the 15 the canvas draws: iOS zooms the page into any input
    // smaller than that on web, and the difference is not visible on a phone.
    fontSize: 16,
    height: MinTouchTarget,
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  withUnit: {
    paddingRight: 40,
  },
  unit: {
    position: 'absolute',
    right: 10,
    top: 14,
  },
  done: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    height: MinTouchTarget,
    justifyContent: 'center',
    width: MinTouchTarget,
  },
  doneSpacer: {
    width: MinTouchTarget,
  },
  pressed: {
    opacity: 0.7,
  },
});
