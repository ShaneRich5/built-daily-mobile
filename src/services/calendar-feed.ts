import { WEB_APP_URL } from '@/constants/links';
import { feedUrlFromResponse } from '@/lib/calendar-feed';
import { getFirebaseAuth } from '@/services/firebase';

// The planner calendar feed lives behind the web app's API: the token is
// stored in `calendarFeeds/{uid}`, which only the server (Admin SDK) can read
// or write. So the app asks the same endpoint the web's Settings does,
// `/api/calendar-feed`, signed with the user's Firebase ID token.

async function callFeedApi(method: 'GET' | 'POST'): Promise<unknown> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Not signed in');

  const idToken = await user.getIdToken();
  const response = await fetch(`${WEB_APP_URL}/api/calendar-feed`, {
    method,
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!response.ok) throw new Error(`Calendar feed ${method} failed (${response.status})`);
  return response.json();
}

/** The signed-in user's feed link, or null if they haven't made one. Throws on failure. */
export async function getCalendarFeedUrl(): Promise<string | null> {
  return feedUrlFromResponse(await callFeedApi('GET'));
}

/** Makes the feed link, or replaces it so the old one stops working. Throws on failure. */
export async function createCalendarFeedUrl(): Promise<string> {
  const url = feedUrlFromResponse(await callFeedApi('POST'));
  if (!url) throw new Error('Calendar feed create returned no url');
  return url;
}
