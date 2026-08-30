import { getAllCategories, getAllProblems, getAllProgress, getAllAttempts } from '../../engine/db';
import { getRecommendation } from '../../engine/recommend';
import { getClientState, setClientState } from '../state';
import { addActivityEvent } from '../events';

export const getRecommendationTool = {
  name: 'get_recommendation',
  description:
    'Recommends the next optimal algorithm problem with deterministic mathematical reasoning based on spaced repetition review schedules, category pattern gaps, and interview frequency weights.',
  parameters: {
    type: 'object',
    properties: {
      set: {
        type: 'string',
        enum: ['all', 'core-75', 'extended-150'],
        description: 'Problem set filter (e.g. core-75 for Blind 75 focus).'
      },
      category: {
        type: 'string',
        description: 'Optional category slug to filter recommendations (e.g. 11_graphs).'
      },
      difficulty: {
        type: 'string',
        enum: ['easy', 'medium', 'hard'],
        description: 'Optional difficulty filter.'
      }
    }
  },
  execute: async (args: { set?: 'all' | 'core-75' | 'extended-150'; category?: string; difficulty?: 'easy' | 'medium' | 'hard' } = {}) => {
    const categories = await getAllCategories();
    const problems = await getAllProblems();
    const progressList = await getAllProgress();
    const attempts = await getAllAttempts();

    const progressMap = new Map(progressList.map(p => [p.problemId, p]));
    const currentState = getClientState();

    const filterSet = args.set || (currentState.targetFilter === 'all' ? undefined : currentState.targetFilter);
    const recommendation = getRecommendation(
      categories,
      problems,
      progressMap,
      attempts,
      {
        set: filterSet as any,
        categorySlug: args.category,
        difficulty: args.difficulty
      }
    );

    if (!recommendation) {
      return {
        success: false,
        message: 'No matching problems found for the specified criteria.'
      };
    }

    // Inform state
    setClientState({
      targetFilter: (filterSet as any) || 'all'
    });

    addActivityEvent({
      actor: 'agent',
      type: 'recommendation',
      summary: `ChatGPT recommended ${recommendation.problem.title}${recommendation.reason ? ` — ${recommendation.reason}` : ''}`,
      problemId: recommendation.problem.id,
      problemTitle: recommendation.problem.title,
      metadata: {
        reason: recommendation.reason,
        priority: recommendation.priority
      }
    });

    return {
      success: true,
      recommendation: {
        problemId: recommendation.problem.id,
        slug: recommendation.problem.slug,
        title: recommendation.problem.title,
        difficulty: recommendation.problem.difficulty,
        category: recommendation.problem.category,
        categorySlug: recommendation.problem.categorySlug,
        pattern: recommendation.problem.pattern,
        timeLimitMinutes: recommendation.problem.timeLimitMinutes,
        frequencyRank: recommendation.problem.frequencyRank,
        keyInsight: recommendation.problem.keyInsight,
        reason: recommendation.reason,
        priority: recommendation.priority,
        categoryConfidenceScore: recommendation.categoryConfidence,
        gapImpactScore: recommendation.gapScore
      }
    };
  }
};
