/**
 * The kinds of activity that can be logged, mirroring the web app's
 * `lib/activity-catalog.ts`. Client data, never a Firestore collection — an
 * activity document stores only the `id`, so **the ids are the contract**
 * between the two apps and must match exactly.
 */
export type ActivityType = {
  id: string;
  name: string;
  /** Whether a distance makes sense for it: a walk yes, a game of tennis no. */
  supportsDistance: boolean;
};

export const ACTIVITY_CATALOG: readonly ActivityType[] = [
  { id: 'walk', name: 'Walk', supportsDistance: true },
  { id: 'dog-walk', name: 'Dog walk', supportsDistance: true },
  { id: 'bike', name: 'Bike ride', supportsDistance: true },
  { id: 'hike', name: 'Hike', supportsDistance: true },
  { id: 'swim', name: 'Swim', supportsDistance: true },
  { id: 'tennis', name: 'Tennis', supportsDistance: false },
  { id: 'pickleball', name: 'Pickleball', supportsDistance: false },
  { id: 'basketball', name: 'Basketball', supportsDistance: false },
  { id: 'skate', name: 'Skateboarding', supportsDistance: false },
  { id: 'dance', name: 'Dance', supportsDistance: false },
  { id: 'play', name: 'Playing with kids', supportsDistance: false },
  { id: 'other', name: 'Other', supportsDistance: true },
];

const BY_ID = new Map(ACTIVITY_CATALOG.map((type) => [type.id, type]));

export function findActivityType(id: string): ActivityType | undefined {
  return BY_ID.get(id);
}

/** The name to show for an activity, including one whose type this app does not know yet. */
export function activityTypeName(id: string): string {
  return BY_ID.get(id)?.name ?? 'Activity';
}
