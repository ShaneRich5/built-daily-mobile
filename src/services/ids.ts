import { randomUUID } from 'expo-crypto';

/**
 * The ids the client mints itself.
 *
 * Session and plan documents get their ids from Firestore, but the ids
 * *inside* a document do not — a line is identified before it is ever saved,
 * so it can be keyed, noted against and reordered while the workout is still
 * being typed. Kept out of `src/lib/` because these are deliberately not pure:
 * the domain modules take an id factory instead, so their tests stay
 * deterministic.
 */

/** A stable id for one exercise line within a session or plan. */
export function newLineId(): string {
  return randomUUID();
}

/**
 * The exercise id for a move the catalog does not have. The `custom-` prefix is
 * what tells both clients to trust the line's `nameSnapshot` instead of looking
 * the id up (docs/DATA_MODEL.md).
 */
export function newCustomExerciseId(): string {
  return `custom-${randomUUID()}`;
}
