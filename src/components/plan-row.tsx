import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import {
  planPreview,
  planSourceLabel,
  planUpdatedLabel,
  planVolumeLabel,
} from '@/lib/plan-format';
import type { WorkoutPlan } from '@/types/workout';

type PlanRowProps = {
  plan: WorkoutPlan;
  onStart: (plan: WorkoutPlan) => void;
  busy: boolean;
};

/** One saved template: what is in it, when it last changed on the web, and a way to run it. */
export function PlanRow({ plan, onStart, busy }: PlanRowProps) {
  const preview = planPreview(plan);
  const source = planSourceLabel(plan);

  return (
    <Card style={styles.row}>
      <View style={styles.titleLine}>
        <ThemedText type="label" style={styles.title} numberOfLines={1}>
          {plan.name || 'Untitled plan'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {planUpdatedLabel(plan)}
        </ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {[planVolumeLabel(plan), source].filter(Boolean).join(' · ')}
      </ThemedText>

      {preview ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {preview}
        </ThemedText>
      ) : null}

      <ActionButton
        label="Start this workout"
        variant="secondary"
        onPress={() => onStart(plan)}
        busy={busy}
        // An empty template has nothing to copy into a session.
        disabled={plan.lines.length === 0}
        style={styles.start}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.one,
  },
  titleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  title: {
    flexShrink: 1,
  },
  start: {
    marginTop: Spacing.two,
  },
});
