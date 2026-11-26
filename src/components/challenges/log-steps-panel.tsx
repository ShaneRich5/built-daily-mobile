import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { StepDays } from '@/components/challenges/step-days';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { SheetFrame } from '@/components/ui/sheet';
import { parseStepsInput } from '@/lib/daily-metrics';
import { formatCount } from '@/lib/session/session-summary';
import type { LogStepsDay, StepDayCell } from '@/lib/step-challenge-model';
import type { ChallengePeriod } from '@/types/challenge';
import { DAILY_METRICS } from '@/types/daily-metric';

const QUICK_ADDS = [500, 1000, 2500] as const;
const MAX_STEPS = DAILY_METRICS.steps.max;

type LogStepsPanelProps = {
  /** Week dots or a month grid, matching the card. */
  period: ChallengePeriod;
  /** The challenge's days, so any past day can be picked and edited. */
  days: StepDayCell[];
  day: LogStepsDay;
  onPickDay: (dateKey: string) => void;
  onSave: (dateKey: string, steps: number) => void;
  /** Drops the typed number so the day goes back to its synced value. */
  onUseSynced: (dateKey: string) => void;
};

/** Type a day's steps, or nudge it with +500 / +1,000 / +2,500. */
export function LogStepsPanel({
  period,
  days,
  day,
  onPickDay,
  onSave,
  onUseSynced,
}: LogStepsPanelProps) {
  return (
    <SheetFrame title={day.title} fill>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <StepDays period={period} days={days} selectedKey={day.dateKey} onPickDay={onPickDay} />
        {/* Keyed by day so switching days starts from that day's number. */}
        <LogStepsForm key={day.dateKey} day={day} onSave={onSave} onUseSynced={onUseSynced} />
      </ScrollView>
    </SheetFrame>
  );
}

function LogStepsForm({
  day,
  onSave,
  onUseSynced,
}: Pick<LogStepsPanelProps, 'day' | 'onSave' | 'onUseSynced'>) {
  // Start from the typed number only. Prefilling the synced one would turn it
  // into a typed number on save and stop that day from syncing.
  const [text, setText] = useState(day.manual != null ? formatCount(day.manual) : '');
  const [error, setError] = useState<string | null>(null);
  const base = parseStepsInput(text) ?? day.synced?.value ?? 0;

  const save = () => {
    const steps = parseStepsInput(text);
    if (steps == null) return setError('Type the day’s steps.');
    if (steps > MAX_STEPS) {
      return setError(`That’s more than ${formatCount(MAX_STEPS)}. Check the number?`);
    }
    onSave(day.dateKey, steps);
  };

  return (
    <View style={styles.form}>
      {day.synced ? (
        <View style={styles.synced}>
          <ThemedText type="small" themeColor="textMuted">
            {`Synced from ${day.synced.source}: ${formatCount(day.synced.value)}. `}
            {day.manual != null
              ? `You typed ${formatCount(day.manual)} for this day, so that’s what counts.`
              : 'Saving a number here replaces it for this day only. Other days keep syncing.'}
          </ThemedText>
          {day.manual != null ? (
            <Button
              label="Use the synced number"
              variant="ghost"
              size="sm"
              onPress={() => onUseSynced(day.dateKey)}
            />
          ) : null}
        </View>
      ) : null}

      <FormField
        label="Steps"
        value={text}
        onChangeText={(next) => {
          setText(next);
          setError(null);
        }}
        placeholder={day.synced ? formatCount(day.synced.value) : '0'}
        keyboardType="number-pad"
        returnKeyType="done"
        onSubmitEditing={save}
        error={error}
      />

      <View style={styles.quick}>
        {QUICK_ADDS.map((add) => (
          <Button
            key={add}
            label={`+${formatCount(add)}`}
            variant="secondary"
            size="sm"
            accessibilityLabel={`Add ${formatCount(add)} steps`}
            style={styles.quickButton}
            onPress={() => {
              setText(formatCount(Math.min(MAX_STEPS, base + add)));
              setError(null);
            }}
          />
        ))}
      </View>

      <Button label="Save steps" size="lg" onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 16,
    paddingBottom: 16,
  },
  form: {
    gap: 12,
  },
  synced: {
    alignItems: 'flex-start',
    gap: 4,
  },
  quick: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    flex: 1,
  },
});
