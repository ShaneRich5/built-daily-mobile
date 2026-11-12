import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddExerciseFooter } from '@/components/session/add-exercise-footer';
import { ExerciseCard } from '@/components/session/exercise-card';
import {
  AddMaybeButton,
  AlternateChips,
  MaybeSection,
} from '@/components/session/maybe-section';
import { ExerciseDetailsPanel } from '@/components/session/panels/exercise-details-panel';
import { ExerciseSearchPanel } from '@/components/session/panels/exercise-search-panel';
import {
  type MenuAction,
  MenuPanel,
  MoveExercisePanel,
  ReorderPanel,
  SwapExercisePanel,
} from '@/components/session/panels/list-panels';
import { WorkoutDetailsPanel } from '@/components/session/panels/workout-details-panel';
import { SessionActionBar } from '@/components/session/session-action-bar';
import { EditHeader, LiveHeader, WorkoutTitleCard } from '@/components/session/session-header';
import { ThemedText } from '@/components/themed-text';
import { ArrowDownUpIcon, NotebookPenIcon, Trash2Icon } from '@/components/ui/icons';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetHost, type SheetSize } from '@/components/ui/sheet';
import { MaxContentWidth } from '@/constants/theme';
import { useLiveWorkout } from '@/hooks/use-live-workout';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutHistory } from '@/hooks/use-workout-history';
import type { CatalogExercise } from '@/lib/exercise-catalog';
import { type ExercisePerformance, performancesByExercise } from '@/lib/exercise-history';
import { sessionDayLabel } from '@/lib/session-format';
import { defaultSessionTitle } from '@/lib/session-start';
import {
  recentExercises,
  suggestedForSearch,
  suggestNextExercises,
} from '@/lib/session/exercise-suggestions';
import {
  countDoneSets,
  exerciseProgress,
  isUntouchedMaybe,
  MAX_SESSION_EXERCISES,
  volumeLine,
} from '@/lib/session/session-model';
import { fullIndexForSectionMove, nextUnfinishedAfter } from '@/lib/session/session-reducer';
import { timeLabel } from '@/lib/session/session-summary';
import {
  rowsFromHistory,
  setRowHasMeasurements,
  setRowIsBlank,
  type SetRow,
} from '@/lib/session/set-row';
import { confirm } from '@/services/confirm';
import type { WorkoutSession } from '@/types/workout';

/** Which sheet is showing. One host shows them all, so only one can be up. */
type Panel =
  | 'add'
  | 'addMaybe'
  | 'swap'
  | 'swapSearch'
  | 'details'
  | 'move'
  | 'reorder'
  | 'workout'
  | 'menu'
  | null;

const TALL_PANELS: ReadonlySet<Panel> = new Set(['add', 'addMaybe', 'swapSearch', 'details', 'reorder']);

type WorkoutScreenProps = {
  /** Seeds the screen once; see `useLiveWorkout` for why later snapshots are ignored. */
  session: WorkoutSession;
  /**
   * `live` logs a workout in progress: sets are ticked off, changes save as
   * they are made, and the main action finishes it. `edit` corrects a finished
   * one: nothing is saved until "Save changes", and it can be cancelled.
   */
  mode: 'live' | 'edit';
};

