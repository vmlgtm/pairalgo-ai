import {
  getAllCategories,
  getAllProblems,
  getAllProgress,
  getAllAttempts
} from '../../engine/db';
import { calculateSkillGraph } from '../../engine/scoring';
import { calculateStreak } from '../../engine/streak';
import { setClientState } from '../state';

export const getSkillProfileTool = {
  name: 'get_skill_profile',
  description:
    'Returns comprehensive interview readiness metrics, daily streak status, and category-by-category confidence, retention, and speed scores.',
  parameters: {
    type: 'object',
    properties: {}
  },
  execute: async () => {
    const categories = await getAllCategories();
    const problems = await getAllProblems();
    const progressList = await getAllProgress();
    const attempts = await getAllAttempts();

    const now = new Date();
    const streakInfo = calculateStreak(attempts, now);
    const progressMap = new Map(progressList.map(p => [p.problemId, p]));

    const skillGraph = calculateSkillGraph(
      categories,
      problems,
      progressMap,
      attempts,
      streakInfo.currentStreak,
      now
    );

    // Sync ambient state
    setClientState({
      userReadiness: skillGraph.overallReadiness,
      streakDays: skillGraph.streakDays
    });

    return {
      success: true,
      profile: {
        overallReadiness: skillGraph.overallReadiness,
        overallReadinessPercentage: `${Math.round(skillGraph.overallReadiness * 100)}%`,
        streak: {
          currentDays: streakInfo.currentStreak,
          longestDays: streakInfo.longestStreak,
          isActiveToday: streakInfo.isActiveToday,
          lastActiveDate: streakInfo.lastActiveDate
        },
        totalSolved: skillGraph.totalSolved,
        totalProblems: problems.length,
        categoryBreakdown: Object.values(skillGraph.patterns).map(pat => ({
          categorySlug: pat.categorySlug,
          categoryName: pat.categoryName,
          confidence: pat.confidence,
          confidencePercentage: `${Math.round(pat.confidence * 100)}%`,
          problemsSolved: pat.problemsSolved,
          totalProblems: pat.totalProblems,
          retentionScore: pat.retentionScore,
          speedScore: pat.speedScore,
          lastPracticed: pat.lastPracticed
        }))
      }
    };
  }
};
