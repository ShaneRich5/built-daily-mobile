import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { SheetFrame } from '@/components/ui/sheet';
import { isValidWorkoutDate, isValidWorkoutTime } from '@/lib/session-edit';
import type { SessionMeta } from '@/lib/session/session-reducer';
import { NOTE_MAX } from '@/lib/session/set-row';

type WorkoutDetailsPanelProps = {
  meta: SessionMeta;
  /** What an unnamed workout will be called: "Workout on 2026-11-10". */
  defaultTitle: string;
  onChange: (patch: Partial<SessionMeta>) => void;
  onDone: () => void;
};

/** The rarely-changed workout-level things: name, date, time and note. */
export function WorkoutDetailsPanel({
  meta,
  defaultTitle,
  onChange,
  onDone,
}: WorkoutDetailsPanelProps) {
  // Date and time are typed, so they pass through states that are not dates
  // ("2026-11-1"). Those stay here, in the box; only a complete value — or an
  // empty one, which clears the field — is handed to the workout.
  const [date, setDate] = useState(meta.workoutDate);
  const [time, setTime] = useState(meta.workoutTime);

  const dateInvalid = date.trim() !== '' && !isValidWorkoutDate(date.trim());
  const timeInvalid = time.trim() !== '' && !isValidWorkoutTime(time.trim());

  const changeDate = (value: string) => {
    setDate(value);
    const trimmed = value.trim();
    if (trimmed === '' || isValidWorkoutDate(trimmed)) onChange({ workoutDate: trimmed });
  };

  const changeTime = (value: string) => {
    setTime(value);
    const trimmed = value.trim();
    if (trimmed === '' || isValidWorkoutTime(trimmed)) onChange({ workoutTime: trimmed });
  };

  return (
    <SheetFrame
      title="Workout details"
      footer={<Button label="Done" variant="dark" size="lg" onPress={onDone} />}>
      <ScrollView contentContainerStyle={styles.fields} keyboardShouldPersistTaps="handled">
        <FormField
          label="Name"
          value={meta.title}
          onChangeText={(title) => onChange({ title })}
          placeholder={defaultTitle}
          maxLength={NOTE_MAX.title}
        />

        <FormField
          label="Date"
          value={date}
          onChangeText={changeDate}
          placeholder="YYYY-MM-DD"
          error={dateInvalid ? 'Use the form 2026-11-10.' : null}
          hint="Leave blank to keep this workout off a specific day."
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />

        <FormField
          label="Time"
          value={time}
          onChangeText={changeTime}
          placeholder="HH:mm"
          error={timeInvalid ? 'Use the 24-hour form 18:10.' : null}
          hint="24-hour clock."
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />

        <FormField
          label="Workout note"
          value={meta.workoutNote}
          onChangeText={(workoutNote) => onChange({ workoutNote })}
          placeholder="How you felt, sleep, context for this session…"
          maxLength={NOTE_MAX.workout}
          multiline
          style={styles.note}
        />
      </ScrollView>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 12,
    paddingBottom: 12,
  },
  note: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
