import {
  planPreview,
  planSourceLabel,
  planUpdatedLabel,
  planVolumeLabel,
} from '@/lib/plan-format';
import type { PlanLine } from '@/types/workout';

function line(nameSnapshot: string, targetSets: number | null = 3): PlanLine {
  return {
    lineId: `line-${nameSnapshot}`,
    exerciseId: 'bench',
    nameSnapshot,
    metric: 'weight_reps',
    targetSets,
    notes: null,
  };
}

describe('planVolumeLabel', () => {
  it('counts exercises and planned sets', () => {
    expect(planVolumeLabel({ lines: [line('Bench'), line('Row', 4)] })).toBe(
      '2 exercises · 7 sets planned',
    );
  });

  it('uses the singular for one exercise and one set', () => {
    expect(planVolumeLabel({ lines: [line('Bench', 1)] })).toBe('1 exercise · 1 set planned');
  });

  // A half-filled total would understate the plan, so it is left off entirely.
  it('omits the set count when a line has no target', () => {
    expect(planVolumeLabel({ lines: [line('Bench'), line('Row', null)] })).toBe('2 exercises');
  });

  it('describes an empty plan without a set count', () => {
    expect(planVolumeLabel({ lines: [] })).toBe('0 exercises');
  });
});

describe('planPreview', () => {
  it('joins the first few names', () => {
    expect(planPreview({ lines: [line('Bench'), line('Row')] })).toBe('Bench, Row');
  });

  it('stops at the cap', () => {
    const lines = ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => line(name));
    expect(planPreview({ lines }, 2)).toBe('a, b');
  });
});

describe('planUpdatedLabel', () => {
  it('reads as a short date', () => {
    expect(planUpdatedLabel({ updatedAt: new Date(2026, 2, 4) })).toBe('Updated Mar 4');
  });
});

describe('planSourceLabel', () => {
  it('calls out a starter copy', () => {
    expect(planSourceLabel({ source: 'starter_copy' })).toBe('From a starter template');
  });

  it('says nothing about a plan the user built', () => {
    expect(planSourceLabel({ source: 'custom' })).toBeNull();
  });
});
