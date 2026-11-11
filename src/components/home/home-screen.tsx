import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { CatchUpCard } from '@/components/home/catch-up-card';
import { LogActivityPanel } from '@/components/home/log-activity-panel';
import { PickDayPanel } from '@/components/home/pick-day-panel';
import { ResumeCard, StartCard } from '@/components/home/start-card';
import { WeekCard } from '@/components/home/week-card';
import { type MenuAction, MenuPanel } from '@/components/session/panels/list-panels';
import { ThemedText } from '@/components/themed-text';
import { BookIcon, ListIcon, LogOutIcon, PlusIcon } from '@/components/ui/icons';
import { ListRow } from '@/components/ui/list-row';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetHost, type SheetSize } from '@/components/ui/sheet';
import { BottomTabInset, FontFamily, Radius } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { useHomeActions } from '@/hooks/use-home-actions';
import { useHomeData } from '@/hooks/use-home-data';
import { useStartWorkout } from '@/hooks/use-start-workout';
import { useTheme } from '@/hooks/use-theme';
import { longDayLabel } from '@/lib/date-keys';
import {
  type HomeWeekDay,
  missedHeadline,
  pickSuggestedStart,
  plannedWhen,
  startCopy,
} from '@/lib/home-model';
import { displayNameFromAuth } from '@/lib/user-profile';
import { signOut } from '@/services/auth';
import type { ScheduledWorkout } from '@/types/planner';

type Panel = 'start' | 'account' | 'log' | 'move' | null;

/** How many other templates the Start menu lists before "Manage templates". */
const MENU_TEMPLATE_LIMIT = 5;

/**
 * Home: start (or resume) a workout, this week at a glance with the goal
 * streak, and what was done recently. A planned day that slid past gets a calm
 * catch-up card above the rest.
 */
