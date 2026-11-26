import { feedUrlFromResponse, googleCalendarAddUrl, toWebcal } from '@/lib/calendar-feed';

const feed = 'https://built-daily.example/api/calendar/bd_cal_abc123.ics';

describe('calendar feed links', () => {
  it('opens as a subscription with webcal', () => {
    expect(toWebcal(feed)).toBe('webcal://built-daily.example/api/calendar/bd_cal_abc123.ics');
  });

  it('prefills Google Calendar’s add-by-URL screen', () => {
    expect(googleCalendarAddUrl(feed)).toBe(
      'https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fbuilt-daily.example%2Fapi%2Fcalendar%2Fbd_cal_abc123.ics',
    );
  });
});

describe('feedUrlFromResponse', () => {
  it('reads the link, or null when there is none yet', () => {
    expect(feedUrlFromResponse({ url: feed })).toBe(feed);
    expect(feedUrlFromResponse({ url: null })).toBeNull();
    expect(feedUrlFromResponse({ url: 'javascript:alert(1)' })).toBeNull();
    expect(feedUrlFromResponse(null)).toBeNull();
  });
});
