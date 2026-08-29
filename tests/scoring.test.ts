import { describe, it, expect } from 'vitest';
import {
  calculateSpeedScore,
  calculateIndependenceScore,
  calculateRecencyFactor,
  calculateProblemRetention,
  calculateCategoryConfidence,
  calculateSkillGraph
} from '../src/engine/scoring';
import type { Category, Problem, ProblemProgress, AttemptLog } from '../src/engine/types';

describe('Scoring Engine', () => {
  it('calculates speed score correctly', () => {
    // Target 15m, completed in 10m (600s) -> 1.0 (clamped)
    expect(calculateSpeedScore(15, 600)).toBe(1.0);
    // Target 15m (900s), completed in 30m (1800s) -> 0.5
    expect(calculateSpeedScore(15, 1800)).toBe(0.5);
    // Actual 0s -> 1.0
    expect(calculateSpeedScore(15, 0)).toBe(1.0);
  });

  it('calculates independence score correctly', () => {
    expect(calculateIndependenceScore(0)).toBe(1.0);
    expect(calculateIndependenceScore(1)).toBe(0.75);
    expect(calculateIndependenceScore(2)).toBe(0.50);
    expect(calculateIndependenceScore(3)).toBe(0.25);
    expect(calculateIndependenceScore(4)).toBe(0.0);
    expect(calculateIndependenceScore(5)).toBe(0.0);
  });

  it('calculates recency factor with exponential decay', () => {
    expect(calculateRecencyFactor(0)).toBe(1.0);
    expect(calculateRecencyFactor(null)).toBe(0.0);
    expect(calculateRecencyFactor(14)).toBeCloseTo(0.496, 2);
  });

  it('calculates problem retention correctly', () => {
    const now = new Date('2026-09-01T12:00:00Z');

    const freshProgress: ProblemProgress = {
      problemId: 'two-sum',
      status: 'solved',
      solveCount: 1,
      failCount: 0,
      sm2IntervalDays: 7,
      sm2Repetitions: 1,
      sm2EaseFactor: 2.5,
      nextReviewDate: '2026-09-05T12:00:00Z'
    };
    expect(calculateProblemRetention(freshProgress, now)).toBe(1.0);

    const overdueProgress: ProblemProgress = {
      problemId: 'two-sum',
      status: 'solved',
      solveCount: 1,
      failCount: 0,
      sm2IntervalDays: 3,
      sm2Repetitions: 1,
      sm2EaseFactor: 2.5,
      nextReviewDate: '2026-08-25T12:00:00Z' // 7 days overdue
    };
    expect(calculateProblemRetention(overdueProgress, now)).toBe(0.5);
  });

  it('calculates category confidence and skill graph deterministically', () => {
    const category: Category = {
      id: '01_arrays_and_hashing',
      slug: '01_arrays_and_hashing',
      name: 'Arrays & Hashing',
      weight: 0.12
    };

    const problem: Problem = {
      id: 'two-sum',
      slug: 'two-sum',
      title: 'Two Sum',
      difficulty: 'easy',
      category: 'Arrays & Hashing',
      categorySlug: '01_arrays_and_hashing',
      pattern: 'hash_map',
      timeLimitMinutes: 15,
      frequencyRank: 1,
      description: 'Two Sum',
      functionName: 'twoSum',
      params: [],
      returnType: 'number[]',
      starterCode: '',
      testCases: [],
      isCore75: true,
      lists: ['core-75'],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      keyInsight: '',
      commonPitfalls: [],
      hints: []
    };

    const progressMap = new Map<string, ProblemProgress>();
    progressMap.set('two-sum', {
      problemId: 'two-sum',
      status: 'solved',
      solveCount: 1,
      failCount: 0,
      bestTimeSeconds: 400,
      lastTimeSeconds: 400,
      lastHintsUsed: 0,
      sm2IntervalDays: 3,
      sm2Repetitions: 1,
      sm2EaseFactor: 2.5,
      nextReviewDate: new Date(Date.now() + 86400000).toISOString()
    });

    const attempts: AttemptLog[] = [
      {
        problemId: 'two-sum',
        timestamp: new Date().toISOString(),
        passed: true,
        timeSpentSeconds: 400,
        hintsUsed: 0,
        code: '',
        mode: 'practice'
      }
    ];

    const conf = calculateCategoryConfidence(category, [problem], progressMap, attempts);
    expect(conf.confidence).toBeGreaterThan(0.7);
    expect(conf.problemsSolved).toBe(1);

    const graph = calculateSkillGraph([category], [problem], progressMap, attempts, 5);
    expect(graph.overallReadiness).toBeGreaterThan(0.5);
    expect(graph.streakDays).toBe(5);
    expect(graph.totalSolved).toBe(1);
  });
});
