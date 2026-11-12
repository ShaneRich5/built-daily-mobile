import { fromNewBodyWeight, toBodyWeightEntry } from '@/services/firestore/progress-mappers';

const NOW = new Date(2026, 10, 11, 7, 30);
const timestamp = (date: Date) => ({ toDate: () => date });

describe('toBodyWeightEntry', () => {
  it('reads a weigh-in, to a tenth of a pound', () => {
    expect(
      toBodyWeightEntry('w1', { dateKey: '2026-11-11', weightLbs: 181.26, createdAt: timestamp(NOW) }),
    ).toEqual({ id: 'w1', dateKey: '2026-11-11', weightLbs: 181.3, createdAt: NOW });
  });

  it('skips one without a real day, weight or time', () => {
    expect(toBodyWeightEntry('a', { dateKey: 'Nov 11', weightLbs: 180, createdAt: timestamp(NOW) })).toBeNull();
    expect(toBodyWeightEntry('b', { dateKey: '2026-11-11', weightLbs: 0, createdAt: timestamp(NOW) })).toBeNull();
    expect(toBodyWeightEntry('c', { dateKey: '2026-11-11', weightLbs: '180', createdAt: timestamp(NOW) })).toBeNull();
    expect(toBodyWeightEntry('d', { dateKey: '2026-11-11', weightLbs: 180 })).toBeNull();
    expect(toBodyWeightEntry('e', undefined)).toBeNull();
  });
});

describe('fromNewBodyWeight', () => {
  it('writes exactly the fields the rules require', () => {
    expect(fromNewBodyWeight('2026-11-11', 181.26, NOW)).toEqual({
      dateKey: '2026-11-11',
      weightLbs: 181.3,
      createdAt: NOW,
    });
  });

  it('refuses what the rules would', () => {
    expect(fromNewBodyWeight('2026-11-1', 180, NOW)).toBeNull();
    expect(fromNewBodyWeight('2026-11-11', 0, NOW)).toBeNull();
    expect(fromNewBodyWeight('2026-11-11', 1000.2, NOW)).toBeNull();
    expect(fromNewBodyWeight('2026-11-11', Number.NaN, NOW)).toBeNull();
  });
});
