import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { MinusIcon, PlusIcon } from '@/components/ui/icons';
import { Segmented } from '@/components/ui/segmented';
import { SheetFrame } from '@/components/ui/sheet';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { challengeDateKeys, describeChallengeRule } from '@/lib/challenge-evaluate';
import { formatCount } from '@/lib/session/session-summary';
import { challengeRange, clampStep, limitsForRange, rangeLabel } from '@/lib/step-challenge-model';
import {
  CHALLENGE_LIMITS,
  CHALLENGE_PRESETS,
  type ChallengeLimits,
  type ChallengePeriod,
  type ChallengeRule,
} from '@/types/challenge';

type StartChallengePanelProps = {
  /** `edit` changes the running challenge's target; `start` begins a new one. */
  mode: 'start' | 'edit';
  todayKey: string;
  initialRule: ChallengeRule;
  /** Fixed in `edit` mode: a running challenge keeps its week or month. */
  initialPeriod: ChallengePeriod;
  onSubmit: (rule: ChallengeRule, period: ChallengePeriod) => void;
};

const PERIODS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
] as const;

/** A week or a month, three presets each, with − / + to nudge the numbers. */
export function StartChallengePanel({
  mode,
  todayKey,
  initialRule,
  initialPeriod,
  onSubmit,
}: StartChallengePanelProps) {
  const theme = useTheme();
  const [period, setPeriod] = useState<ChallengePeriod>(initialPeriod);
  const [rule, setRule] = useState<ChallengeRule>(initialRule);

  const { startDate, endDate } = challengeRange(period, todayKey);
  const dayCount = challengeDateKeys(startDate, endDate).length;
  const noun = period === 'month' ? 'month' : 'week';

  const pick = (preset: ChallengeRule) =>
    // Coming back to the kind you started with restores your own numbers.
    setRule(preset.kind === initialRule.kind && period === initialPeriod ? initialRule : preset);

  const switchPeriod = (next: ChallengePeriod) => {
    if (next === period) return;
    setPeriod(next);
    // Keep the same kind of challenge, at the new period's preset numbers.
    const preset = CHALLENGE_PRESETS[next].find((p) => p.kind === rule.kind);
    setRule(
      next === initialPeriod && rule.kind === initialRule.kind
        ? initialRule
        : (preset ?? CHALLENGE_PRESETS[next][0]).rule,
    );
  };

  return (
    <SheetFrame
      title={mode === 'edit' ? 'Change the challenge' : 'Start a step challenge'}
      subtitle={`Runs ${rangeLabel(startDate, endDate)}. Steps already in this ${noun} count.`}
      fill
      footer={
        <Button
          label={mode === 'edit' ? 'Save changes' : 'Start challenge'}
          size="lg"
          onPress={() => onSubmit(rule, period)}
        />
      }>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {mode === 'start' ? (
          <Segmented
            options={PERIODS}
            value={period}
            onChange={switchPeriod}
            accessibilityLabel="How long"
          />
        ) : null}

        <View accessibilityRole="radiogroup" accessibilityLabel="Challenge" style={styles.presets}>
          {CHALLENGE_PRESETS[period].map((preset) => {
            const on = rule.kind === preset.kind;
            return (
              <Pressable
                key={preset.kind}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => pick(preset.rule)}
                style={({ pressed }) => [
                  styles.preset,
                  on
                    ? { borderColor: theme.tint, backgroundColor: theme.tintSubtle }
                    : { borderColor: theme.border, backgroundColor: theme.surface },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="labelStrong">
                  {describeChallengeRule(on ? rule : preset.rule, 'steps', period)}
                </ThemedText>
                <ThemedText type="small" themeColor="textMuted">
                  {preset.hint}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedText type="overline" themeColor="textSecondary">
          Adjust the target
        </ThemedText>
        <RuleSteppers
          rule={rule}
          noun={noun}
          dayCount={dayCount}
          limits={CHALLENGE_LIMITS[period]}
          onChange={setRule}
        />
      </ScrollView>
    </SheetFrame>
  );
}

/** The one or two numbers each rule has, as − / + rows. */
function RuleSteppers({
  rule,
  noun,
  dayCount,
  limits,
  onChange,
}: {
  rule: ChallengeRule;
  noun: string;
  dayCount: number;
  limits: ChallengeLimits;
  onChange: (rule: ChallengeRule) => void;
}) {
  const steps = limits.dailyTarget;
  const daysNeeded = limitsForRange(limits.daysNeeded, dayCount);
  const streakLength = limitsForRange(limits.streakLength, dayCount);

  const dailyTargetRow = (current: number, set: (value: number) => void) => (
    <Stepper
      label="Steps a day"
      value={formatCount(current)}
      current={current}
      limits={steps}
      onStep={(delta) => set(clampStep(current, delta * steps.step, steps))}
    />
  );

  switch (rule.kind) {
    case 'days_hit':
      return (
        <View style={styles.steppers}>
          {dailyTargetRow(rule.dailyTarget, (dailyTarget) => onChange({ ...rule, dailyTarget }))}
          <Stepper
            label="Days needed"
            value={`${rule.daysNeeded} of ${dayCount}`}
            current={rule.daysNeeded}
            limits={daysNeeded}
            onStep={(delta) =>
              onChange({ ...rule, daysNeeded: clampStep(rule.daysNeeded, delta, daysNeeded) })
            }
          />
        </View>
      );
    case 'total':
      return (
        <View style={styles.steppers}>
          <Stepper
            label={`Steps this ${noun}`}
            value={formatCount(rule.target)}
            current={rule.target}
            limits={limits.total}
            onStep={(delta) =>
              onChange({
                ...rule,
                target: clampStep(rule.target, delta * limits.total.step, limits.total),
              })
            }
          />
        </View>
      );
    case 'streak':
      return (
        <View style={styles.steppers}>
          {dailyTargetRow(rule.dailyTarget, (dailyTarget) => onChange({ ...rule, dailyTarget }))}
          <Stepper
            label="Days running"
            value={String(rule.length)}
            current={rule.length}
            limits={streakLength}
            onStep={(delta) =>
              onChange({ ...rule, length: clampStep(rule.length, delta, streakLength) })
            }
          />
        </View>
      );
  }
}

function Stepper({
  label,
  value,
  current,
  limits,
  onStep,
}: {
  label: string;
  value: string;
  current: number;
  limits: { min: number; max: number };
  onStep: (delta: 1 | -1) => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.stepper, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.stepperCopy}>
        <ThemedText type="caption" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="mono">{value}</ThemedText>
      </View>
      <IconButton
        icon={MinusIcon}
        accessibilityLabel={`Less: ${label}`}
        variant="soft"
        disabled={current <= limits.min}
        onPress={() => onStep(-1)}
      />
      <IconButton
        icon={PlusIcon}
        accessibilityLabel={`More: ${label}`}
        variant="soft"
        disabled={current >= limits.max}
        onPress={() => onStep(1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 12,
    paddingBottom: 16,
  },
  presets: {
    gap: 8,
  },
  preset: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 2,
    minHeight: 56,
    padding: 14,
  },
  steppers: {
    gap: 8,
  },
  stepper: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepperCopy: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
