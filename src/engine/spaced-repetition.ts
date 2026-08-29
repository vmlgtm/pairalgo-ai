import type { Problem, ProblemProgress } from './types';

const SM2_INTERVALS = [1, 3, 7, 14, 30];

export interface SM2UpdateResult {
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: string; // ISO string
  isDue: boolean;
}

/**
 * Calculates next review interval and date following the SM-2 algorithm customized for interview practice.
 *
 * Rules:
 * - Passed with <= 1 hint: increment repetition count, get interval from progression [1, 3, 7, 14, 30]
 * - Failed or > 1 hint used: reset repetitions to 0, interval to 1 day
 */
export function calculateSM2(
  currentRepetitions: number = 0,
  currentEaseFactor: number = 2.5,
  passed: boolean = true,
  hintsUsed: number = 0,
  baseDate: Date = new Date()
): SM2UpdateResult {
  let repetitions = currentRepetitions;
  let easeFactor = currentEaseFactor;
  let intervalDays = 1;

  if (passed && hintsUsed <= 1) {
    repetitions = currentRepetitions + 1;
    const intervalIndex = Math.min(repetitions - 1, SM2_INTERVALS.length - 1);
    intervalDays = SM2_INTERVALS[Math.max(0, intervalIndex)];
    
    // Slight ease factor adjustment if unassisted
    if (hintsUsed === 0) {
      easeFactor = Math.min(3.0, easeFactor + 0.1);
    }
  } else {
    // Reset to review immediately tomorrow
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }

  const nextReviewTime = baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000;
  const nextReviewDate = new Date(nextReviewTime).toISOString();

  return {
    intervalDays,
    repetitions,
    easeFactor: Number(easeFactor.toFixed(2)),
    nextReviewDate,
    isDue: false
  };
}

/**
 * Checks whether a problem is currently due for spaced repetition review.
 */
export function isDueForReview(progress: ProblemProgress, now: Date = new Date()): boolean {
  if (progress.status === 'unattempted') return false;
  if (!progress.nextReviewDate) return false;
  return new Date(progress.nextReviewDate).getTime() <= now.getTime();
}

export interface DueProblemItem {
  problem: Problem;
  progress: ProblemProgress;
  overdueDays: number;
  urgencyScore: number;
}

/**
 * Returns all problems that are currently due or overdue for spaced repetition review,
 * sorted by urgency (highest overdue ratio first).
 */
export function getDueForReview(
  problems: Problem[],
  progressList: ProblemProgress[],
  now: Date = new Date()
): DueProblemItem[] {
  const problemMap = new Map<string, Problem>(problems.map(p => [p.id, p]));
  const dueItems: DueProblemItem[] = [];

  for (const prog of progressList) {
    if (isDueForReview(prog, now)) {
      const prob = problemMap.get(prog.problemId);
      if (prob) {
        const nextReviewTime = new Date(prog.nextReviewDate!).getTime();
        const overdueMs = Math.max(0, now.getTime() - nextReviewTime);
        const overdueDays = Number((overdueMs / (1000 * 60 * 60 * 24)).toFixed(1));
        const interval = Math.max(1, prog.sm2IntervalDays || 1);
        const urgencyScore = overdueDays / interval;

        dueItems.push({
          problem: prob,
          progress: prog,
          overdueDays,
          urgencyScore
        });
      }
    }
  }

  return dueItems.sort((a, b) => b.urgencyScore - a.urgencyScore);
}