export function HomeScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const home = useHomeData();
  const actions = useHomeActions();
  const { start, startPlanned, isStarting, error: startError } = useStartWorkout();
  const [panel, setPanel] = useState<Panel>(null);

  const { todayKey, templates, planned, inProgress, missed } = home;
  const suggested = pickSuggestedStart(planned, templates, todayKey);
  const copy = startCopy(planned, templates.length > 0, todayKey);
  const planFor = (id: string | null) => home.plans.find((plan) => plan.id === id);
  const name = user ? displayNameFromAuth(user) : '';

  const startEntry = (entry: ScheduledWorkout) => void startPlanned(entry, planFor(entry.planId));

  const startSuggested = () => {
    if (suggested?.planned) return startEntry(suggested.planned);
    void start(suggested?.templateId ? planFor(suggested.templateId) : undefined);
  };

  /** Closes the sheet, then does the thing — navigation should not happen under a modal. */
  const fromMenu = (run: () => void) => {
    setPanel(null);
    run();
  };

  const others = templates
    .filter((template) => template.id !== suggested?.templateId)
    .slice(0, MENU_TEMPLATE_LIMIT);

  const startActions: MenuAction[] = [
    ...others.map(
      (template): MenuAction => ({
        label: template.name,
        detail: template.canStart ? template.meta : 'No exercises yet',
        disabled: !template.canStart,
        trailing:
          planned?.entry.planId === template.id ? (
            <Pill
              label={`Planned ${plannedWhen(planned.entry.dateKey, todayKey)}`}
              tone="success"
              uppercase={false}
            />
          ) : undefined,
        onPress: () => fromMenu(() => void start(planFor(template.id))),
      }),
    ),
    { label: 'Empty workout', icon: PlusIcon, onPress: () => fromMenu(() => void start()) },
    {
      label: 'Manage templates',
      icon: ListIcon,
      onPress: () => fromMenu(() => router.push('/plans')),
    },
  ];

  const accountActions: MenuAction[] = [
    {
      label: 'Exercise catalog',
      icon: BookIcon,
      onPress: () => fromMenu(() => router.push('/exercises')),
    },
    {
      label: 'Workout history',
      icon: ListIcon,
      onPress: () => fromMenu(() => router.push('/history')),
    },
    {
      label: 'Sign out',
      icon: LogOutIcon,
      destructive: true,
      onPress: () => fromMenu(() => void signOut()),
    },
  ];

  const size: SheetSize = panel === 'log' ? 'tall' : 'content';

  return (
    <Screen contentStyle={{ paddingBottom: BottomTabInset + 24 }}>
      <View style={styles.header}>
        <View>
          <ThemedText type="overline">{longDayLabel(todayKey)}</ThemedText>
          <ThemedText type="title" accessibilityRole="header">
            Built Daily
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account menu"
          onPress={() => setPanel('account')}
          style={({ pressed }) => [
            styles.avatar,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <ThemedText style={[styles.initial, { color: theme.textBody }]}>
            {name.slice(0, 1).toUpperCase() || '?'}
          </ThemedText>
        </Pressable>
      </View>

      {home.isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : home.error ? (
        <ThemedText type="small" themeColor="danger">
          {home.error}
        </ThemedText>
      ) : (
        <>
          {missed && !inProgress ? (
            <CatchUpCard
              headline={missedHeadline(missed, todayKey)}
              busy={actions.busy}
              onDoToday={() => void actions.moveEntry(missed.id, todayKey)}
              onPickDay={() => setPanel('move')}
              onSkip={() => void actions.skipEntry(missed.id)}
            />
          ) : null}

          {inProgress ? (
            <ResumeCard
              workout={inProgress}
              onResume={() => router.push(`/session/${inProgress.id}`)}
              onStartDifferent={() => setPanel('start')}
            />
          ) : (
            <StartCard
              headline={copy.headline}
              detail={copy.detail}
              suggested={suggested}
              busy={isStarting}
              onStart={startSuggested}
              onOpenMenu={() => setPanel('start')}
              onLogActivity={() => setPanel('log')}
            />
          )}

          {startError || actions.error ? (
            <ThemedText type="small" themeColor="danger">
              {startError ?? actions.error}
            </ThemedText>
          ) : null}

          <View style={styles.section}>
            <SectionLabel action={{ label: 'Plans', onPress: () => router.push('/plans') }}>
              This week
            </SectionLabel>
            <WeekCard
              todayKey={todayKey}
              days={home.week}
              goal={home.weekGoal}
              consistency={home.consistency}
              onStartPlanned={(day: HomeWeekDay) => {
                if (day.planned) startEntry(day.planned);
              }}
              onOpenWorkout={(sessionId) => router.push(`/session/${sessionId}`)}
            />
          </View>

          <View style={styles.section}>
            <SectionLabel action={{ label: 'See all', onPress: () => router.push('/history') }}>
              Recent
            </SectionLabel>
            {home.recent.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing logged yet. Your first workout shows up here.
              </ThemedText>
            ) : (
              home.recent.map((item) => (
                <ListRow
                  key={`${item.kind}-${item.id}`}
                  title={item.title}
                  meta={item.meta}
                  onPress={
                    item.kind === 'workout' ? () => router.push(`/session/${item.id}`) : undefined
                  }
                />
              ))
            )}
          </View>
        </>
      )}

      <SheetHost visible={panel !== null} onClose={() => setPanel(null)} size={size}>
        {panel === 'start' ? (
          <MenuPanel title="Start something else" actions={startActions} />
        ) : null}

        {panel === 'account' ? (
          <MenuPanel
            title={name || 'Account'}
            subtitle={user?.email ?? undefined}
            actions={accountActions}
          />
        ) : null}

        {panel === 'log' ? (
          <LogActivityPanel
            todayKey={todayKey}
            onSave={async (activity) => {
              const saved = await actions.logActivity(activity);
              if (saved) setPanel(null);
              return saved;
            }}
          />
        ) : null}

        {panel === 'move' && missed ? (
          <PickDayPanel
            label={missed.label}
            todayKey={todayKey}
            busy={actions.busy}
            onPick={async (dateKey) => {
              if (await actions.moveEntry(missed.id, dateKey)) setPanel(null);
            }}
            onCancel={() => setPanel(null)}
          />
        ) : null}
      </SheetHost>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  avatar: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  initial: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  loading: {
    paddingVertical: 48,
  },
  section: {
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});
