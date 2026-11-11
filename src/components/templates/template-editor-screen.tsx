import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { type MenuAction, MenuPanel } from '@/components/session/panels/list-panels';
import { ExerciseSearchPanel } from '@/components/session/panels/exercise-search-panel';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  EllipsisIcon,
  PlusIcon,
  Trash2Icon,
} from '@/components/ui/icons';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetHost } from '@/components/ui/sheet';
import { FontFamily, MaxContentWidth, Radius } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { usePlans } from '@/hooks/use-plans';
import { useStartWorkout } from '@/hooks/use-start-workout';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutHistory } from '@/hooks/use-workout-history';
import { exerciseFromLine } from '@/lib/session/session-state';
import { recentExercises, suggestedForSearch } from '@/lib/session/exercise-suggestions';
import {
  clampTargetSets,
  lineFromExercise,
  lineMeta,
  moveLine,
  targetSetsOf,
  templateProblem,
  templateToSave,
} from '@/lib/template-model';
import { confirm } from '@/services/confirm';
import { MAX_TEMPLATE_LINES } from '@/services/firestore/planner-mappers';
import { createPlan, deletePlan, updatePlan } from '@/services/firestore/planner-repository';
import { newLineId } from '@/services/ids';
import type { PlanLine, WorkoutPlan } from '@/types/workout';

type TemplateEditorScreenProps = {
  /** A template id, or `new` to make one. */
  planId: string;
};

/** Loads the template being edited, and covers it not being there. */
export function TemplateEditorScreen({ planId }: TemplateEditorScreenProps) {
  const theme = useTheme();
  const { plans, isLoading, error } = usePlans();
  const isNew = planId === 'new';
  const plan = isNew ? null : (plans.find((candidate) => candidate.id === planId) ?? null);

  if (!isNew && !plan) {
    return (
      <SafeAreaView style={[styles.root, styles.centered, { backgroundColor: theme.background }]}>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <ThemedText type="small" themeColor={error ? 'danger' : 'textSecondary'}>
              {error ?? 'This template no longer exists.'}
            </ThemedText>
            <Button label="Back" variant="secondary" onPress={() => router.back()} />
          </>
        )}
      </SafeAreaView>
    );
  }

  // Keyed so switching templates never carries one's draft into another.
  return <TemplateEditor key={plan?.id ?? 'new'} initial={plan} />;
}

type Panel = 'add' | 'options' | { line: PlanLine } | null;

/**
 * Building or editing a workout template: a name, and exercises with how many
 * sets each. Nothing is saved until "Save template".
 */
