import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DayTile } from '@/components/groups/group-ui';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { CheckIcon } from '@/components/ui/icons';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetFrame } from '@/components/ui/sheet';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nextSevenDays, type PlanRow, type PlanTemplateOption } from '@/lib/groups-model';
import { isValidWorkoutTime } from '@/lib/session-edit';
import type { NewSharedPlan } from '@/services/firestore/group-plan-repository';
import { SHARED_PLAN_LIMITS } from '@/types/group';

/** "Going ✓" for a plan the lifter is in. */
export function GoingPill() {
  const theme = useTheme();
  return (
    <View style={[styles.going, { backgroundColor: theme.tintSubtle }]}>
      <CheckIcon size={14} color={theme.tintText} strokeWidth={2.5} />
      <ThemedText type="smallBold" style={{ color: theme.tintText }}>
        Going
      </ThemedText>
    </View>
  );
}

/** One plan together in a list: its day, what and who, and "I'm in" or "Going". */
export function PlanRowItem({
  row,
  busy,
  divider,
  onOpen,
  onImIn,
}: {
  row: PlanRow;
  busy: boolean;
  divider: boolean;
  onOpen: () => void;
  onImIn: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.row, divider && { borderTopColor: theme.borderSubtle, borderTopWidth: 1 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${row.weekday} ${row.dayOfMonth}: ${row.title}. ${row.meta}`}
        onPress={onOpen}
        style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
        <DayTile weekday={row.weekday} day={row.dayOfMonth} />
        <View style={styles.flex}>
          <ThemedText type="label" numberOfLines={1}>
            {row.title}
          </ThemedText>
          <ThemedText type="caption" numberOfLines={1}>
            {row.meta}
          </ThemedText>
        </View>
      </Pressable>
      {row.going ? (
        <GoingPill />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={row.joinLabel}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onImIn}
          style={({ pressed }) => [styles.imIn, { borderColor: theme.tint }, (pressed || busy) && styles.pressed]}>
          <ThemedText type="smallBold" style={{ color: theme.tintText }}>
            {busy ? '…' : 'I’m in'}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const TIMES = [
  { id: 'any', label: 'Anytime', time: null },
  { id: 'early', label: '6:30 AM', time: '06:30' },
  { id: 'lunch', label: 'Lunch', time: '12:00' },
  { id: 'evening', label: 'Evening', time: '18:00' },
  { id: 'custom', label: 'Other time', time: null },
] as const;

type TimeId = (typeof TIMES)[number]['id'];
const OTHER = '__other__';

/**
 * G3: a workout, a day, maybe a time and a place. It goes on the lifter's
 * planner too, and the group can tap "I'm in".
 */
export function PlanTogetherPanel({
  todayKey,
  templates,
  groups,
  defaultGroupId,
  crewCounts,
  onSubmit,
}: {
  todayKey: string;
  templates: readonly PlanTemplateOption[];
  groups: readonly { id: string; name: string }[];
  defaultGroupId: string;
  /** Others already training or planning, by day. */
  crewCounts: Record<string, number>;
  /** Resolves to null when saved, or the message to show when not. */
  onSubmit: (input: NewSharedPlan) => Promise<string | null>;
}) {
  const theme = useTheme();
  const days = nextSevenDays(todayKey);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? OTHER);
  const [otherName, setOtherName] = useState('');
  const [day, setDay] = useState(days[0].dateKey);
  const [timeId, setTimeId] = useState<TimeId>('any');
  const [customTime, setCustomTime] = useState('07:00');
  const [where, setWhere] = useState('');
  const [note, setNote] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([defaultGroupId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = templates.find((option) => option.id === templateId) ?? null;
  const label = (template ? template.name : otherName).trim();
  const time = timeId === 'custom' ? customTime.trim() : (TIMES.find((option) => option.id === timeId)?.time ?? null);
  const timeInvalid = timeId === 'custom' && !isValidWorkoutTime(customTime.trim());
  const ready = label.length > 0 && groupIds.length > 0 && !timeInvalid;
  const dayShort = days.find((option) => option.dateKey === day)?.short ?? '';

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const failed = await onSubmit({
      groupIds,
      dateKey: day,
      time: time || null,
      where: where.trim() || null,
      note: note.trim() || null,
      label,
      exercises: template?.exercises ?? [],
    });
    setBusy(false);
    setError(failed);
  };

  return (
    <SheetFrame
      fill
      title="Plan a workout"
      subtitle="Goes on your planner. The group can tap I’m in."
      footer={
        <Button
          label={`Plan ${label || 'it'} · ${dayShort}`}
          size="lg"
          onPress={() => void submit()}
          disabled={!ready}
          busy={busy}
        />
      }>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <SectionLabel>Workout</SectionLabel>
          <Chips
            options={[
              ...templates.map((option) => ({ id: option.id, label: option.name })),
              { id: OTHER, label: 'Something else' },
            ]}
            selected={[templateId]}
            onPress={setTemplateId}
          />
          {templateId === OTHER ? (
            <FormField
              label="Workout name"
              value={otherName}
              onChangeText={setOtherName}
              maxLength={SHARED_PLAN_LIMITS.label}
              placeholder="Run, climbing, a class…"
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <SectionLabel>Day</SectionLabel>
          <View style={styles.days}>
            {days.map((option) => {
              const count = crewCounts[option.dateKey] ?? 0;
              const on = option.dateKey === day;
              return (
                <Pressable
                  key={option.dateKey}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${option.short} ${option.dayOfMonth}${count > 0 ? `, ${count} from the group` : ''}`}
                  onPress={() => setDay(option.dateKey)}
                  style={[
                    styles.day,
                    on
                      ? { backgroundColor: theme.inverse, borderColor: theme.inverse }
                      : { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}>
                  <ThemedText style={[styles.dayShort, { color: on ? theme.onInverse : theme.textSecondary }]}>
                    {option.short}
                  </ThemedText>
                  <ThemedText style={[styles.dayNumber, { color: on ? theme.onInverse : theme.text }]}>
                    {option.dayOfMonth}
                  </ThemedText>
                  <ThemedText style={[styles.dayCount, { color: on ? theme.onInverse : theme.tintText }, count === 0 && styles.hidden]}>
                    {count}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ThemedText type="caption">Number = others already training that day</ThemedText>
        </View>

        <View style={styles.section}>
          <SectionLabel>Time (optional)</SectionLabel>
          <Chips
            options={TIMES.map((option) => ({ id: option.id, label: option.label }))}
            selected={[timeId]}
            onPress={(id) => setTimeId(id as TimeId)}
          />
          {timeId === 'custom' ? (
            <FormField
              label="Time (24-hour)"
              value={customTime}
              onChangeText={setCustomTime}
              placeholder="07:00"
              keyboardType="numbers-and-punctuation"
              error={timeInvalid ? 'Use HH:MM, like 07:00 or 18:30.' : null}
            />
          ) : null}
        </View>

        <FormField
          label="Where (optional)"
          value={where}
          onChangeText={setWhere}
          maxLength={SHARED_PLAN_LIMITS.where}
          placeholder="Iron Works Gym"
        />
        <FormField
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          maxLength={SHARED_PLAN_LIMITS.note}
          placeholder="Meet by the squat racks"
        />

        {groups.length > 1 ? (
          <View style={styles.section}>
            <SectionLabel>Share with</SectionLabel>
            <Chips
              multi
              options={groups.map((group) => ({ id: group.id, label: group.name }))}
              selected={groupIds}
              onPress={(id) =>
                setGroupIds((current) => (current.includes(id) ? current.filter((other) => other !== id) : [...current, id]))
              }
            />
          </View>
        ) : null}

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
  flex: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  going: {
    alignItems: 'center',
    borderRadius: Radius.full,
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 12,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  imIn: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 12,
  },
  content: {
    gap: 20,
    paddingBottom: 8,
  },
  section: {
    gap: 8,
  },
  days: {
    flexDirection: 'row',
    gap: 6,
  },
  day: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 6,
  },
  dayShort: {
    fontSize: 11,
    lineHeight: 14,
  },
  dayNumber: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  dayCount: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11,
    lineHeight: 14,
  },
  hidden: {
    opacity: 0,
  },
});
