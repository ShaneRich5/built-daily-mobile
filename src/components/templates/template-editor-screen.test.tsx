import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { TemplateEditorScreen } from '@/components/templates/template-editor-screen';
import { useSession } from '@/contexts/session';
import { EXERCISE_CATALOG } from '@/lib/exercise-catalog';
import { confirm } from '@/services/confirm';
import { createPlan, deletePlan, updatePlan } from '@/services/firestore/planner-repository';
import {
  createSession,
  subscribeToPlans,
  subscribeToRecentSessions,
} from '@/services/firestore/workout-repository';
import type { WorkoutPlan } from '@/types/workout';

jest.mock('@/contexts/session');
jest.mock('@/services/confirm');
jest.mock('@/services/firestore/workout-repository');
jest.mock('@/services/firestore/planner-repository');
jest.mock('@/services/ids', () => {
  let n = 0;
  return { newLineId: () => `new-line-${++n}`, newCustomExerciseId: () => 'custom-new' };
});
jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));

const mockedCreate = jest.mocked(createPlan);
const mockedUpdate = jest.mocked(updatePlan);
const mockedDelete = jest.mocked(deletePlan);
const mockedConfirm = jest.mocked(confirm);

const [first, second] = EXERCISE_CATALOG;

const push: WorkoutPlan = {
  id: 'push',
  name: 'Push day',
  source: 'custom',
  createdAt: new Date(2026, 0, 1),
  updatedAt: new Date(2026, 0, 1),
  lines: [
    { lineId: 'a', exerciseId: first.id, nameSnapshot: first.name, metric: first.metric, targetSets: 3, notes: null },
    { lineId: 'b', exerciseId: second.id, nameSnapshot: second.name, metric: second.metric, targetSets: 4, notes: null },
  ],
};

beforeEach(() => {
  jest.mocked(useSession).mockReturnValue({ user: { uid: 'user-1' } as never, isLoading: false });
  jest.mocked(subscribeToPlans).mockImplementation((_uid, { onData }) => {
    onData([push]);
    return jest.fn();
  });
  jest.mocked(subscribeToRecentSessions).mockImplementation((_uid, { onData }) => {
    onData([]);
    return jest.fn();
  });
  mockedCreate.mockResolvedValue('created');
  mockedUpdate.mockResolvedValue(undefined);
  mockedDelete.mockResolvedValue(undefined);
  mockedConfirm.mockResolvedValue(true);
  jest.mocked(createSession).mockResolvedValue('session');
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('editing a template', () => {
  it('shows its name and exercises', async () => {
    await render(<TemplateEditorScreen planId="push" />);

    expect(screen.getByDisplayValue('Push day')).toBeTruthy();
    expect(screen.getByText('Exercises · 2')).toBeTruthy();
    expect(screen.getByText('4 sets')).toBeTruthy();
  });

  it('has nothing to save until something changes', async () => {
    await render(<TemplateEditorScreen planId="push" />);

    expect(screen.getByRole('button', { name: 'Save template' })).toBeDisabled();
  });

  it('saves a changed set count and name', async () => {
    await render(<TemplateEditorScreen planId="push" />);

    await userEvent.press(screen.getByRole('button', { name: `More sets of ${first.name}` }));
    await userEvent.clear(screen.getByLabelText('Template name'));
    await userEvent.type(screen.getByLabelText('Template name'), 'Push A');
    await userEvent.press(screen.getByRole('button', { name: 'Save template' }));

    expect(mockedUpdate).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        id: 'push',
        name: 'Push A',
        createdAt: push.createdAt,
        lines: [expect.objectContaining({ lineId: 'a', targetSets: 4 }), expect.objectContaining({ lineId: 'b' })],
      }),
    );
    expect(router.back).toHaveBeenCalled();
  });

  it('reorders and removes exercises from a line’s menu', async () => {
    await render(<TemplateEditorScreen planId="push" />);

    await userEvent.press(screen.getByRole('button', { name: `Actions for ${second.name}` }));
    await userEvent.press(screen.getByRole('button', { name: 'Move up' }));
    await userEvent.press(screen.getByRole('button', { name: `Actions for ${first.name}` }));
    await userEvent.press(screen.getByRole('button', { name: 'Remove' }));
    await userEvent.press(screen.getByRole('button', { name: 'Save template' }));

    expect(mockedUpdate.mock.calls[0][1].lines.map((line) => line.lineId)).toEqual(['b']);
  });

  it('adds exercises from the search sheet, at three sets', async () => {
    await render(<TemplateEditorScreen planId="push" />);

    const third = EXERCISE_CATALOG[2];
    await userEvent.press(screen.getByRole('button', { name: 'Add exercises' }));
    await userEvent.press(screen.getByRole('button', { name: third.name }));
    await userEvent.press(screen.getByRole('button', { name: 'Add 1 exercise' }));

    expect(screen.getByText('Exercises · 3')).toBeTruthy();
    expect(screen.getAllByText('3 sets')).toHaveLength(2);
  });

  it('asks before leaving with unsaved changes', async () => {
    mockedConfirm.mockResolvedValue(false);
    await render(<TemplateEditorScreen planId="push" />);

    await userEvent.press(screen.getByRole('button', { name: `Fewer sets of ${second.name}` }));
    await userEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockedConfirm).toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('deletes the template after asking', async () => {
    await render(<TemplateEditorScreen planId="push" />);

    await userEvent.press(screen.getByRole('button', { name: 'Template options' }));
    await userEvent.press(screen.getByRole('button', { name: 'Delete template' }));

    expect(mockedDelete).toHaveBeenCalledWith('user-1', 'push');
  });

  it('starts a workout from what is on screen', async () => {
    await render(<TemplateEditorScreen planId="push" />);

    await userEvent.press(screen.getByRole('button', { name: 'Start now' }));

    expect(createSession).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ planId: 'push', title: 'Push day' }),
    );
  });

  it('says so for a template that no longer exists', async () => {
    await render(<TemplateEditorScreen planId="gone" />);

    expect(screen.getByText('This template no longer exists.')).toBeTruthy();
  });
});

describe('a new template', () => {
  it('cannot be saved without a name and an exercise', async () => {
    await render(<TemplateEditorScreen planId="new" />);

    expect(screen.getByRole('header', { name: 'New template' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Save template. Give the template a name.' }),
    ).toBeDisabled();
  });

  it('is created, then opened for editing', async () => {
    await render(<TemplateEditorScreen planId="new" />);

    await userEvent.type(screen.getByLabelText('Template name'), 'Legs');
    await userEvent.press(screen.getByRole('button', { name: 'Add exercises' }));
    await userEvent.press(screen.getByRole('button', { name: first.name }));
    await userEvent.press(screen.getByRole('button', { name: 'Add 1 exercise' }));
    await userEvent.press(screen.getByRole('button', { name: 'Save template' }));

    expect(mockedCreate).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        name: 'Legs',
        source: 'custom',
        lines: [expect.objectContaining({ exerciseId: first.id, targetSets: 3 })],
      }),
    );
    expect(router.replace).toHaveBeenCalledWith('/templates/created');
  });
});
