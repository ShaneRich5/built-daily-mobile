import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { SheetFrame } from '@/components/ui/sheet';
import { isValidWorkoutTime } from '@/lib/session-edit';
import type { SharedPlanDetails } from '@/services/firestore/group-mappers';
import { SHARED_PLAN_LIMITS, type SharedPlan } from '@/types/group';

/**
 * "Edit plan", for whoever made it: the time, the place and the note. The day
 * and the workout stay put — people said "I'm in" to those.
 */
export function EditPlanPanel({
  plan,
  onSave,
}: {
  plan: Pick<SharedPlan, 'time' | 'where' | 'note'>;
  /** Resolves to an error to show, or null once saved. */
  onSave: (details: SharedPlanDetails) => Promise<string | null>;
}) {
  const [time, setTime] = useState(plan.time ?? '');
  const [where, setWhere] = useState(plan.where ?? '');
  const [note, setNote] = useState(plan.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeInvalid = time.trim() !== '' && !isValidWorkoutTime(time.trim());

  const save = async () => {
    setBusy(true);
    setError(null);
    const failure = await onSave({ time: time.trim() || null, where, note });
    setBusy(false);
    if (failure) setError(failure);
  };

  return (
    <SheetFrame
      title="Edit plan"
      subtitle="Everyone going sees the change."
      footer={
        <Button
          label="Save"
          size="lg"
          busy={busy}
          disabled={timeInvalid}
          onPress={() => void save()}
        />
      }>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <FormField
          label="Time (24-hour, leave empty for anytime)"
          value={time}
          onChangeText={setTime}
          placeholder="Anytime"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          error={timeInvalid ? 'Use HH:MM, like 07:00 or 18:30.' : null}
        />
        <FormField
          label="Where"
          value={where}
          onChangeText={setWhere}
          maxLength={SHARED_PLAN_LIMITS.where}
        />
        <FormField
          label="Note"
          value={note}
          onChangeText={setNote}
          maxLength={SHARED_PLAN_LIMITS.note}
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
  body: {
    gap: 12,
    paddingBottom: 8,
  },
});
