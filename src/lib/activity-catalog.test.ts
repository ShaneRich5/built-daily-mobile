import { activityTypeName, findActivityType, pickableActivityTypes } from '@/lib/activity-catalog';

describe('activity catalog', () => {
  it('offers Run, and no longer offers the retired types for a new log', () => {
    const ids = pickableActivityTypes().map((type) => type.id);
    expect(ids).toContain('run');
    expect(ids).not.toContain('dog-walk');
    expect(ids).not.toContain('play');
  });

  it('keeps a retired type when editing a log of it', () => {
    expect(pickableActivityTypes('dog-walk').map((type) => type.id)).toContain('dog-walk');
    expect(activityTypeName('play')).toBe('Playing with kids');
    expect(findActivityType('run')?.supportsDistance).toBe(true);
  });
});
