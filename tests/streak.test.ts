import { describe, it, expect } from 'vitest';
import { calculateStreak } from '../src/engine/streak';
import type { AttemptLog } from '../src/engine/types';

describe('Daily Streak Calculator', () => {
  it('returns 0 streak for empty attempts', () => {
    const res = calculateStreak([]);
    expect(res.currentStreak).toBe(0);
    expect(res.longestStreak).toBe(0);
    expect(res.isActiveToday).toBe(false);
  });

  it('calculates active streak when user practiced today and past consecutive days', () => {
    const now = new Date('2026-09-05T14:00:00');

    const attempts: AttemptLog[] = [
      { problemId: 'p1', timestamp: '2026-09-05T10:00:00', passed: true, timeSpentSeconds: 300, hintsUsed: 0, code: '', mode: 'practice' },
      { problemId: 'p2', timestamp: '2026-09-04T12:00:00', passed: true, timeSpentSeconds: 300, hintsUsed: 0, code: '', mode: 'practice' },
      { problemId: 'p3', timestamp: '2026-09-03T18:00:00', passed: true, timeSpentSeconds: 300, hintsUsed: 0, code: '', mode: 'practice' }
    ];

    const res = calculateStreak(attempts, now);
    expect(res.currentStreak).toBe(3);
    expect(res.longestStreak).toBe(3);
    expect(res.isActiveToday).toBe(true);
  });

  it('preserves streak if user practiced yesterday but not yet today', () => {
    const now = new Date('2026-09-05T14:00:00');

    const attempts: AttemptLog[] = [
      { problemId: 'p2', timestamp: '2026-09-04T12:00:00', passed: true, timeSpentSeconds: 300, hintsUsed: 0, code: '', mode: 'practice' },
      { problemId: 'p3', timestamp: '2026-09-03T18:00:00', passed: true, timeSpentSeconds: 300, hintsUsed: 0, code: '', mode: 'practice' },
      { problemId: 'p4', timestamp: '2026-09-02T09:00:00', passed: true, timeSpentSeconds: 300, hintsUsed: 0, code: '', mode: 'practice' }
    ];

    const res = calculateStreak(attempts, now);
    expect(res.currentStreak).toBe(3);
    expect(res.isActiveToday).toBe(false);
  });

  it('resets current streak to 0 if last practice was 2 or more days ago', () => {
    const now = new Date('2026-09-05T14:00:00');

    const attempts: AttemptLog[] = [
      { problemId: 'p3', timestamp: '2026-09-02T18:00:00', passed: true, timeSpentSeconds: 300, hintsUsed: 0, code: '', mode: 'practice' },
      { problemId: 'p4', timestamp: '2026-09-01T09:00:00', passed: true, timeSpentSeconds: 300, hintsUsed: 0, code: '', mode: 'practice' }
    ];

    const res = calculateStreak(attempts, now);
    expect(res.currentStreak).toBe(0);
    expect(res.longestStreak).toBe(2);
    expect(res.isActiveToday).toBe(false);
  });
});
