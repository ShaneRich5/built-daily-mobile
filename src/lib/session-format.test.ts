import {
  sessionDayLabel,
  sessionDurationLabel,
  sessionVolumeLabel,
} from '@/lib/session-format';

describe('sessionDayLabel', () => {
  it('uses the local calendar day recorded on the web, not the timestamp', () => {
    // 23:00 UTC on the 20th is still the 20th for the user who logged it, and
    // workoutDate carries that intent.
    const label = sessionDayLabel({
      workoutDate: '2026-09-20',
      endedAt: new Date('2026-09-20T23:00:00Z'),
      startedAt: new Date('2026-09-20T22:00:00Z'),
    });

    expect(label).toContain('20');
    expect(label).toContain('Sep');
  });

  it('does not shift the day backwards for timezones behind UTC', () => {
    // Guards the `new Date('2026-09-20')` trap, which is midnight UTC.
    expect(sessionDayLabel({ workoutDate: '2026-09-20', endedAt: null, startedAt: new Date(0) })).toContain(
      '20',
    );
  });

  it('falls back to endedAt when workoutDate is absent', () => {
    const label = sessionDayLabel({
      workoutDate: null,
      endedAt: new Date(2026, 8, 15),
      startedAt: new Date(2026, 8, 14),
    });

    expect(label).toContain('15');
  });

  it('falls back to startedAt for an unfinished session', () => {
    const label = sessionDayLabel({
      workoutDate: null,
      endedAt: null,
      startedAt: new Date(2026, 8, 14),
    });

    expect(label).toContain('14');
  });
});

describe('sessionVolumeLabel', () => {
  it('pluralizes both counts', () => {
    expect(sessionVolumeLabel({ exerciseCount: 3, setCount: 9 })).toBe('3 exercises · 9 sets');
  });

  it('uses singular forms for one', () => {
    expect(sessionVolumeLabel({ exerciseCount: 1, setCount: 1 })).toBe('1 exercise · 1 set');
  });
});

describe('sessionDurationLabel', () => {
  it('shows minutes under an hour', () => {
    expect(sessionDurationLabel(2700)).toBe('45 min');
  });

  it('shows hours and minutes past an hour', () => {
    expect(sessionDurationLabel(5400)).toBe('1 hr 30 min');
  });

  it('omits minutes on a whole hour', () => {
    expect(sessionDurationLabel(3600)).toBe('1 hr');
  });

  it('returns null when there is no recorded duration', () => {
    expect(sessionDurationLabel(null)).toBeNull();
    expect(sessionDurationLabel(0)).toBeNull();
  });
});
