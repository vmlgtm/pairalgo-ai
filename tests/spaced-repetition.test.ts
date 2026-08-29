import { describe, it, expect } from 'vitest';
import {
  calculateSM2,
  isDueForReview,
  getDueForReview
} from '../src/engine/spaced-repetition';
import type { Problem, ProblemProgress } from '../src/engine/types';

describe('Spaced Repetition SM-2 Engine', () => {
  it('handles first pass unassisted', () => {
    const baseDate = new Date('2026-09-01T00:00:00Z');
    const res = calculateSM2(0, 2.5, true, 0, baseDate);

    expect(res.repetitions).toBe(1);
    expect(res.intervalDays).toBe(1);
    expect(new Date(res.nextReviewDate).getTime()).toBe(
      new Date('2026-09-02T00:00:00Z').getTime()
    );
  });

  it('advances intervals on consecutive unassisted passes [1, 3, 7, 14, 30]', () => {
    const baseDate = new Date('2026-09-01T00:00:00Z');

    const pass2 = calculateSM2(1, 2.5, true, 1, baseDate);
    expect(pass2.repetitions).toBe(2);
    expect(pass2.intervalDays).toBe(3);

    const pass3 = calculateSM2(2, 2.5, true, 0, baseDate);
    expect(pass3.repetitions).toBe(3);
    expect(pass3.intervalDays).toBe(7);

    const pass4 = calculateSM2(3, 2.5, true, 0, baseDate);
    expect(pass4.repetitions).toBe(4);
    expect(pass4.intervalDays).toBe(14);

    const pass5 = calculateSM2(4, 2.5, true, 0, baseDate);
    expect(pass5.repetitions).toBe(5);
    expect(pass5.intervalDays).toBe(30);
  });

  it('resets interval to 1 day on failure or excessive hints (>1)', () => {
    const baseDate = new Date('2026-09-01T00:00:00Z');

    const fail = calculateSM2(4, 2.5, false, 0, baseDate);
    expect(fail.repetitions).toBe(0);
    expect(fail.intervalDays).toBe(1);

    const hintAssisted = calculateSM2(4, 2.5, true, 2, baseDate);
    expect(hintAssisted.repetitions).toBe(0);
    expect(hintAssisted.intervalDays).toBe(1);
  });

  it('correctly identifies problems due for review', () => {
    const now = new Date('2026-09-05T12:00:00Z');

    const progOverdue: ProblemProgress = {
      problemId: 'two-sum',
      status: 'solved',
      solveCount: 1,
      failCount: 0,
      sm2IntervalDays: 3,
      sm2Repetitions: 2,
      sm2EaseFactor: 2.5,
      nextReviewDate: '2026-09-03T00:00:00Z'
    };
    expect(isDueForReview(progOverdue, now)).toBe(true);

    const progNotDue: ProblemProgress = {
      problemId: '3sum',
      status: 'solved',
      solveCount: 1,
      failCount: 0,
      sm2IntervalDays: 7,
      sm2Repetitions: 3,
      sm2EaseFactor: 2.5,
      nextReviewDate: '2026-09-10T00:00:00Z'
    };
    expect(isDueForReview(progNotDue, now)).toBe(false);
  });

  it('sorts due items by highest overdue ratio', () => {
    const now = new Date('2026-09-10T00:00:00Z');

    const prob1: Problem = {
      id: 'p1',
      slug: 'p1',
      title: 'Problem 1',
      difficulty: 'easy',
      category: 'Arrays',
      categorySlug: '01_arrays_and_hashing',
      pattern: 'hash',
      timeLimitMinutes: 15,
      frequencyRank: 1,
      description: '',
      functionName: 'p1',
      params: [],
      returnType: 'number',
      starterCode: '',
      testCases: [],
      isCore75: true,
      lists: [],
      timeComplexity: '',
      spaceComplexity: '',
      keyInsight: '',
      commonPitfalls: [],
      hints: []
    };

    const prob2: Problem = { ...prob1, id: 'p2', slug: 'p2', title: 'Problem 2' };

    const prog1: ProblemProgress = {
      problemId: 'p1',
      status: 'solved',
      solveCount: 1,
      failCount: 0,
      sm2IntervalDays: 1, // 1 day interval, 5 days overdue -> urgency 5.0
      sm2Repetitions: 1,
      sm2EaseFactor: 2.5,
      nextReviewDate: '2026-09-05T00:00:00Z'
    };

    const prog2: ProblemProgress = {
      problemId: 'p2',
      status: 'solved',
      solveCount: 1,
      failCount: 0,
      sm2IntervalDays: 14, // 14 day interval, 2 days overdue -> urgency 0.14
      sm2Repetitions: 4,
      sm2EaseFactor: 2.5,
      nextReviewDate: '2026-09-08T00:00:00Z'
    };

    const due = getDueForReview([prob1, prob2], [prog1, prog2], now);
    expect(due.length).toBe(2);
    expect(due[0].problem.id).toBe('p1');
    expect(due[1].problem.id).toBe('p2');
  });
});
