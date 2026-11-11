/**
 * The built-in starter plans, mirroring the web app's
 * `lib/starter-templates.ts`. Offered during onboarding and when planning a
 * day; a planner entry made from one stores the `starter-*` id as its `planId`
 * and the exercise ids directly, since there is no template document behind
 * it.
 *
 * The ids — both the starter's and its exercises' — are the contract with the
 * web app and must match it exactly.
 */
export type StarterTemplate = {
  id: string;
  name: string;
  exerciseIds: readonly string[];
};

export const STARTER_TEMPLATES: readonly StarterTemplate[] = [
  {
    id: 'starter-full-body',
    name: 'Full body',
    exerciseIds: ['squat', 'bench', 'row', 'deadlift', 'ohp', 'plank'],
  },
  { id: 'starter-upper', name: 'Upper body', exerciseIds: ['bench', 'row', 'ohp', 'pullup', 'dip'] },
  {
    id: 'starter-lower',
    name: 'Lower body',
    exerciseIds: ['squat', 'deadlift', 'rdl', 'lunge', 'plank'],
  },
  {
    id: 'starter-push',
    name: 'Push',
    exerciseIds: ['bench', 'ohp', 'dip', 'squat', 'lunge', 'plank'],
  },
  {
    id: 'starter-pull',
    name: 'Pull',
    exerciseIds: ['pullup', 'row', 'deadlift', 'rdl', 'bench', 'plank'],
  },
];
