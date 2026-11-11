import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardPanel } from '@/components/planner/card-panel';
import { PlanPanel } from '@/components/planner/plan-panel';
import { CardRow, DayRow } from '@/components/planner/week-board-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetHost } from '@/components/ui/sheet';
import { BottomTabInset, Radius } from '@/constants/theme';
import { usePlannerActions } from '@/hooks/use-planner-actions';
import { usePlannerData } from '@/hooks/use-planner-data';
import { useStartWorkout } from '@/hooks/use-start-workout';
import { useTheme } from '@/hooks/use-theme';
import { addDays, dateKey } from '@/lib/date-keys';
import { type BoardCard, type BoardDay, movesForDrop } from '@/lib/week-board';
import { confirm } from '@/services/confirm';
import type { NewScheduledWorkout } from '@/services/firestore/planner-mappers';

type Panel = { kind: 'card'; card: BoardCard } | { kind: 'plan'; dateKey: string | null } | null;

/**
 * The planner: a week of days to rearrange — tap a handle, tap a day — an
 * Unscheduled tray for plans with no day yet, and the lifter's templates.
 * Built for one hand at the gym, which is why moving is two taps rather than
 * a drag.
 */
export function PlannerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [weekKey, setWeekKey] = useState(() => dateKey(new Date()));
  const planner = usePlannerData(weekKey);
  const actions = usePlannerActions();
  const { start, startPlanned, startingPlanId, error: startError } = useStartWorkout();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  const { board, tray, todayKey } = planner;
  const allCards = [...board.days.flatMap((day) => day.cards), ...tray];
  const picked = allCards.find((card) => card.id === pickedId) ?? null;
  const planFor = (id: string | null) => planner.plans.find((plan) => plan.id === id);

  const togglePick = (card: BoardCard) => setPickedId((current) => (current === card.id ? null : card.id));

  const drop = async (day: BoardDay) => {
    if (!picked) return;
    const moves = movesForDrop(day, picked, todayKey);
    if (moves.length > 0 && (await actions.move(moves))) setPickedId(null);
  };

  const dropInTray = async () => {
    if (picked && (await actions.move([{ id: picked.id, dateKey: null }]))) setPickedId(null);
  };

  const closePanel = () => setPanel(null);

  const plan = async (entry: NewScheduledWorkout) => {
    if (await actions.add(entry)) closePanel();
  };

  const remove = async (card: BoardCard) => {
    const ok = await confirm({
      title: `Delete ${card.title}?`,
      message: 'It comes off the planner. Workouts you logged are not affected.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok && (await actions.remove(card.entry))) closePanel();
  };

  return (
    <View style={styles.root}>
      <Screen contentStyle={{ paddingBottom: BottomTabInset + (picked ? 120 : 24) }}>
        <ThemedText type="title" accessibilityRole="header">
          Planner
        </ThemedText>

        <View style={styles.weekNav}>
          <IconButton
            icon={ChevronLeftIcon}
            accessibilityLabel="Previous week"
            variant="plain"
            onPress={() => setWeekKey((key) => addDays(key, -7))}
          />
          <View style={styles.weekTitle}>
            <ThemedText type="labelStrong">{board.title}</ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              {board.subtitle}
            </ThemedText>
          </View>
          <IconButton
            icon={ChevronRightIcon}
            accessibilityLabel="Next week"
            variant="plain"
            onPress={() => setWeekKey((key) => addDays(key, 7))}
          />
        </View>

        {planner.isLoading ? (
          <ActivityIndicator style={styles.loading} />
        ) : planner.error ? (
          <ThemedText type="small" themeColor="danger">
            {planner.error}
          </ThemedText>
        ) : (
          <>
            {tray.length > 0 || (picked && picked.dateKey !== null) ? (
              <View
                style={[
                  styles.tray,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}>
                <View style={styles.trayHeading}>
                  <ThemedText type="overline">Unscheduled</ThemedText>
                  <ThemedText type="caption" themeColor="textMuted">
                    No day yet
                  </ThemedText>
                </View>
                {tray.map((card) => (
                  <CardRow
                    key={card.id}
                    card={card}
                    tray
                    picked={card.id === pickedId}
                    onOpen={() => setPanel({ kind: 'card', card })}
                    onTogglePick={() => togglePick(card)}
                  />
                ))}
                {picked && picked.dateKey !== null ? (
                  <Button
                    label="Put back here, pick a day later"
                    variant="dashed"
                    onPress={() => void dropInTray()}
                    style={{ borderColor: theme.tint }}
                  />
                ) : null}
              </View>
            ) : null}

            <Card padded={false} style={styles.board}>
              {board.days.map((day) => (
                <DayRow
                  key={day.dateKey}
                  day={day}
                  todayKey={todayKey}
                  picked={picked}
                  onOpenCard={(card) => setPanel({ kind: 'card', card })}
                  onTogglePick={togglePick}
                  onDrop={(target) => void drop(target)}
                  onPlan={(target) => setPanel({ kind: 'plan', dateKey: target.dateKey })}
                />
              ))}
            </Card>

            {actions.error || startError ? (
              <ThemedText type="small" themeColor="danger">
                {actions.error ?? startError}
              </ThemedText>
            ) : null}

            <View style={styles.section}>
              <SectionLabel action={{ label: 'New', onPress: () => router.push('/templates/new') }}>
                Templates
              </SectionLabel>
              {planner.plans.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No templates yet. Make one for a workout you do often.
                </ThemedText>
              ) : (
                planner.plans.map((template) => (
                  <ListRow
                    key={template.id}
                    title={template.name || 'Untitled template'}
                    meta={`${template.lines.length} exercise${template.lines.length === 1 ? '' : 's'}`}
                    onPress={() => router.push(`/templates/${template.id}`)}
                    trailing={
                      <Button
                        label="Start"
                        accessibilityLabel={`Start ${template.name}`}
                        variant="secondary"
                        size="sm"
                        busy={startingPlanId === template.id}
                        disabled={template.lines.length === 0}
                        onPress={() => void start(template)}
                      />
                    }
                  />
                ))
              )}
            </View>
          </>
        )}
      </Screen>

      {picked ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.banner,
            { backgroundColor: theme.inverse, bottom: Math.max(insets.bottom, 12) + BottomTabInset },
          ]}>
          <View style={styles.bannerText}>
            <ThemedText type="labelStrong" style={{ color: theme.onInverse }} numberOfLines={1}>
              Moving {picked.title}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.onInverse, opacity: 0.8 }}>
              Tap a day to drop it there
            </ThemedText>
          </View>
          <Button label="Cancel" variant="secondary" onPress={() => setPickedId(null)} />
        </View>
      ) : null}

      <SheetHost
        visible={panel !== null}
        onClose={closePanel}
        size={panel?.kind === 'plan' ? 'tall' : 'content'}>
        {panel?.kind === 'card' ? (
          <CardPanel
            card={panel.card}
            todayKey={todayKey}
            open={planner.entries.filter((entry) => entry.status === 'planned')}
            busy={actions.busy}
            onStart={() => {
              closePanel();
              void startPlanned(panel.card.entry, planFor(panel.card.entry.planId));
            }}
            onMove={async (moves) => {
              if (await actions.move(moves)) closePanel();
            }}
            onSkip={async () => {
              if (await actions.skip(panel.card.entry)) closePanel();
            }}
            onDelete={() => void remove(panel.card)}
            onCancel={closePanel}
          />
        ) : null}

        {panel?.kind === 'plan' ? (
          <PlanPanel
            todayKey={todayKey}
            initialDateKey={panel.dateKey}
            plans={planner.plans}
            busy={actions.busy}
            error={actions.error}
            onPlan={(entry) => void plan(entry)}
          />
        ) : null}
      </SheetHost>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  weekNav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekTitle: {
    alignItems: 'center',
    gap: 2,
  },
  loading: {
    paddingVertical: 48,
  },
  tray: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  trayHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  board: {
    borderRadius: Radius.xl,
  },
  section: {
    gap: 8,
  },
  banner: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    flexDirection: 'row',
    gap: 10,
    left: 12,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    position: 'absolute',
    right: 12,
  },
  bannerText: {
    flex: 1,
    minWidth: 0,
  },
});