/** The workout screen: quick cards for logging, sheets for everything else. */
export function WorkoutScreen({ session, mode }: WorkoutScreenProps) {
  const theme = useTheme();
  const isLive = mode === 'live';
  const workout = useLiveWorkout(session, { autosave: isLive });
  const { state, dispatch } = workout;
  const { sessions: pastSessions, isLoading: historyLoading } = useWorkoutHistory(session.id);

  const [panel, setPanel] = useState<Panel>(null);
  /** The exercise the details / move / swap sheet is about. */
  const [focusLineId, setFocusLineId] = useState<string | null>(null);
  /** Bumped on every open so the search sheet starts fresh. */
  const [searchKey, setSearchKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const scroll = useRef<ScrollViewInstance>(null);
  /** Where the exercise list starts in the scroll content, and each card within it. */
  const listOffset = useRef(0);
  const cardOffsets = useRef(new Map<string, number>());

  const exercises = state.exercises;
  const planItems = exercises.filter((item) => item.section === 'plan');
  const maybeItems = exercises.filter((item) => item.section === 'maybe');
  const focusItem = exercises.find((item) => item.lineId === focusLineId);
  /** The plan or the maybes, whichever the focused exercise is in. */
  const focusSection = focusItem?.section === 'maybe' ? maybeItems : planItems;
  const focusIndex = focusItem ? focusSection.indexOf(focusItem) : -1;
  // Untouched maybes don't count toward the workout until one is started.
  const counted = exercises.filter((item) => !isUntouchedMaybe(item));
  const setCount = counted.reduce((total, item) => total + item.sets.length, 0);
  const atLimit = exercises.length >= MAX_SESSION_EXERCISES;
  const title = state.title.trim() || defaultSessionTitle(session.startedAt);

  const history = performancesByExercise(pastSessions);
  const current = exercises.map((item) => item.exercise);
  const lastTimeSets = (exerciseId: string) => history.get(exerciseId)?.[0]?.sets;

  const closePanel = () => setPanel(null);

  const openSearch = (kind: 'add' | 'addMaybe' | 'swapSearch') => {
    setSearchKey((key) => key + 1);
    setPanel(kind);
  };

  const openDetails = (lineId: string) => {
    setFocusLineId(lineId);
    setPanel('details');
  };

  /** Opens a card and scrolls it into view — after adding, or "Next exercise". */
  const scrollToCard = (lineId: string | null) => {
    const offset = lineId ? cardOffsets.current.get(lineId) : undefined;
    if (offset === undefined) return;

    scroll.current?.scrollTo({ y: Math.max(0, listOffset.current + offset - 16), animated: true });
  };

  const addExercises = (picked: readonly CatalogExercise[], section: 'plan' | 'maybe' = 'plan') => {
    workout.addExercises(picked, section);
    setPanel(null);
    // The new cards are not laid out yet, so there is no offset to go to; the
    // end of the list is where they land.
    if (section === 'plan') requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
  };

  /** Machine taken: put `next` in this slot. The old exercise stays one tap away. */
  const swapExercise = async (lineId: string, next: CatalogExercise) => {
    const item = exercises.find((candidate) => candidate.lineId === lineId);
    if (!item) return;

    const metricChanges = item.exercise.metric !== next.metric;
    if (metricChanges && item.sets.some(setRowHasMeasurements)) {
      const ok = await confirm({
        title: `Swap to ${next.name}?`,
        message: `${next.name} is logged differently than ${item.exercise.name}, so the sets you already logged will be cleared.`,
        confirmLabel: 'Swap and clear',
        destructive: true,
      });
      if (!ok) return;
    }

    dispatch({ type: 'swapExercise', lineId, exercise: next });
    if (item.section === 'plan') dispatch({ type: 'openExercise', lineId });
    setPanel(null);
  };

  const moveWithinSection = (lineId: string, toIndex: number) =>
    dispatch({
      type: 'moveExercise',
      lineId,
      toIndex: fullIndexForSectionMove(exercises, lineId, toIndex),
    });

  const toggleSection = () => {
    if (!focusItem) return;

    dispatch({
      type: 'setSection',
      lineId: focusItem.lineId,
      section: focusItem.section === 'maybe' ? 'plan' : 'maybe',
    });
    setPanel(null);
  };

  const removeExercise = async () => {
    if (!focusItem) return;

    const ok = await confirm({
      title: `Remove ${focusItem.exercise.name}?`,
      message: 'Its sets are removed from this workout too.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;

    dispatch({ type: 'removeExercise', lineId: focusItem.lineId });
    setPanel(null);
  };

  const removeSet = async (lineId: string, setIndex: number, name: string, set: SetRow | undefined) => {
    // An empty row goes without a question; one with numbers in it is asked about.
    if (set && !setRowIsBlank(set)) {
      const ok = await confirm({
        title: `Remove set ${setIndex + 1} from ${name}?`,
        confirmLabel: 'Remove',
        destructive: true,
      });
      if (!ok) return;
    }

    dispatch({ type: 'removeSet', lineId, setIndex });
  };

  const applyHistory = async (performance: ExercisePerformance) => {
    if (!focusItem) return;

    if (focusItem.sets.some(setRowHasMeasurements)) {
      const ok = await confirm({
        title: `Replace the sets for ${focusItem.exercise.name}?`,
        message: 'The sets you have logged here are replaced with the ones from that day.',
        confirmLabel: 'Replace',
        destructive: true,
      });
      if (!ok) return;
    }

    dispatch({
      type: 'replaceSets',
      lineId: focusItem.lineId,
      sets: rowsFromHistory(performance.sets),
    });
  };

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const finish = async () => {
    setBusy(true);
    // On success the document turns "completed" and the route swaps this
    // screen for the summary, so there is nowhere to navigate to.
    const finished = await workout.finish();
    if (!finished) setBusy(false);
  };

  const saveChanges = async () => {
    setBusy(true);
    const saved = await workout.save();
    setBusy(false);
    if (saved) leave();
  };

  const cancelEdit = async () => {
    if (workout.isDirty) {
      const ok = await confirm({
        title: 'Discard your changes?',
        message: 'This workout goes back to how it was saved.',
        confirmLabel: 'Discard changes',
        destructive: true,
      });
      if (!ok) return;
    }
    leave();
  };

  const deleteWorkout = async () => {
    setPanel(null);
    const ok = await confirm({
      title: 'Delete this workout?',
      message: 'It is removed permanently and cannot be brought back.',
      confirmLabel: 'Delete workout',
      destructive: true,
    });
    if (!ok) return;

    if (await workout.discard()) router.replace('/');
  };

  const menuActions: MenuAction[] = [
    { label: 'Name & note', icon: NotebookPenIcon, onPress: () => setPanel('workout') },
    {
      label: 'Reorder exercises',
      icon: ArrowDownUpIcon,
      disabled: planItems.length < 2,
      onPress: () => setPanel('reorder'),
    },
    { label: 'Delete workout', icon: Trash2Icon, destructive: true, onPress: () => void deleteWorkout() },
  ];

  const size: SheetSize = TALL_PANELS.has(panel) ? 'tall' : 'content';

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {isLive ? (
            <LiveHeader saveStatus={workout.status} onHome={leave} />
          ) : (
            <EditHeader unsaved={workout.isDirty} onCancel={() => void cancelEdit()} />
          )}

          <WorkoutTitleCard
            title={title}
            meta={
              isLive
                ? volumeLine(counted.length, setCount, countDoneSets(counted))
                : [
                    sessionDayLabel({
                      workoutDate: state.workoutDate || null,
                      endedAt: session.endedAt,
                      startedAt: session.startedAt,
                    }),
                    state.workoutTime ? timeLabel(state.workoutTime) : null,
                    state.workoutNote.trim() ? 'note' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
            }
            onPress={() => setPanel('workout')}
          />

          {!isLive && workout.status === 'error' ? (
            <ThemedText type="small" themeColor="danger">
              Could not save your changes. Check your connection and try again.
            </ThemedText>
          ) : null}

          <View
            style={styles.section}
            onLayout={(event) => {
              listOffset.current = event.nativeEvent.layout.y;
            }}>
            <SectionLabel
              action={
                planItems.length > 1
                  ? { label: 'Reorder', onPress: () => setPanel('reorder') }
                  : undefined
              }>
              {maybeItems.length > 0 ? 'Plan' : 'Exercises'}
            </SectionLabel>

            {planItems.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {maybeItems.length > 0
                  ? 'Nothing in the plan yet. Tap Do it on a maybe, or add an exercise below.'
                  : isLive
                    ? 'Add your first exercise below, or finish without details if you just want to log that you showed up.'
                    : 'No exercises in this workout. Add one below.'}
              </ThemedText>
            ) : (
              planItems.map((item) => {
                const open = state.openLineId === item.lineId;

                return (
                  <View
                    key={item.lineId}
                    onLayout={(event) =>
                      cardOffsets.current.set(item.lineId, event.nativeEvent.layout.y)
                    }>
                    <ExerciseCard
                      item={item}
                      open={open}
                      lastTimeSets={lastTimeSets(item.exercise.id)}
                      hasNextExercise={nextUnfinishedAfter(exercises, item.lineId) !== null}
                      onRemoveSet={
                        isLive
                          ? undefined
                          : (setIndex) =>
                              void removeSet(
                                item.lineId,
                                setIndex,
                                item.exercise.name,
                                item.sets[setIndex],
                              )
                      }
                      onToggleOpen={() =>
                        dispatch({ type: 'openExercise', lineId: open ? null : item.lineId })
                      }
                      onOpenDetails={() => openDetails(item.lineId)}
                      onUpdateSet={(setIndex, patch) =>
                        dispatch({ type: 'updateSet', lineId: item.lineId, setIndex, patch })
                      }
                      onToggleSetDone={(setIndex, suggestion) =>
                        dispatch({ type: 'toggleSetDone', lineId: item.lineId, setIndex, suggestion })
                      }
                      onAddSet={() => dispatch({ type: 'addSet', lineId: item.lineId })}
                      onCopyLastSet={() => dispatch({ type: 'copyLastSet', lineId: item.lineId })}
                      onNextExercise={() => {
                        scrollToCard(nextUnfinishedAfter(exercises, item.lineId));
                        dispatch({ type: 'openNextExercise', afterLineId: item.lineId });
                      }}
                    />
                    {!open && exerciseProgress(item.sets) === 'not_started' ? (
                      <AlternateChips
                        currentName={item.exercise.name}
                        alternates={item.alternates}
                        onSwap={(next) => void swapExercise(item.lineId, next)}
                      />
                    ) : null}
                  </View>
                );
              })
            )}

            <AddExerciseFooter
              suggestions={suggestNextExercises(pastSessions, current)}
              isFirst={exercises.length === 0}
              atLimit={atLimit}
              onOpenSearch={() => openSearch('add')}
              onAddSuggestion={(exercise) => addExercises([exercise])}
            />
          </View>

          {maybeItems.length > 0 ? (
            <MaybeSection
              items={maybeItems}
              lastTimeSets={lastTimeSets}
              canAdd={!atLimit}
              onDoIt={(lineId) => dispatch({ type: 'setSection', lineId, section: 'plan', open: true })}
              onOpenDetails={openDetails}
              onAddMaybe={() => openSearch('addMaybe')}
            />
          ) : planItems.length > 0 && !atLimit ? (
            <AddMaybeButton quiet onPress={() => openSearch('addMaybe')} />
          ) : null}
        </ScrollView>

        {isLive ? (
          <SessionActionBar
            primaryLabel={exercises.length > 0 ? 'Finish workout' : 'Finish without details'}
            onPrimary={() => void finish()}
            primaryBusy={busy}
            onMore={() => setPanel('menu')}
            onAdd={() => openSearch('add')}
            addDisabled={atLimit}
          />
        ) : (
          <SessionActionBar
            primaryLabel="Save changes"
            onPrimary={() => void saveChanges()}
            primaryBusy={busy}
            primaryDisabled={!workout.isDirty}
            onMore={() => setPanel('menu')}
            onAdd={() => openSearch('add')}
            addDisabled={atLimit}
          />
        )}
      </KeyboardAvoidingView>

      <SheetHost visible={panel !== null} onClose={closePanel} size={size}>
        {panel === 'menu' ? <MenuPanel title="Workout" actions={menuActions} /> : null}

        {panel === 'workout' ? (
          <WorkoutDetailsPanel
            meta={state}
            defaultTitle={defaultSessionTitle(session.startedAt)}
            onChange={(patch) => dispatch({ type: 'updateMeta', patch })}
            onDone={closePanel}
          />
        ) : null}

        {panel === 'add' || panel === 'addMaybe' || panel === 'swapSearch' ? (
          <ExerciseSearchPanel
            key={searchKey}
            mode={
              panel === 'swapSearch' && focusItem
                ? { kind: 'replace', currentName: focusItem.exercise.name }
                : {
                    kind: 'add',
                    afterName:
                      panel === 'addMaybe'
                        ? null
                        : (planItems[planItems.length - 1]?.exercise.name ?? null),
                    room: MAX_SESSION_EXERCISES - exercises.length,
                  }
            }
            suggested={suggestedForSearch(pastSessions, current)}
            recent={recentExercises(pastSessions)}
            onAdd={(picked) => addExercises(picked, panel === 'addMaybe' ? 'maybe' : 'plan')}
            onReplace={(next) => focusItem && void swapExercise(focusItem.lineId, next)}
          />
        ) : null}

        {panel === 'details' && focusItem ? (
          <ExerciseDetailsPanel
            key={focusItem.lineId}
            item={focusItem}
            position={focusIndex + 1}
            total={focusSection.length}
            history={history.get(focusItem.exercise.id) ?? []}
            historyLoading={historyLoading}
            onUpdateSet={(setIndex, patch) =>
              dispatch({ type: 'updateSet', lineId: focusItem.lineId, setIndex, patch })
            }
            onAddSet={() => dispatch({ type: 'addSet', lineId: focusItem.lineId })}
            onCopyLastSet={() => dispatch({ type: 'copyLastSet', lineId: focusItem.lineId })}
            onRemoveSet={(setIndex) =>
              void removeSet(
                focusItem.lineId,
                setIndex,
                focusItem.exercise.name,
                focusItem.sets[setIndex],
              )
            }
            onUseHistory={(performance) => void applyHistory(performance)}
            onNoteChange={(note) =>
              dispatch({ type: 'setExerciseNote', lineId: focusItem.lineId, note })
            }
            onSwapExercise={() => setPanel('swap')}
            onMoveExercise={() => setPanel('move')}
            onToggleSection={toggleSection}
            onRemoveExercise={() => void removeExercise()}
            onDone={closePanel}
          />
        ) : null}

        {panel === 'swap' && focusItem ? (
          <SwapExercisePanel
            item={focusItem}
            onSwap={(next) => void swapExercise(focusItem.lineId, next)}
            onSearchAll={() => openSearch('swapSearch')}
            onKeep={closePanel}
          />
        ) : null}

        {panel === 'move' && focusItem ? (
          <MoveExercisePanel
            exercises={focusSection}
            lineId={focusItem.lineId}
            onMove={(lineId, toIndex) => {
              moveWithinSection(lineId, toIndex);
              setPanel(null);
            }}
            onCancel={closePanel}
          />
        ) : null}

        {panel === 'reorder' ? (
          <ReorderPanel exercises={planItems} onMove={moveWithinSection} onDone={closePanel} />
        ) : null}
      </SheetHost>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    gap: 12,
    maxWidth: MaxContentWidth,
    padding: 16,
    paddingBottom: 24,
    width: '100%',
  },
  section: {
    gap: 8,
  },
});
