import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { CheckIcon, GripVerticalIcon, PlusIcon } from '@/components/ui/icons';
import { FontFamily, MinTouchTarget, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type BoardCard, type BoardDay, targetFor } from '@/lib/week-board';

type CardRowProps = {
  card: BoardCard;
  picked: boolean;
  /** Tray cards draw dashed: an idea, not a commitment. */
  tray?: boolean;
  onOpen: () => void;
  onTogglePick: () => void;
};

/** One planned workout: tap it for options, tap its handle to move it. */
export function CardRow({ card, picked, tray = false, onOpen, onTogglePick }: CardRowProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: picked ? theme.tintSubtle : theme.surface,
          borderColor: picked ? theme.tint : tray ? theme.textFaint : theme.border,
          borderStyle: tray && !picked ? 'dashed' : 'solid',
          borderWidth: picked ? 2 : 1,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${card.title}, ${card.meta}`}
        accessibilityHint="Shows options for this plan"
        onPress={onOpen}
        style={({ pressed }) => [styles.cardText, pressed && styles.pressed]}>
        <ThemedText type="label" numberOfLines={1}>
          {card.title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
          {card.meta}
        </ThemedText>
      </Pressable>
      <IconButton
        icon={GripVerticalIcon}
        accessibilityLabel={picked ? `Stop moving ${card.title}` : `Move ${card.title}`}
        variant="plain"
        muted={!picked}
        onPress={onTogglePick}
      />
    </View>
  );
}

type DayRowProps = {
  day: BoardDay;
  todayKey: string;
  /** The card being moved, if any. */
  picked: BoardCard | null;
  onOpenCard: (card: BoardCard) => void;
  onTogglePick: (card: BoardCard) => void;
  onDrop: (day: BoardDay) => void;
  onPlan: (day: BoardDay) => void;
};

/** One day on the board: its date, what is planned and done, and a + or a drop target. */
export function DayRow({
  day,
  todayKey,
  picked,
  onOpenCard,
  onTogglePick,
  onDrop,
  onPlan,
}: DayRowProps) {
  const theme = useTheme();
  const target = picked ? targetFor(day, picked, todayKey) : null;
  const empty = day.cards.length === 0 && day.done.length === 0;

  return (
    <View
      style={[
        styles.day,
        { borderBottomColor: theme.borderSubtle },
        target && { backgroundColor: theme.selectedRow },
      ]}>
      <View style={styles.date} accessible accessibilityLabel={day.isToday ? `Today, ${day.label}` : day.label}>
        <ThemedText style={styles.dow} themeColor="textMuted">
          {day.dow}
        </ThemedText>
        <View
          style={[
            styles.dateCircle,
            day.isToday && { backgroundColor: theme.inverse },
          ]}>
          <ThemedText
            style={[
              styles.dateNumber,
              { color: day.isToday ? theme.onInverse : day.isPast ? theme.textSecondary : theme.text },
            ]}>
            {day.dayOfMonth}
          </ThemedText>
        </View>
      </View>

      <View style={styles.items}>
        {day.cards.map((card) => (
          <CardRow
            key={card.id}
            card={card}
            picked={picked?.id === card.id}
            onOpen={() => onOpenCard(card)}
            onTogglePick={() => onTogglePick(card)}
          />
        ))}
        {day.done.map((item) => (
          <View key={`${item.kind}-${item.id}`} style={styles.done}>
            <CheckIcon size={14} color={theme.tint} strokeWidth={3} />
            <ThemedText type="small" themeColor="textBody" numberOfLines={1}>
              {item.title}
            </ThemedText>
          </View>
        ))}
        {empty ? (
          <ThemedText type="small" themeColor="textSecondary">
            {day.isToday ? 'Today · nothing planned' : day.isPast ? 'Rest' : 'Nothing planned'}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.action}>
        {target ? (
          <Button
            label={target}
            accessibilityLabel={`${target} to ${day.label}`}
            variant="dashed"
            size="md"
            onPress={() => onDrop(day)}
            style={[styles.target, { borderColor: theme.tint }]}
          />
        ) : !picked && !day.isPast ? (
          <IconButton
            icon={PlusIcon}
            accessibilityLabel={`Plan a workout on ${day.label}`}
            muted
            onPress={() => onPlan(day)}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    gap: 6,
    minHeight: 52,
    paddingLeft: 12,
    paddingRight: 2,
  },
  cardText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingVertical: 6,
  },
  day: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 68,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 8,
  },
  date: {
    alignItems: 'center',
    gap: 2,
    width: 40,
  },
  dow: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  dateCircle: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  dateNumber: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    lineHeight: 18,
  },
  items: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  done: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  action: {
    alignItems: 'flex-end',
    width: MinTouchTarget + 20,
  },
  target: {
    paddingHorizontal: 8,
    width: 64,
  },
  pressed: {
    opacity: 0.7,
  },
});
