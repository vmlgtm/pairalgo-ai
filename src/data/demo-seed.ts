import type { ProblemProgress, AttemptLog } from '../engine/types';

/**
 * List of 52 problem IDs pre-solved in demo mode.
 * Strong coverage across fundamentals with deliberate gap in Graphs (e.g. Course Schedule)
 * to showcase WebMCP intelligent recommendation.
 */
export const DEMO_SOLVED_PROBLEM_IDS = [
  // 01_arrays_and_hashing (7 solved)
  'two-sum',
  'contains-duplicate',
  'valid-anagram',
  'group-anagrams',
  'top-k-frequent-elements',
  'product-of-array-except-self',
  'longest-consecutive-sequence',

  // 02_two_pointers (4 solved)
  'valid-palindrome',
  'two-sum-ii-input-array-is-sorted',
  '3sum',
  'container-with-most-water',

  // 03_sliding_window (4 solved)
  'best-time-to-buy-and-sell-stock',
  'longest-substring-without-repeating-characters',
  'longest-repeating-character-replacement',
  'permutation-in-string',

  // 04_stack (4 solved)
  'valid-parentheses',
  'min-stack',
  'evaluate-reverse-polish-notation',
  'daily-temperatures',

  // 05_binary_search (4 solved)
  'binary-search',
  'search-a-2d-matrix',
  'koko-eating-bananas',
  'find-minimum-in-rotated-sorted-array',

  // 06_linked_list (5 solved)
  'reverse-linked-list',
  'merge-two-sorted-lists',
  'reorder-list',
  'remove-nth-node-from-end-of-list',
  'linked-list-cycle',

  // 07_trees (6 solved)
  'invert-binary-tree',
  'maximum-depth-of-binary-tree',
  'diameter-of-binary-tree',
  'balanced-binary-tree',
  'same-tree',
  'subtree-of-another-tree',

  // 08_tries (1 solved)
  'implement-trie-prefix-tree',

  // 09_heap_and_priority_queue (3 solved)
  'kth-largest-element-in-a-stream',
  'last-stone-weight',
  'k-closest-points-to-origin',

  // 10_backtracking (2 solved)
  'subsets',
  'combination-sum',

  // 11_graphs (1 solved - leaving high gap for Course Schedule recommendation)
  'number-of-islands',

  // 12_advanced_graphs (0 solved)

  // 13_1d_dynamic_programming (3 solved)
  'climbing-stairs',
  'min-cost-climbing-stairs',
  'house-robber',

  // 14_2d_dynamic_programming (1 solved)
  'unique-paths',

  // 15_greedy (2 solved)
  'maximum-subarray',
  'jump-game',

  // 16_intervals (2 solved)
  'insert-interval',
  'merge-intervals',

  // 17_math_and_geometry (1 solved)
  'rotate-image',

  // 18_bit_manipulation (2 solved)
  'single-number',
  'number-of-1-bits'
];

/**
 * Generates realistic demo progress and attempt records relative to the given base date.
 */
export function generateDemoData(baseDate: Date = new Date()): {
  progressList: ProblemProgress[];
  attempts: AttemptLog[];
} {
  const progressList: ProblemProgress[] = [];
  const attempts: AttemptLog[] = [];

  const nowMs = baseDate.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  // Distribute the 52 problems across recent practice history
  DEMO_SOLVED_PROBLEM_IDS.forEach((problemId, index) => {
    // Determine days ago: first 5 on consecutive days (0, 1, 2, 3, 4) for a clean 5-day active streak.
    // Index >= 5 starts from day 6 backwards to maintain an unbroken 5-day streak.
    let daysAgo: number;
    if (index < 5) {
      daysAgo = index; // 0, 1, 2, 3, 4 (gives exactly 5 consecutive active days)
    } else {
      daysAgo = 6 + (index % 24);
    }

    const attemptTime = new Date(nowMs - daysAgo * dayMs - (index * 15 * 60 * 1000));
    const timestamp = attemptTime.toISOString();

    // SM-2 Spaced Repetition values:
    // 3 problems overdue for review
    const isOverdue = problemId === 'invert-binary-tree' || problemId === 'valid-parentheses' || problemId === 'merge-two-sorted-lists';
    const intervalDays = isOverdue ? 3 : (index % 4 === 0 ? 14 : index % 3 === 0 ? 7 : 4);
    const repetitions = isOverdue ? 2 : (intervalDays >= 14 ? 4 : 3);
    
    // If overdue, nextReviewDate was 1 day ago; otherwise future review date
    const nextReviewMs = isOverdue
      ? nowMs - 1 * dayMs
      : nowMs + intervalDays * dayMs;

    const hintsUsed = index % 8 === 0 ? 1 : 0;
    const timeSpentSeconds = 240 + (index % 6) * 60; // 4 to 9 minutes

    progressList.push({
      problemId,
      status: 'solved',
      lastAttemptDate: timestamp,
      solveCount: 1 + (index % 2),
      failCount: 0,
      bestTimeSeconds: timeSpentSeconds,
      lastTimeSeconds: timeSpentSeconds,
      lastHintsUsed: hintsUsed,
      sm2IntervalDays: intervalDays,
      sm2Repetitions: repetitions,
      sm2EaseFactor: 2.6,
      nextReviewDate: new Date(nextReviewMs).toISOString()
    });

    // Create corresponding attempt logs
    attempts.push({
      problemId,
      timestamp,
      passed: true,
      timeSpentSeconds,
      hintsUsed,
      code: `// Verified solution for ${problemId}\n// Practiced in PairAlgo.ai`,
      mode: 'practice'
    });
  });

  // Add extra review attempt for a problem solved earlier in the streak
  attempts.push({
    problemId: 'two-sum',
    timestamp: new Date(nowMs - 1000 * 60 * 45).toISOString(),
    passed: true,
    timeSpentSeconds: 180,
    hintsUsed: 0,
    code: `// Reviewed solution for two-sum\n// Practiced in PairAlgo.ai`,
    mode: 'review'
  });

  return { progressList, attempts };
}
