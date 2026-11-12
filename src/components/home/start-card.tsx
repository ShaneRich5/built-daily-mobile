import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDownIcon, PlusIcon } from '@/components/ui/icons';
import { Pill } from '@/components/ui/pill';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HomeInProgress, HomeSuggestedStart } from '@/lib/home-model';

type StartCardProps = {
  headline: string;
  detail: string;
  /** What the big button starts; null means an empty workout. */
  suggested: HomeSuggestedStart | null;
  busy: boolean;
  onStart: () => void;
  onOpenMenu: () => void;
  onLogActivity: () => void;
};

/**
 * Home's one job: start a workout. A split button — the big side starts the
 * suggestion in one tap, the chevron opens every other way to start.
 */
export function StartCard({
  headline,
  detail,
  suggested,
  busy,
  onStart,
  onOpenMenu,
  onLogActivity,
}: StartCardProps) {
  const theme = useTheme();

  return (
    <Card radius="xl" style={styles.card}>
      <View style={styles.copy}>
        <ThemedText type="heading" accessibilityRole="header">
          {headline}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>

      <View style={[styles.split, { backgroundColor: theme.tint }, busy && styles.busy]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            suggested ? `Start ${suggested.name}, ${suggested.meta}` : 'Start empty workout'
          }
          accessibilityState={{ disabled: busy, busy }}
          disabled={busy}
          onPress={onStart}
          style={({ pressed }) => [
            styles.main,
            !suggested && styles.mainEmpty,
            pressed && styles.pressed,
          ]}>
          {suggested ? (
            <>
              <ThemedText type="labelStrong" style={{ color: theme.onTint }} numberOfLines={1}>
                Start {suggested.name}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.onTintMuted }} numberOfLines={1}>
                {suggested.meta}
              </ThemedText>
            </>
          ) : (
            <>
              <PlusIcon size={18} color={theme.onTint} strokeWidth={2} />
              <ThemedText type="labelStrong" style={{ color: theme.onTint }}>
                Start empty workout
              </ThemedText>
            </>
          )}
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.onTint }]} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a different workout"
          disabled={busy}
          onPress={onOpenMenu}
          style={({ pressed }) => [styles.chevron, pressed && styles.pressed]}>
          <ChevronDownIcon size={20} color={theme.onTint} strokeWidth={2} />
        </Pressable>
      </View>

      <Button label="Log activity" variant="secondary" onPress={onLogActivity} />
    </Card>
  );
}

type ResumeCardProps = {
  workout: HomeInProgress;
  onResume: () => void;
  onStartDifferent: () => void;
};

/** Shown in place of the start card while a workout is in progress. */
export function ResumeCard({ workout, onResume, onStartDifferent }: ResumeCardProps) {
  const theme = useTheme();

  const segmentColor = {
    done: theme.tint,
    in_progress: theme.tintSoft,
    not_started: theme.backgroundSelected,
  };

  return (
    <Card variant="emphasis" radius="xl" style={styles.card}>
      <View style={styles.resumeTop}>
        <Pill label="In progress" tone="warning" dot />
        <ThemedText type="caption">{workout.started}</ThemedText>
      </View>

      <View style={styles.copy}>
        <ThemedText type="subtitle" accessibilityRole="header">
          {workout.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {workout.meta}
        </ThemedText>
      </View>

      {workout.segments.length > 0 ? (
        <View style={styles.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {workout.segments.map((segment, index) => (
            <View
              // One per exercise, in order; they are never reordered here.
              key={index}
              style={[styles.segment, { backgroundColor: segmentColor[segment] }]}
            />
          ))}
        </View>
      ) : null}

      <Button label="Resume workout" size="lg" onPress={onResume} />
      <Button
        label="Start a different workout"
        variant="ghost"
        size="sm"
        onPress={onStartDifferent}
        style={styles.different}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 16,
  },
  copy: {
    gap: 4,
  },
  split: {
    borderRadius: Radius.lg,
    flexDirection: 'row',
    height: 56,
    overflow: 'hidden',
  },
  busy: {
    opacity: 0.6,
  },
  main: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 16,
  },
  mainEmpty: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  divider: {
    opacity: 0.3,
    width: 1,
  },
  chevron: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
  },
  resumeTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    borderRadius: Radius.full,
    flex: 1,
    height: 6,
  },
  different: {
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
