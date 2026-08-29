import { getProblem, getProgress } from '../../engine/db';
import { setClientState } from '../state';

export const startProblemTool = {
  name: 'start_problem',
  description:
    'Loads the specified algorithm problem into the workspace, switches view to workspace, resets timer, and updates ambient context for AI coaching.',
  parameters: {
    type: 'object',
    required: ['problemId'],
    properties: {
      problemId: {
        type: 'string',
        description: 'The unique ID or slug of the problem to start (e.g. "course-schedule" or "two-sum").'
      }
    }
  },
  execute: async (args: { problemId: string }) => {
    const { problemId } = args;
    if (!problemId) {
      return { success: false, error: 'problemId is required' };
    }

    const problem = await getProblem(problemId);
    if (!problem) {
      return {
        success: false,
        error: `Problem with ID "${problemId}" was not found.`
      };
    }

    const progress = await getProgress(problem.id);
    const codeToLoad = progress?.savedCode || problem.starterCode;

    // Update ambient state
    setClientState({
      view: 'workspace',
      activeProblemId: problem.id,
      timeRemainingSeconds: problem.timeLimitMinutes * 60,
      testsPassed: 0,
      testsTotal: problem.testCases.length,
      hintsRevealed: 0
    });

    // Update URL hash for clean browser routing
    if (typeof window !== 'undefined') {
      window.location.hash = `#p=${problem.id}`;
    }

    return {
      success: true,
      problem: {
        id: problem.id,
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        category: problem.category,
        pattern: problem.pattern,
        timeLimitMinutes: problem.timeLimitMinutes,
        description: problem.description,
        functionName: problem.functionName,
        params: problem.params,
        returnType: problem.returnType,
        starterCode: codeToLoad,
        testCasesCount: problem.testCases.length,
        timeComplexityGoal: problem.timeComplexity,
        spaceComplexityGoal: problem.spaceComplexity
      }
    };
  }
};
