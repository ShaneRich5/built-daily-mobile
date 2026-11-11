/**
 * Calendar days as `YYYY-MM-DD` keys in the lifter's own timezone — the form
 * every document stores a day in (`workoutDate`, `dateKey`, `activityDate`).
 *
 * Keys compare as strings (`'2026-11-09' < '2026-11-10'`), which is what makes
 * them usable in Firestore range queries and why the helpers here return keys
 * rather than `Date`s. Mirrors the web app's `lib/calendar-views.ts` and
 * `lib/workout-date.ts`.
 *
 * Labels are built by hand rather than with `Intl`: the app's copy is English
 * throughout, and a hand-built label is the same on every phone and under test.
 */

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** A date's local calendar day — never UTC, which rolls over hours early or late. */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Local midnight on the key's day, or null for anything that is not a real
 * day (`2026-02-31`, `tomorrow`).
 */
export function dateFromKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

/** The key `days` later (or earlier, when negative). */
export function addDays(key: string, days: number): string {
  const date = dateFromKey(key);
  if (!date) return key;

  // `setDate` rather than adding milliseconds: a day is not always 24 hours.
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

/** The Sunday that starts the key's week. Weeks run Sunday–Saturday, as on the web. */
export function startOfWeek(key: string): string {
  const date = dateFromKey(key);
  return date ? addDays(key, -date.getDay()) : key;
}

/** The Saturday that ends the key's week. */
export function endOfWeek(key: string): string {
  return addDays(startOfWeek(key), 6);
}

/** Whole days from `from` to `to` — positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  const a = dateFromKey(from);
  const b = dateFromKey(to);
  if (!a || !b) return 0;

  // Rounded, so a daylight-saving hour either way does not shift the count.
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** 0 for Sunday … 6 for Saturday. */
export function weekdayIndex(key: string): number {
  return dateFromKey(key)?.getDay() ?? 0;
}

/** "Thu" */
export function weekdayShort(key: string): string {
  const date = dateFromKey(key);
  return date ? WEEKDAYS_SHORT[date.getDay()] : key;
}

/** "Thu, Nov 5" */
export function shortDayLabel(key: string): string {
  const date = dateFromKey(key);
  if (!date) return key;

  return `${WEEKDAYS_SHORT[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** "Wednesday, Nov 11" */
export function longDayLabel(key: string): string {
  const date = dateFromKey(key);
  if (!date) return key;

  return `${WEEKDAYS_LONG[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** "Oct 24" */
export function monthDayLabel(key: string): string {
  const date = dateFromKey(key);
  return date ? `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}` : key;
}

/** A clock time off a `Date`, on a 12-hour clock: "6:10 PM". */
export function clockLabel(date: Date): string {
  const hours = date.getHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hour12}:${String(date.getMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}
