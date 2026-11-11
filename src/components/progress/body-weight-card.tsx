import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { CardHeading } from '@/components/progress/progress-cards';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseWeight, sparklinePoints, weightSummary } from '@/lib/body-weight';
import type { BodyWeightEntry } from '@/types/progress';

const CHART_W = 320;
const CHART_H = 64;
const CHART_POINTS = 30;

type BodyWeightCardProps = {
  entries: readonly BodyWeightEntry[];
  goalWeightLbs: number | null;
  todayKey: string;
  /** Resolves to whether it saved; the typed weight stays when it did not. */
  onLog: (weightLbs: number) => Promise<boolean>;
};

/** Optional weigh-ins: the latest, the change over 30 days, a sparkline, and a quick log. */
export function BodyWeightCard({ entries, goalWeightLbs, todayKey, onLog }: BodyWeightCardProps) {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { current, trend } = weightSummary(entries, todayKey);
  const points = sparklinePoints(entries, CHART_W, CHART_H, CHART_POINTS);
  const shown = Math.min(entries.length, CHART_POINTS);

  const log = async () => {
    const weight = parseWeight(input);
    if (weight === null) {
      setError('Enter a weight in pounds.');
      return;
    }

    setSaving(true);
    setError(null);
    const saved = await onLog(weight);
    setSaving(false);

    if (saved) setInput('');
    else setError('Could not save. Check your connection and try again.');
  };

  return (
    <Card style={styles.card}>
      <CardHeading title="Body weight" aside={goalWeightLbs !== null ? `Goal ${goalWeightLbs} lb` : null} />

      {current !== null ? (
        <View style={styles.current}>
          <ThemedText type="stat">{current}</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            lb{trend ? ` · ${trend}` : ''}
          </ThemedText>
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Optional. Log a weigh-in whenever you like; no pressure.
        </ThemedText>
      )}

      {points.length > 0 ? (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Weight trend over the last ${shown} weigh-ins${trend ? `, ${trend}` : ''}`}>
          <Svg
            width="100%"
            height={CHART_H}
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            preserveAspectRatio="none">
            <Polyline
              points={points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
              fill="none"
              stroke={theme.tint}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </Svg>
        </View>
      ) : null}

      <View style={styles.form}>
        <TextInput
          value={input}
          onChangeText={(text) => {
            setInput(text);
            if (error) setError(null);
          }}
          onSubmitEditing={() => void log()}
          keyboardType="decimal-pad"
          returnKeyType="done"
          placeholder="Today’s weight (lb)"
          placeholderTextColor={theme.textFaint}
          accessibilityLabel="Today’s weight in pounds"
          style={[
            styles.input,
            {
              backgroundColor: theme.background,
              borderColor: error ? theme.danger : theme.border,
              color: theme.text,
            },
          ]}
        />
        <Button
          label="Log"
          variant="secondary"
          onPress={() => void log()}
          disabled={!input.trim()}
          busy={saving}
          accessibilityLabel="Log today’s weight"
        />
      </View>

      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {error}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  current: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 10,
  },
  form: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 16,
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: 12,
  },
});
