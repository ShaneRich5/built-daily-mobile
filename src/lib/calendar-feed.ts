// The planner calendar feed: a secret `.ics` link the web app serves at
// `/api/calendar/{token}.ics` that Google Calendar, Apple Calendar and Outlook
// subscribe to. It is one-way and read-only: the calendar follows the planner.
// These helpers mirror the web app's `features/settings/calendar-feed-card.tsx`.

/** `https://…` → `webcal://…`, the scheme calendar apps open as a subscription. */
export function toWebcal(url: string): string {
  return url.replace(/^https?:/, 'webcal:');
}

/** Google Calendar's "add by URL" screen, prefilled with the feed. */
export function googleCalendarAddUrl(url: string): string {
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(toWebcal(url))}`;
}

/**
 * The `url` out of a `/api/calendar-feed` response body: a string, or null
 * when no link has been made yet (or the body is not what was expected).
 */
export function feedUrlFromResponse(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const url = (body as { url?: unknown }).url;
  return typeof url === 'string' && /^https:\/\//.test(url) ? url : null;
}
