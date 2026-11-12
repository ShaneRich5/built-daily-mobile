import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { cleanNumberInput } from '@/components/session/set-inputs';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetFrame } from '@/components/ui/sheet';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ACTIVITY_CATALOG, findActivityType } from '@/lib/activity-catalog';
import { dateFromKey } from '@/lib/date-keys';
import { isValidWorkoutTime } from '@/lib/session-edit';
import { ACTIVITY_NOTE_LIMIT, type NewActivity } from '@/types/activity';

type LogActivityPanelProps = {
  todayKey: string;
  /** Resolves to whether it was saved; the panel stays open, with its input, when not. */
  onSave: (activity: NewActivity) => Promise<boolean>;
};

function numberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Logging a walk, a ride, a game: anything that is not a workout but still
 * counts as showing up. Pick what it was, when, and optionally how long and
 * how far.
 */
export function LogActivityPanel({ todayKey, onSave }: LogActivityPanelProps) {
  const theme = useTheme();
  const [typeId, setTypeId] = useState<string | null>(null);
  const [date, setDate] = useState(todayKey);
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = typeId ? findActivityType(typeId) : undefined;
  const dateInvalid = !dateFromKey(date.trim());
  const timeInvalid = time.trim() !== '' && !isValidWorkoutTime(time.trim());
  const canSave = Boolean(type) && !dateInvalid && !timeInvalid && !saving;

  const save = async () => {
    if (!type || !canSave) return;

    setSaving(true);
    setError(null);

    const saved = await onSave({
      activityTypeId: type.id,
      activityDate: date.trim(),
      activityTime: time.trim() || null,
      durationMin: numberOrNull(duration),
      distanceMiles: type.supportsDistance ? numberOrNull(distance) : null,
      locationName: null,
      notes: notes.trim() || null,
    });

    setSaving(false);
    if (!saved) setError('Could not log that. Check your connection and try again.');
  };

  return (
    <SheetFrame
      fill
      title="Log activity"
      subtitle="A walk, a ride, a game: it all counts as showing up."
      footer={
        <Button
          label={type ? `Log ${type.name.toLowerCase()}` : 'Pick what you did'}
          variant="dark"
          size="lg"
          onPress={() => void save()}
          disabled={!canSave}
          busy={saving}
        />
      }>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <SectionLabel>What</SectionLabel>
          <View style={styles.types}>
            {ACTIVITY_CATALOG.map((candidate) => {
              const selected = candidate.id === typeId;

              return (
                <Pressable
                  key={candidate.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  hitSlop={{ top: 6, bottom: 6 }}
                  onPress={() => setTypeId(candidate.id)}
                  style={[
                    styles.type,
                    selected
                      ? { backgroundColor: theme.inverse, borderColor: theme.inverse }
                      : { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}>
                  <ThemedText
                    type="link"
                    style={{ color: selected ? theme.onInverse : theme.textBody }}>
                    {candidate.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flex}>
            <FormField
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              error={dateInvalid ? 'Use the form 2026-11-10.' : null}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={styles.flex}>
            <FormField
              label="Time (optional)"
              value={time}
              onChangeText={setTime}
              placeholder="HH:mm"
              error={timeInvalid ? 'Use 24-hour 07:30.' : null}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flex}>
            <FormField
              label="Minutes"
              value={duration}
              onChangeText={(value) => setDuration(cleanNumberInput(value, false))}
              placeholder="e.g. 30"
              keyboardType="number-pad"
            />
          </View>
          {type?.supportsDistance ?? true ? (
            <View style={styles.flex}>
              <FormField
                label="Miles"
                value={distance}
                onChangeText={(value) => setDistance(cleanNumberInput(value, true))}
                placeholder="e.g. 2.5"
                keyboardType="decimal-pad"
                editable={type?.supportsDistance ?? true}
              />
            </View>
          ) : null}
        </View>

        <FormField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Felt good, played with friends…"
          maxLength={ACTIVITY_NOTE_LIMIT}
          multiline
          style={styles.notes}
        />

        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}
      </ScrollView>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 16,
  },
  section: {
    gap: 8,
  },
  types: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  type: {
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  notes: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
