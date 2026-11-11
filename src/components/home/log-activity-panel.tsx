import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { cleanNumberInput } from '@/components/session/set-inputs';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Trash2Icon } from '@/components/ui/icons';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetFrame } from '@/components/ui/sheet';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ACTIVITY_CATALOG, findActivityType } from '@/lib/activity-catalog';
import { dateFromKey } from '@/lib/date-keys';
import { isValidWorkoutTime } from '@/lib/session-edit';
import { confirm } from '@/services/confirm';
import { type Activity, ACTIVITY_NOTE_LIMIT, type NewActivity } from '@/types/activity';

type LogActivityPanelProps = {
  todayKey: string;
  /** An activity already logged: the panel edits it instead of logging a new one. */
  activity?: Activity;
  /** Resolves to whether it was saved; the panel stays open, with its input, when not. */
  onSave: (activity: NewActivity) => Promise<boolean>;
  /** Editing only. Resolves to whether it was deleted. */
  onDelete?: () => Promise<boolean>;
};

function numberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

const asText = (value: number | null) => (value === null ? '' : String(value));

/**
 * Logging a walk, a ride, a game: anything that is not a workout but still
 * counts as showing up. Pick what it was, when, and optionally how long and
 * how far. Given an `activity`, the same form edits it, and can delete it.
 */
export function LogActivityPanel({ todayKey, activity, onSave, onDelete }: LogActivityPanelProps) {
  const theme = useTheme();
  const editing = activity !== undefined;
  const [typeId, setTypeId] = useState<string | null>(activity?.activityTypeId ?? null);
  const [date, setDate] = useState(activity?.activityDate ?? todayKey);
  const [time, setTime] = useState(activity?.activityTime ?? '');
  const [duration, setDuration] = useState(asText(activity?.durationMin ?? null));
  const [distance, setDistance] = useState(asText(activity?.distanceMiles ?? null));
  const [notes, setNotes] = useState(activity?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = typeId ? findActivityType(typeId) : undefined;
  const dateInvalid = !dateFromKey(date.trim());
  const timeInvalid = time.trim() !== '' && !isValidWorkoutTime(time.trim());
  const canSave = Boolean(type) && !dateInvalid && !timeInvalid && !saving && !deleting;

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
      // Not on the form yet; an edit keeps what was there.
      locationName: activity?.locationName ?? null,
      notes: notes.trim() || null,
    });

    setSaving(false);
    if (!saved) {
      setError(
        editing
          ? 'Could not save that. Check your connection and try again.'
          : 'Could not log that. Check your connection and try again.',
      );
    }
  };

  const remove = async () => {
    if (!onDelete || saving || deleting) return;

    const ok = await confirm({
      title: 'Delete this activity?',
      message: 'It comes off your history and charts. This can’t be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    setError(null);
    const deleted = await onDelete();
    setDeleting(false);
    if (!deleted) setError('Could not delete that. Check your connection and try again.');
  };

  const saveLabel = editing
    ? 'Save changes'
    : type
      ? `Log ${type.name.toLowerCase()}`
      : 'Pick what you did';

  return (
    <SheetFrame
      fill
      title={editing ? 'Edit activity' : 'Log activity'}
      subtitle={editing ? undefined : 'A walk, a ride, a game: it all counts as showing up.'}
      footer={
        <View style={styles.footer}>
          {editing && onDelete ? (
            <Button
              label="Delete"
              icon={Trash2Icon}
              variant="danger"
              size="lg"
              onPress={() => void remove()}
              disabled={saving}
              busy={deleting}
            />
          ) : null}
          <Button
            label={saveLabel}
            variant="dark"
            size="lg"
            onPress={() => void save()}
            disabled={!canSave}
            busy={saving}
            style={styles.flex}
          />
        </View>
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
          <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
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
  footer: {
    flexDirection: 'row',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  notes: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
