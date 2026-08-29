import { getProblem } from '../../engine/db';
import { getClientState, setClientState } from '../state';

export const getHintTool = {
  name: 'get_hint',
  description:
    'Provides progressive Socratic hints (Level 1: Intuition/Pattern, Level 2: Data Structure Strategy, Level 3: Concrete Implementation Step) without revealing complete code.',
  parameters: {
    type: 'object',
    required: ['level'],
    properties: {
      problemId: {
        type: 'string',
        description: 'Optional problem ID. Defaults to the currently active problem.'
      },
      level: {
        type: 'integer',
        minimum: 1,
        maximum: 3,
        description: 'Hint level: 1 = High-level Intuition, 2 = Data Structure Strategy, 3 = Implementation Guidance.'
      }
    }
  },
  execute: async (args: { problemId?: string; level: number }) => {
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

    const level = Math.max(1, Math.min(3, args.level || 1));
    const hints = problem.hints || [];
    const hintText = hints[level - 1] || hints[hints.length - 1] || 'Focus on the problem constraints and edge cases.';

    // Update ambient state hints revealed
    const currentHintsRevealed = currentState.hintsRevealed || 0;
    const newHintsRevealed = Math.max(currentHintsRevealed, level);
    setClientState({
      hintsRevealed: newHintsRevealed
    });

    return {
      success: true,
      problemId: problem.id,
      level,
      totalHints: hints.length,
      hint: hintText,
      keyInsight: level >= 2 ? problem.keyInsight : undefined,
      commonPitfalls: level >= 3 ? problem.commonPitfalls : undefined,
      hintsUsedCount: newHintsRevealed
    };
  }
};
