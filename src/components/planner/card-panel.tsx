import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionRow } from '@/components/ui/action-row';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, BanIcon, InboxIcon, Trash2Icon } from '@/components/ui/icons';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetFrame } from '@/components/ui/sheet';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, shortDayLabel, weekdayShort } from '@/lib/date-keys';
import { type BoardCard, pushBackPlan, whenLabel } from '@/lib/week-board';
import type { DatedScheduledWorkout } from '@/types/planner';

type CardPanelProps = {
  card: BoardCard;
  todayKey: string;
  /** The open plans the board knows about, for "push the week back" and the busy dots. */
  open: readonly DatedScheduledWorkout[];
  busy: boolean;
  onStart: () => void;
  /** Moves this card, and anything that moves with it. */
  onMove: (moves: { id: string; dateKey: string | null }[]) => void;
  onSkip: () => void;
  onDelete: () => void;
  onCancel: () => void;
};

/** How many days ahead the "Move to" row offers. */
const DAYS_AHEAD = 7;

/**
 * One planned workout's options: start it, move it to a day this week, push
 * the rest of the week back, put it in Unscheduled, skip it, or delete it.
 */
export function CardPanel({
  card,
  todayKey,
  open,
  busy,
  onStart,
  onMove,
  onSkip,
  onDelete,
  onCancel,
}: CardPanelProps) {
  const theme = useTheme();
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(todayKey, i));
  const busyDays = new Set(open.filter((entry) => entry.id !== card.id).map((entry) => entry.dateKey));
  const pushBack = pushBackPlan(card, open, todayKey);
  const canStart = card.entry.exerciseIds.length > 0;
  // A group's plan together: deleting it here also takes you off its going list.
  const shared = Boolean(card.entry.sharedPlanId);

  return (
    <SheetFrame
      title={card.title}
      subtitle={`${whenLabel(card, todayKey)} · ${card.meta}`}
      footer={<Button label="Cancel" variant="secondary" size="lg" onPress={onCancel} />}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {canStart ? <Button label="Start now" onPress={onStart} disabled={busy} /> : null}

        <View style={styles.section}>
          <SectionLabel>Move to</SectionLabel>
          <View style={styles.days}>
            {days.map((key) => {
              const current = key === card.dateKey;
              const label = `${key === todayKey ? 'Today, ' : ''}${shortDayLabel(key)}${
                busyDays.has(key) ? ', something already planned' : ''
              }`;

              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={current ? `${label}, current day` : label}
                  accessibilityState={{ disabled: current || busy, selected: current }}
                  disabled={current || busy}
                  onPress={() => onMove([{ id: card.id, dateKey: key }])}
                  style={({ pressed }) => [
                    styles.dayButton,
                    current
                      ? { backgroundColor: theme.inverse, borderColor: theme.inverse }
                      : { backgroundColor: theme.surface, borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    style={[styles.dow, { color: current ? theme.onInverse : theme.textMuted }]}>
                    {weekdayShort(key)}
                  </ThemedText>
                  <ThemedText
                    style={[styles.dayNumber, { color: current ? theme.onInverse : theme.text }]}>
                    {Number(key.slice(8))}
                  </ThemedText>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: busyDays.has(key) ? theme.tint : 'transparent' },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
          <ThemedText type="caption" themeColor="textMuted">
            A dot means something is already planned that day.
          </ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

        <View>
          {pushBack ? (
            <ActionRow
              label="Push the rest of the week back"
              detail={pushBack.summary}
              icon={ArrowRightIcon}
              disabled={busy}
              onPress={() => onMove(pushBack.moves)}
            />
          ) : null}
          {card.dateKey !== null ? (
            <ActionRow
              label="Move to Unscheduled"
              detail="Keep it, pick a day later"
              icon={InboxIcon}
              disabled={busy}
              onPress={() => onMove([{ id: card.id, dateKey: null }])}
            />
          ) : null}
          {card.dateKey !== null ? (
            <ActionRow
              label="Skip this one"
              detail="Marked skipped, nothing else changes"
              icon={BanIcon}
              disabled={busy}
              onPress={onSkip}
            />
          ) : null}
          <ActionRow
            label={shared ? 'Can’t make it' : 'Delete'}
            detail={shared ? 'Off your planner, and off the group’s going list' : 'Remove it from the planner'}
            icon={Trash2Icon}
            destructive
            disabled={busy}
            onPress={onDelete}
          />
        </View>
      </ScrollView>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 560,
  },
  content: {
    gap: 14,
    paddingBottom: 8,
  },
  section: {
    gap: 8,
  },
  days: {
    flexDirection: 'row',
    gap: 4,
  },
  dayButton: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    height: 64,
    justifyContent: 'center',
  },
  dow: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  dayNumber: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  dot: {
    borderRadius: Radius.full,
    height: 6,
    width: 6,
  },
  divider: {
    height: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
