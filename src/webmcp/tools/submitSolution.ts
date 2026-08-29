import {
  getProblem,
  getProgress,
  saveProgress,
  addAttempt,
  getAllCategories,
  getAllProblems,
  getAllProgress,
  getAllAttempts
} from '../../engine/db';
import { runTests as executeSandbox } from '../../runner/runner';
import { calculateSM2 } from '../../engine/spaced-repetition';
import {
  calculateSkillGraph,
  calculateSpeedScore,
  calculateIndependenceScore,
  calculateCategoryConfidence
} from '../../engine/scoring';
import { calculateStreak } from '../../engine/streak';
import { getClientState, setClientState } from '../state';
import type { ProblemProgress, AttemptLog } from '../../engine/types';

export const submitSolutionTool = {
  name: 'submit_solution',
  description:
    'Evaluates all test cases in sandbox, logs attempt to IndexedDB, advances SM-2 spaced repetition interval, recalculates skill readiness, and produces a performance scorecard.',
  parameters: {
    type: 'object',
    properties: {
      problemId: {
        type: 'string',
        description: 'Optional problem ID. Defaults to current active problem.'
      },
      code: {
        type: 'string',
        description: 'Optional solution code. Defaults to current editor code.'
      },
      timeSpentSeconds: {
        type: 'integer',
        description: 'Time spent on this problem in seconds.'
      }
    }
  },
  execute: async (args: {
    problemId?: string;
    code?: string;
    timeSpentSeconds?: number;
  } = {}) => {
    const currentState = getClientState();
    const problemId = args.problemId || currentState.activeProblemId;

    if (!problemId) {
      return {
        success: false,
        error: 'No active problem selected. Call start_problem first or specify problemId.'
      };
    }

    const problem = await getProblem(problemId);
    if (!problem) {
      return {
        success: false,
        error: `Problem "${problemId}" not found.`
      };
    }

    // Determine code to run
    let codeToRun = args.code;
    if (!codeToRun && typeof window !== 'undefined' && (window as any).__prep_cockpit_editor) {
      codeToRun = (window as any).__prep_cockpit_editor.getValue();
    }
    if (!codeToRun) {
      const progress = await getProgress(problem.id);
      codeToRun = progress?.savedCode || problem.starterCode;
    }

    // Determine time spent
    let timeSpentSeconds = args.timeSpentSeconds;
    if (timeSpentSeconds === undefined || timeSpentSeconds <= 0) {
      if (currentState.timeRemainingSeconds !== undefined) {
        const totalSec = problem.timeLimitMinutes * 60;
        timeSpentSeconds = Math.max(10, totalSec - currentState.timeRemainingSeconds);
      } else {
        timeSpentSeconds = 300; // default 5m
      }
    }

    const hintsUsed = currentState.hintsRevealed || 0;

    // Run tests in sandbox
    const execResult = await executeSandbox(problem, codeToRun);

    const now = new Date();
    const timestamp = now.toISOString();

    if (!execResult.allPassed) {
      // Record failed attempt
      const attempt: AttemptLog = {
        problemId: problem.id,
        timestamp,
        passed: false,
        timeSpentSeconds,
        hintsUsed,
        code: codeToRun,
        mode: 'practice'
      };
      await addAttempt(attempt);

      const existingProgress = (await getProgress(problem.id)) || {
        problemId: problem.id,
        status: 'practicing',
        solveCount: 0,
        failCount: 0,
        sm2IntervalDays: 1,
        sm2Repetitions: 0,
        sm2EaseFactor: 2.5
      };

      const sm2Update = calculateSM2(
        existingProgress.sm2Repetitions,
        existingProgress.sm2EaseFactor,
        false,
        hintsUsed,
        now
      );

      const updatedProgress: ProblemProgress = {
        ...existingProgress,
        status: existingProgress.solveCount > 0 ? 'solved' : 'practicing',
        lastAttemptDate: timestamp,
        failCount: existingProgress.failCount + 1,
        lastTimeSeconds: timeSpentSeconds,
        lastHintsUsed: hintsUsed,
        sm2IntervalDays: sm2Update.intervalDays,
        sm2Repetitions: sm2Update.repetitions,
        sm2EaseFactor: sm2Update.easeFactor,
        nextReviewDate: sm2Update.nextReviewDate,
        savedCode: codeToRun
      };
      await saveProgress(updatedProgress);

      return {
        success: false,
        passed: false,
        message: 'Solution failed one or more test cases.',
        passedCount: execResult.passedCount,
        totalCount: execResult.totalCount,
        results: execResult.results,
        error: execResult.error
      };
    }

    // Solution PASSED! Update progress and SM-2
    const existingProgress = (await getProgress(problem.id)) || {
      problemId: problem.id,
      status: 'unattempted',
      solveCount: 0,
      failCount: 0,
      sm2IntervalDays: 1,
      sm2Repetitions: 0,
      sm2EaseFactor: 2.5
    };

    const sm2Update = calculateSM2(
      existingProgress.sm2Repetitions,
      existingProgress.sm2EaseFactor,
      true,
      hintsUsed,
      now
    );

    const updatedProgress: ProblemProgress = {
      problemId: problem.id,
      status: 'solved',
      lastAttemptDate: timestamp,
      solveCount: existingProgress.solveCount + 1,
      failCount: existingProgress.failCount,
      bestTimeSeconds: Math.min(
        existingProgress.bestTimeSeconds || Infinity,
        timeSpentSeconds
      ),
      lastTimeSeconds: timeSpentSeconds,
      lastHintsUsed: hintsUsed,
      sm2IntervalDays: sm2Update.intervalDays,
      sm2Repetitions: sm2Update.repetitions,
      sm2EaseFactor: sm2Update.easeFactor,
      nextReviewDate: sm2Update.nextReviewDate,
      savedCode: codeToRun
    };
    await saveProgress(updatedProgress);

    const attempt: AttemptLog = {
      problemId: problem.id,
      timestamp,
      passed: true,
      timeSpentSeconds,
      hintsUsed,
      code: codeToRun,
      mode: existingProgress.solveCount > 0 ? 'review' : 'practice'
    };
    await addAttempt(attempt);

    // Recalculate skill graph & streak
    const allCats = await getAllCategories();
    const allProbs = await getAllProblems();
    const allProgs = await getAllProgress();
    const allAtts = await getAllAttempts();

    const streakInfo = calculateStreak(allAtts, now);
    const progressMap = new Map(allProgs.map(p => [p.problemId, p]));
    const skillGraph = calculateSkillGraph(
      allCats,
      allProbs,
      progressMap,
      allAtts,
      streakInfo.currentStreak,
      now
    );

    const speedScore = calculateSpeedScore(problem.timeLimitMinutes, timeSpentSeconds);
    const independenceScore = calculateIndependenceScore(hintsUsed);

    const catObj = allCats.find(c => c.slug === problem.categorySlug);
    const categoryConf = catObj
      ? calculateCategoryConfidence(
          catObj,
          allProbs.filter(p => p.categorySlug === catObj.slug),
          progressMap,
          allAtts,
          now
        ).confidence
      : 0;

    // Update ambient state
    setClientState({
      userReadiness: skillGraph.overallReadiness,
      streakDays: skillGraph.streakDays,
      testsPassed: execResult.passedCount,
      testsTotal: execResult.totalCount
    });

    // Trigger UI scorecard modal event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('prep-cockpit:scorecard', {
          detail: {
            problem,
            timeSpentSeconds,
            speedScore,
            independenceScore,
            sm2Update,
            readiness: skillGraph.overallReadiness,
            categoryConfidence: categoryConf,
            streakDays: streakInfo.currentStreak
          }
        })
      );
    }

    return {
      success: true,
      passed: true,
      scorecard: {
        problemId: problem.id,
        title: problem.title,
        difficulty: problem.difficulty,
        category: problem.category,
        timeSpentSeconds,
        targetMinutes: problem.timeLimitMinutes,
        speedScore: Number(speedScore.toFixed(2)),
        independenceScore: Number(independenceScore.toFixed(2)),
        hintsUsed,
        testsPassed: execResult.passedCount,
        testsTotal: execResult.totalCount,
        sm2: {
          intervalDays: sm2Update.intervalDays,
          repetitions: sm2Update.repetitions,
          nextReviewDate: sm2Update.nextReviewDate
        },
        newReadinessScore: skillGraph.overallReadiness,
        newStreakDays: streakInfo.currentStreak,
        categoryConfidence: categoryConf
      }
    };
  }
};