function TemplateEditor({ initial }: { initial: WorkoutPlan | null }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const uid = user?.uid;
  const { sessions } = useWorkoutHistory();
  const { start, isStarting } = useStartWorkout();

  const [name, setName] = useState(initial?.name ?? '');
  const [lines, setLines] = useState<PlanLine[]>(initial?.lines ?? []);
  const [panel, setPanel] = useState<Panel>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKey, setSearchKey] = useState(0);

  const saved = JSON.stringify({ name: initial?.name ?? '', lines: initial?.lines ?? [] });
  const isDirty = JSON.stringify({ name, lines }) !== saved;
  const problem = templateProblem(name, lines);
  const room = MAX_TEMPLATE_LINES - lines.length;
  const current = lines.map(exerciseFromLine);

  const setTargetSets = (lineId: string, delta: number) =>
    setLines((all) =>
      all.map((line) =>
        line.lineId === lineId
          ? { ...line, targetSets: clampTargetSets(targetSetsOf(line) + delta) }
          : line,
      ),
    );

  const shiftLine = (lineId: string, delta: -1 | 1) =>
    setLines((all) => moveLine(all, all.findIndex((line) => line.lineId === lineId), delta));

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/planner'));

  const back = async () => {
    if (isDirty) {
      const ok = await confirm({
        title: 'Discard your changes?',
        message: 'The template stays as it was last saved.',
        confirmLabel: 'Discard changes',
        destructive: true,
      });
      if (!ok) return;
    }
    leave();
  };

  const save = async () => {
    if (!uid || problem) return;

    setSaving(true);
    setError(null);
    try {
      const plan = templateToSave(name, lines, initial, new Date());
      if (initial) {
        await updatePlan(uid, { ...plan, id: initial.id });
        leave();
      } else {
        const id = await createPlan(uid, plan);
        router.replace(`/templates/${id}`);
      }
    } catch {
      setError('Could not save the template. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setPanel(null);
    if (!uid || !initial) return;

    const ok = await confirm({
      title: `Delete ${initial.name}?`,
      message: 'Workouts you logged from it are not affected.',
      confirmLabel: 'Delete template',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deletePlan(uid, initial.id);
      leave();
    } catch {
      setError('Could not delete the template. Check your connection and try again.');
    }
  };

  const lineActions = (line: PlanLine): MenuAction[] => {
    const index = lines.findIndex((candidate) => candidate.lineId === line.lineId);
    const close = (run: () => void) => () => {
      run();
      setPanel(null);
    };

    return [
      { label: 'Move up', icon: ArrowUpIcon, disabled: index <= 0, onPress: close(() => shiftLine(line.lineId, -1)) },
      {
        label: 'Move down',
        icon: ArrowDownIcon,
        disabled: index >= lines.length - 1,
        onPress: close(() => shiftLine(line.lineId, 1)),
      },
      {
        label: 'Remove',
        icon: Trash2Icon,
        destructive: true,
        onPress: close(() => setLines((all) => all.filter((candidate) => candidate.lineId !== line.lineId))),
      },
    ];
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <IconButton icon={ArrowLeftIcon} accessibilityLabel="Back" variant="plain" onPress={() => void back()} />
          <ThemedText type="labelStrong" accessibilityRole="header">
            {initial ? 'Edit template' : 'New template'}
          </ThemedText>
          {initial ? (
            <IconButton
              icon={EllipsisIcon}
              accessibilityLabel="Template options"
              variant="plain"
              onPress={() => setPanel('options')}
            />
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <View style={styles.field}>
          <ThemedText type="overline">Name</ThemedText>
          <TextInput
            accessibilityLabel="Template name"
            value={name}
            onChangeText={setName}
            placeholder="Push day"
            placeholderTextColor={theme.textFaint}
            maxLength={200}
            style={[
              styles.name,
              { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
            ]}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel>{`Exercises · ${lines.length}`}</SectionLabel>

          {lines.map((line, index) => (
            <View
              key={line.lineId}
              style={[styles.line, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ThemedText type="monoSmall" themeColor="textFaint" style={styles.number}>
                {index + 1}
              </ThemedText>
              <View style={styles.lineText}>
                <ThemedText type="label" numberOfLines={1}>
                  {line.nameSnapshot}
                </ThemedText>
                <ThemedText type="caption" numberOfLines={1}>
                  {lineMeta(line)}
                </ThemedText>
              </View>
              <View style={[styles.stepper, { borderColor: theme.border }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Fewer sets of ${line.nameSnapshot}`}
                  hitSlop={4}
                  onPress={() => setTargetSets(line.lineId, -1)}
                  style={styles.step}>
                  <ThemedText style={styles.stepGlyph} themeColor="textBody">
                    −
                  </ThemedText>
                </Pressable>
                <ThemedText type="small" style={styles.stepValue}>
                  {targetSetsOf(line)} sets
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`More sets of ${line.nameSnapshot}`}
                  hitSlop={4}
                  onPress={() => setTargetSets(line.lineId, 1)}
                  style={styles.step}>
                  <ThemedText style={styles.stepGlyph} themeColor="textBody">
                    +
                  </ThemedText>
                </Pressable>
              </View>
              <IconButton
                icon={EllipsisIcon}
                accessibilityLabel={`Actions for ${line.nameSnapshot}`}
                variant="plain"
                size={36}
                muted
                onPress={() => setPanel({ line })}
              />
            </View>
          ))}

          {room > 0 ? (
            <Button
              label="Add exercises"
              icon={PlusIcon}
              variant="dashed"
              size="lg"
              onPress={() => {
                setSearchKey((key) => key + 1);
                setPanel('add');
              }}
            />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              That&apos;s the {MAX_TEMPLATE_LINES}-exercise limit for a template.
            </ThemedText>
          )}
        </View>

        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}>
        {initial ? (
          <Button
            label="Start now"
            variant="secondary"
            busy={isStarting}
            disabled={lines.length === 0}
            // Starts from what is on screen, saved or not.
            onPress={() => void start({ ...initial, name: name.trim() || initial.name, lines })}
          />
        ) : null}
        <Button
          label="Save template"
          onPress={() => void save()}
          busy={saving}
          disabled={Boolean(problem) || (!isDirty && Boolean(initial))}
          accessibilityLabel={problem ? `Save template. ${problem}` : 'Save template'}
          style={styles.flex}
        />
      </View>

      <SheetHost visible={panel !== null} onClose={() => setPanel(null)} size={panel === 'add' ? 'tall' : 'content'}>
        {panel === 'add' ? (
          <ExerciseSearchPanel
            key={searchKey}
            mode={{ kind: 'add', afterName: lines[lines.length - 1]?.nameSnapshot ?? null, room }}
            suggested={suggestedForSearch(sessions, current)}
            recent={recentExercises(sessions)}
            onAdd={(picked) => {
              setLines((all) => [...all, ...picked.map((exercise) => lineFromExercise(exercise, newLineId))]);
              setPanel(null);
            }}
            onReplace={() => setPanel(null)}
          />
        ) : null}

        {panel === 'options' ? (
          <MenuPanel
            title="Template"
            actions={[{ label: 'Delete template', icon: Trash2Icon, destructive: true, onPress: () => void remove() }]}
          />
        ) : null}

        {panel !== null && typeof panel === 'object' ? (
          <MenuPanel title={panel.line.nameSnapshot} actions={lineActions(panel.line)} />
        ) : null}
      </SheetHost>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignSelf: 'center',
    gap: 14,
    maxWidth: MaxContentWidth,
    padding: 16,
    paddingTop: 8,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -10,
  },
  headerSpacer: {
    width: 44,
  },
  field: {
    gap: 6,
  },
  name: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    fontFamily: FontFamily.semibold,
    fontSize: 17,
    height: 48,
    paddingHorizontal: 12,
  },
  section: {
    gap: 8,
  },
  line: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 64,
    paddingLeft: 12,
    paddingRight: 4,
  },
  number: {
    width: 20,
  },
  lineText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  stepper: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    height: 40,
  },
  step: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 36,
  },
  stepGlyph: {
    fontSize: 18,
    lineHeight: 22,
  },
  stepValue: {
    minWidth: 44,
    textAlign: 'center',
  },
  bar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  flex: {
    flex: 1,
  },
});
