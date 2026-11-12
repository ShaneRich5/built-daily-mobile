import {
  addDays,
  clockLabel,
  dateFromKey,
  dateKey,
  daysBetween,
  endOfWeek,
  longDayLabel,
  monthDayLabel,
  shortDayLabel,
  startOfWeek,
  weekdayIndex,
  weekdayShort,
} from '@/lib/date-keys';

describe('dateKey', () => {
  it('reads the local calendar day, zero-padded', () => {
    expect(dateKey(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05');
  });

  // Late evening is still today for the lifter, wherever UTC has got to.
  it('stays on the local day late at night', () => {
    expect(dateKey(new Date(2026, 10, 10, 23, 59))).toBe('2026-11-10');
  });
});

describe('dateFromKey', () => {
  it('gives local midnight on that day', () => {
    expect(dateFromKey('2026-11-10')).toEqual(new Date(2026, 10, 10));
  });

  it('rejects anything that is not a real day', () => {
    expect(dateFromKey('2026-02-31')).toBeNull();
    expect(dateFromKey('2026-11-1')).toBeNull();
    expect(dateFromKey('tomorrow')).toBeNull();
  });
});

describe('addDays', () => {
  it('steps forward and back', () => {
    expect(addDays('2026-11-10', 1)).toBe('2026-11-11');
    expect(addDays('2026-11-10', -1)).toBe('2026-11-09');
  });

  it('crosses month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('hands back a key it cannot read', () => {
    expect(addDays('nope', 3)).toBe('nope');
  });
});

describe('weeks', () => {
  // Nov 11, 2026 is a Wednesday; its week runs Sun Nov 8 – Sat Nov 14.
  it('start on Sunday and end on Saturday', () => {
    expect(startOfWeek('2026-11-11')).toBe('2026-11-08');
    expect(endOfWeek('2026-11-11')).toBe('2026-11-14');
  });

  it('treat a Sunday as the start of its own week', () => {
    expect(startOfWeek('2026-11-08')).toBe('2026-11-08');
  });

  it('treat a Saturday as the end of its own week', () => {
    expect(endOfWeek('2026-11-14')).toBe('2026-11-14');
    expect(startOfWeek('2026-11-14')).toBe('2026-11-08');
  });
});

describe('daysBetween', () => {
  it('counts whole days, signed', () => {
    expect(daysBetween('2026-11-10', '2026-11-13')).toBe(3);
    expect(daysBetween('2026-11-13', '2026-11-10')).toBe(-3);
    expect(daysBetween('2026-11-10', '2026-11-10')).toBe(0);
  });

  // The US clocks go back on Nov 1, 2026: that day is 25 hours long.
  it('is not thrown by a daylight-saving change', () => {
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });
});

describe('labels', () => {
  it('name a day in the forms the screens use', () => {
    expect(weekdayIndex('2026-11-11')).toBe(3);
    expect(weekdayShort('2026-11-11')).toBe('Wed');
    expect(shortDayLabel('2026-11-05')).toBe('Thu, Nov 5');
    expect(longDayLabel('2026-11-11')).toBe('Wednesday, Nov 11');
    expect(monthDayLabel('2026-10-24')).toBe('Oct 24');
  });

  it('hand back a key they cannot read', () => {
    expect(shortDayLabel('nope')).toBe('nope');
  });
});

describe('clockLabel', () => {
  it('reads a time on a 12-hour clock', () => {
    expect(clockLabel(new Date(2026, 10, 10, 18, 10))).toBe('6:10 PM');
    expect(clockLabel(new Date(2026, 10, 10, 6, 5))).toBe('6:05 AM');
    expect(clockLabel(new Date(2026, 10, 10, 0, 30))).toBe('12:30 AM');
    expect(clockLabel(new Date(2026, 10, 10, 12, 0))).toBe('12:00 PM');
  });
});
