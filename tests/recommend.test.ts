import { describe, it, expect } from 'vitest';
import { getRecommendation } from '../src/engine/recommend';
import type { Category, Problem, ProblemProgress } from '../src/engine/types';

describe('Problem Recommendation Engine', () => {
  const categories: Category[] = [
    { slug: '01_arrays', name: 'Arrays', weight: 0.12 },
    { slug: '11_graphs', name: 'Graphs', weight: 0.09 },
    { slug: '08_tries', name: 'Tries', weight: 0.03 }
  ];

  const problems: Problem[] = [
    {
      id: 'two-sum',
      slug: 'two-sum',
      title: 'Two Sum',
      difficulty: 'easy',
      category: 'Arrays',
      categorySlug: '01_arrays',
      pattern: 'hash_map',
      timeLimitMinutes: 15,
      frequencyRank: 1,
      description: '',
      functionName: 'twoSum',
      params: [],
      returnType: 'number[]',
      starterCode: '',
      testCases: [],
      isCore75: true,
      lists: ['core-75', 'extended-150'],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      keyInsight: '',
      commonPitfalls: [],
      hints: []
    },
    {
      id: 'course-schedule',
      slug: 'course-schedule',
      title: 'Course Schedule',
      difficulty: 'medium',
      category: 'Graphs',
      categorySlug: '11_graphs',
      pattern: 'topological_sort',
      timeLimitMinutes: 25,
      frequencyRank: 5,
      description: '',
      functionName: 'canFinish',
      params: [],
      returnType: 'boolean',
      starterCode: '',
      testCases: [],
      isCore75: true,
      lists: ['core-75', 'extended-150'],
      timeComplexity: 'O(V+E)',
      spaceComplexity: 'O(V+E)',
      keyInsight: '',
      commonPitfalls: [],
      hints: []
    },
    {
      id: 'word-search-ii',
      slug: 'word-search-ii',
      title: 'Word Search II',
      difficulty: 'hard',
      category: 'Tries',
      categorySlug: '08_tries',
      pattern: 'trie_backtracking',
      timeLimitMinutes: 35,
      frequencyRank: 30,
      description: '',
      functionName: 'findWords',
      params: [],
      returnType: 'string[]',
      starterCode: '',
      testCases: [],
      isCore75: false,
      lists: ['extended-150'],
      timeComplexity: 'O(M*4^L)',
      spaceComplexity: 'O(N)',
      keyInsight: '',
      commonPitfalls: [],
      hints: []
    }
  ];

  it('prioritizes overdue spaced repetition reviews first', () => {
    const now = new Date('2026-09-10T00:00:00Z');
    const progressMap = new Map<string, ProblemProgress>();

    progressMap.set('two-sum', {
      problemId: 'two-sum',
      status: 'solved',
      solveCount: 1,
      failCount: 0,
      sm2IntervalDays: 3,
      sm2Repetitions: 1,
      sm2EaseFactor: 2.5,
      nextReviewDate: '2026-09-05T00:00:00Z' // Overdue
    });

    const rec = getRecommendation(categories, problems, progressMap, [], undefined, now);
    expect(rec).not.toBeNull();
    expect(rec?.problem.id).toBe('two-sum');
    expect(rec?.priority).toBe('review');
  });

  it('prioritizes highest gap impact category when no reviews are overdue', () => {
    const now = new Date('2026-09-01T00:00:00Z');
    const progressMap = new Map<string, ProblemProgress>();

    // Two sum solved with high confidence in Arrays
    progressMap.set('two-sum', {
      problemId: 'two-sum',
      status: 'solved',
      solveCount: 1,
      failCount: 0,
      sm2IntervalDays: 14,
      sm2Repetitions: 3,
      sm2EaseFactor: 2.5,
      nextReviewDate: '2026-09-15T00:00:00Z' // Not overdue
    });

    // Graphs has 0.09 weight and 0% confidence -> gap = 0.09
    // Tries has 0.03 weight and 0% confidence -> gap = 0.03
    // Recommendation should be Course Schedule in Graphs!
    const rec = getRecommendation(categories, problems, progressMap, [], undefined, now);
    expect(rec).not.toBeNull();
    expect(rec?.problem.id).toBe('course-schedule');
    expect(rec?.priority).toBe('weak_spot');
  });

  it('respects problem list filters (core-75 vs extended-150)', () => {
    const now = new Date('2026-09-01T00:00:00Z');
    const progressMap = new Map<string, ProblemProgress>();

    // When filtering by extended-150 with category Tries
    const rec = getRecommendation(
      categories,
      problems,
      progressMap,
      [],
      { set: 'extended-150', categorySlug: '08_tries' },
      now
    );
    expect(rec).not.toBeNull();
    expect(rec?.problem.id).toBe('word-search-ii');
  });
});
