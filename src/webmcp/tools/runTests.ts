import { getProblem, getProgress } from '../../engine/db';
import { runTests as executeSandbox } from '../../runner/runner';
import { getClientState, setClientState } from '../state';

export const runTestsTool = {
  name: 'run_tests',
  description:
    'Executes code against problem test cases inside the sandboxed Web Worker and returns test assertions, timing, and console logs.',
  parameters: {
    type: 'object',
    properties: {
      problemId: {
        type: 'string',
        description: 'Optional problem ID. Defaults to the currently active problem.'
      },
      code: {
        type: 'string',
        description: 'Optional solution code to test. Defaults to the current editor code.'
      }
    }
  },
  execute: async (args: { problemId?: string; code?: string } = {}) => {
    const currentState = getClientState();
    const problemId = args.problemId || currentState.activeProblemId;

    if (!problemId) {
      return {
        success: false,
        error: 'No active problem selected. Call start_problem first or provide a problemId.'
      };
    }

    const problem = await getProblem(problemId);
    if (!problem) {
      return {
        success: false,
        error: `Problem "${problemId}" not found.`
      };
    }

    // Determine code to run: passed code -> editor content on window -> saved code -> starter code
    let codeToRun = args.code;
    if (!codeToRun && typeof window !== 'undefined' && (window as any).__prep_cockpit_editor) {
      codeToRun = (window as any).__prep_cockpit_editor.getValue();
    }
    if (!codeToRun) {
      const progress = await getProgress(problem.id);
      codeToRun = progress?.savedCode || problem.starterCode;
    }

    const execResult = await executeSandbox(problem, codeToRun);

    // Update ambient state
    setClientState({
      testsPassed: execResult.passedCount,
      testsTotal: execResult.totalCount
    });

    return {
      success: true,
      problemId: problem.id,
      allPassed: execResult.allPassed,
      passedCount: execResult.passedCount,
      totalCount: execResult.totalCount,
      totalTimeMs: execResult.totalTimeMs,
      error: execResult.error,
      results: execResult.results.map(r => ({
        testIndex: r.testIndex,
        passed: r.passed,
        input: r.input,
        expected: r.expected,
        actual: r.actual,
        executionTimeMs: r.executionTimeMs,
        error: r.error,
        logs: r.logs
      }))
    };
  }
};
