import { Pressable, StyleSheet, View } from 'react-native';

import { StepDays } from '@/components/challenges/step-days';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronRightIcon, FootprintsIcon } from '@/components/ui/icons';
import { Pill } from '@/components/ui/pill';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StepChallengeCardView } from '@/lib/step-challenge-model';

type StepChallengeCardProps = {
  /** Null when there's no running or just-finished challenge. */
  view: StepChallengeCardView | null;
  onStart: () => void;
  onLogDay: (dateKey: string) => void;
  onEdit: () => void;
  onRepeat: () => void;
};

/** The weekly or monthly step challenge on Home, or a quiet way to start one. */
export function StepChallengeCard({
  view,
  onStart,
  onLogDay,
  onEdit,
  onRepeat,
}: StepChallengeCardProps) {
  const theme = useTheme();
  if (!view) return <StartChallengeEntry onStart={onStart} />;

  const todayKey = view.days.find((day) => day.isToday)?.dateKey ?? null;
  const complete = view.state === 'done';

  return (
    <Card
      radius="xl"
      testID="step-challenge-card"
      style={[
        styles.card,
        complete && { backgroundColor: theme.tintSubtle, borderColor: theme.tintBorder },
      ]}>
      <View style={styles.headingRow}>
        <ThemedText type="labelStrong" accessibilityRole="header">
          {view.heading}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {view.rangeLabel}
        </ThemedText>
      </View>

      <View>
        <ThemedText type="stat">
          {view.bigValue}
          <ThemedText type="small" themeColor="textSecondary">
            {` ${view.bigSuffix}`}
          </ThemedText>
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {view.title}
        </ThemedText>
        <ThemedText type="small">{view.status}</ThemedText>
      </View>

      {view.showBar ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Progress toward the ${view.period === 'month' ? 'monthly' : 'weekly'} total`}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(view.progress * 100) }}
          style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
          <View
            style={[styles.fill, { backgroundColor: theme.tint, width: `${view.progress * 100}%` }]}
          />
        </View>
      ) : null}

      <StepDays period={view.period} days={view.days} onPickDay={onLogDay} />

      {view.state === 'active' && todayKey ? (
        <Button label="Log today’s steps" size="lg" onPress={() => onLogDay(todayKey)} />
      ) : null}
      {view.repeatLabel ? <Button label={view.repeatLabel} size="lg" onPress={onRepeat} /> : null}
      {view.state !== 'active' && view.nextSet ? (
        <ThemedText type="small" themeColor="textMuted">
          {`Next ${view.period}’s challenge is set.`}
        </ThemedText>
      ) : null}

      <View style={styles.footer}>
        {view.today ? (
          <View style={styles.today}>
            <ThemedText type="caption" themeColor="textSecondary">
              {`Today: ${view.today.value}`}
            </ThemedText>
            {view.today.source ? (
              <Pill label={view.today.source} tone="neutral" uppercase={false} />
            ) : null}
          </View>
        ) : (
          <View />
        )}
        <Button
          label={view.state === 'ended' ? 'Try a different one' : 'Edit'}
          variant="ghost"
          size="sm"
          onPress={onEdit}
        />
      </View>
    </Card>
  );
}

/** No challenge running: one calm row, no pressure. */
function StartChallengeEntry({ onStart }: { onStart: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onStart}
      style={({ pressed }) => [
        styles.entry,
        { borderColor: theme.borderStrong },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <View style={[styles.entryIcon, { backgroundColor: theme.backgroundElement }]}>
        <FootprintsIcon size={18} color={theme.textBody} strokeWidth={2} />
      </View>
      <View style={styles.entryCopy}>
        <ThemedText type="labelStrong">Start a step challenge</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          A weekly or monthly target with room for off days.
        </ThemedText>
      </View>
      <ChevronRightIcon size={16} color={theme.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
  },
  headingRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  track: {
    borderRadius: Radius.full,
    height: 10,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: Radius.full,
    height: '100%',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  today: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  entry: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  entryIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  entryCopy: {
    flex: 1,
  },
});
