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

  // Streak days: 0 (today), -1, -2, -3, -4 (5 active days)
  const streakOffsets = [0, 1, 2, 3, 4];

  // Distribute the 47 problems across the last 30 days
  DEMO_SOLVED_PROBLEM_IDS.forEach((problemId, index) => {
    // Determine days ago: first 10 within 0-4 days (for active streak), others spread out 5-30 days ago
    let daysAgo: number;
    if (index < 10) {
      daysAgo = streakOffsets[index % streakOffsets.length];
    } else {
      daysAgo = 4 + (index % 25);
    }

    const attemptTime = new Date(nowMs - daysAgo * dayMs - (index * 15 * 60 * 1000));
    const timestamp = attemptTime.toISOString();

    // SM-2 values:
    // 2 problems overdue for review
    const isOverdue = problemId === 'invert-binary-tree' || problemId === 'valid-parentheses';
    const intervalDays = isOverdue ? 3 : (index % 4 === 0 ? 14 : index % 3 === 0 ? 7 : 3);
    const repetitions = isOverdue ? 2 : (intervalDays >= 14 ? 4 : 2);
    
    // If overdue, nextReviewDate was 2 days ago
    const nextReviewMs = isOverdue
      ? nowMs - 2 * dayMs
      : attemptTime.getTime() + intervalDays * dayMs;

    const hintsUsed = index % 7 === 0 ? 1 : 0;
    const timeSpentSeconds = 300 + (index % 8) * 90; // 5 to 17 minutes

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
      code: `// Verified solution for ${problemId}\n// Practiced in Prep Cockpit`,
      mode: 'practice'
    });
  });

  // Add a few extra review attempts in the 5-day streak to make timeline rich
  for (let i = 0; i < 5; i++) {
    const dAgo = i;
    const extraTime = new Date(nowMs - dAgo * dayMs - 4 * 3600 * 1000);
    attempts.push({
      problemId: DEMO_SOLVED_PROBLEM_IDS[i],
      timestamp: extraTime.toISOString(),
      passed: true,
      timeSpentSeconds: 420,
      hintsUsed: 0,
      code: `// Review session for ${DEMO_SOLVED_PROBLEM_IDS[i]}`,
      mode: 'review'
    });
  }

  return { progressList, attempts };
}
