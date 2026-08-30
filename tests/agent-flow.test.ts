import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRecommendationTool } from '../src/webmcp/tools/getRecommendation';
import { startProblemTool } from '../src/webmcp/tools/startProblem';
import { runTestsTool } from '../src/webmcp/tools/runTests';
import { getHintTool } from '../src/webmcp/tools/getHint';
import { submitSolutionTool } from '../src/webmcp/tools/submitSolution';
import { getClientState, setClientState } from '../src/webmcp/state';
import { getActivityEvents, clearActivityEvents } from '../src/webmcp/events';
import { SUGGESTED_PROMPTS } from '../src/ui/guide';
import * as db from '../src/engine/db';

function setGlobal(name: string, value: any) {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true
  });
}

describe('Continuous Agent Flow Suite', () => {
  const originalDocument = (globalThis as any).document;
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearActivityEvents();
    setClientState({
      view: 'dashboard',
      userReadiness: 0.5,
      streakDays: 3,
      targetFilter: 'all',
      editorDirty: false,
      activeProblemId: undefined
    });
  });

  afterEach(() => {
    setGlobal('document', originalDocument);
    setGlobal('window', originalWindow);
  });

  it('contains clear suggested prompts matching onboarding requirements', () => {
    const promptTexts = SUGGESTED_PROMPTS.map(p => p.prompt);
    expect(promptTexts).toContain('What should I practice today?');
    expect(promptTexts).toContain('Start the recommended problem.');
    expect(promptTexts).toContain('Run my latest code and explain any failing test.');
    expect(promptTexts).toContain('Give me hint 1 without revealing the solution.');
  });

  it('executes continuous loop: recommend -> start -> run tests -> hint -> submit', async () => {
    const mockProblem: any = {
      id: 'two-sum',
      slug: 'two-sum',
      title: 'Two Sum',
      difficulty: 'easy',
      category: 'Arrays',
      categorySlug: '01_arrays',
      pattern: 'hash_map',
      timeLimitMinutes: 15,
      frequencyRank: 1,
      description: 'Given an array of integers...',
      functionName: 'twoSum',
      params: [{ name: 'nums', type: 'number[]' }, { name: 'target', type: 'number' }],
      returnType: 'number[]',
      starterCode: 'function twoSum(nums: number[], target: number): number[] {\n  return [];\n}',
      testCases: [
        {
          input: { nums: [2, 7, 11, 15], target: 9 },
          expected: [0, 1]
        }
      ],
      isCore75: true,
      lists: ['core-75', 'extended-150'],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      keyInsight: 'Use a hash map to store complements',
      commonPitfalls: ['Forgetting to check duplicate indices'],
      hints: ['Think about storing values in a map.', 'Map each number to its index.']
    };

    vi.spyOn(db, 'getAllCategories').mockResolvedValue([
      { slug: '01_arrays', name: 'Arrays', weight: 0.12 }
    ]);
    vi.spyOn(db, 'getAllProblems').mockResolvedValue([mockProblem]);
    vi.spyOn(db, 'getProblem').mockResolvedValue(mockProblem);
    vi.spyOn(db, 'getAllProgress').mockResolvedValue([]);
    vi.spyOn(db, 'getProgress').mockResolvedValue(null);
    vi.spyOn(db, 'getAllAttempts').mockResolvedValue([]);
    vi.spyOn(db, 'saveProgress').mockResolvedValue(undefined as any);
    vi.spyOn(db, 'addAttempt').mockResolvedValue(1);

    // 1. ChatGPT recommends a problem
    const recResult = await getRecommendationTool.execute({ set: 'core-75' });
    expect(recResult.success).toBe(true);
    expect(recResult.recommendation?.problemId).toBe('two-sum');

    let events = getActivityEvents();
    expect(events.some(e => e.type === 'recommendation' && e.actor === 'agent')).toBe(true);

    // 2. ChatGPT starts the recommended problem
    const startResult = await startProblemTool.execute({ problemId: 'two-sum' });
    expect(startResult.success).toBe(true);
    expect(getClientState().view).toBe('workspace');
    expect(getClientState().activeProblemId).toBe('two-sum');
    expect(getClientState().editorDirty).toBe(false);

    events = getActivityEvents();
    expect(events.some(e => e.type === 'problem_started' && e.problemId === 'two-sum')).toBe(true);

    // 3. ChatGPT runs tests against starter code (failing)
    const runResult = await runTestsTool.execute({ problemId: 'two-sum' });
    expect(runResult.success).toBe(true);
    expect(runResult.allPassed).toBe(false);
    expect(getClientState().testsPassed).toBe(0);
    expect(getClientState().editorDirty).toBe(false);
    expect(getClientState().lastTestSummary?.passedCount).toBe(0);

    events = getActivityEvents('two-sum');
    expect(events[0].type).toBe('tests_run');
    expect(events[0].actor).toBe('agent');
    expect(events[0].summary).toContain('0/1 passing');

    // 4. ChatGPT provides Hint 1
    const hintResult = await getHintTool.execute({ problemId: 'two-sum', level: 1 });
    expect(hintResult.success).toBe(true);
    expect(hintResult.level).toBe(1);
    expect(getClientState().hintsRevealed).toBe(1);

    events = getActivityEvents('two-sum');
    expect(events[0].type).toBe('hint_provided');
    expect(events[0].summary).toBe('ChatGPT provided Hint 1');

    // 5. User fixes code and ChatGPT runs tests again (passing)
    const passingCode = `
      function twoSum(nums, target) {
        const map = new Map();
        for (let i = 0; i < nums.length; i++) {
          const comp = target - nums[i];
          if (map.has(comp)) return [map.get(comp), i];
          map.set(nums[i], i);
        }
        return [];
      }
    `;

    const runResult2 = await runTestsTool.execute({
      problemId: 'two-sum',
      code: passingCode
    });
    expect(runResult2.success).toBe(true);
    expect(runResult2.allPassed).toBe(true);
    expect(getClientState().testsPassed).toBe(1);
    expect(getClientState().lastTestSummary?.allPassed).toBe(true);

    // 6. ChatGPT submits solution
    const submitResult = await submitSolutionTool.execute({
      problemId: 'two-sum',
      code: passingCode,
      timeSpentSeconds: 180
    });
    expect(submitResult.success).toBe(true);
    expect(submitResult.passed).toBe(true);

    events = getActivityEvents('two-sum');
    expect(events[0].type).toBe('solution_submitted');
    expect(events[0].actor).toBe('agent');
    expect(events[0].summary).toContain('Passed');
  });

  it('keeps raw code out of ambient client state', async () => {
    const state = getClientState();
    expect((state as any).code).toBeUndefined();
    expect((state as any).editorCode).toBeUndefined();
    expect((state as any).rawCode).toBeUndefined();
  });

  it('dispatches custom events to window when tests run and hints are revealed', async () => {
    const mockProblem: any = {
      id: 'two-sum',
      title: 'Two Sum',
      functionName: 'twoSum',
      starterCode: 'function twoSum(nums, target) { return [0, 1]; }',
      testCases: [{ input: { nums: [2, 7], target: 9 }, expected: [0, 1] }],
      params: [{ name: 'nums', type: 'number[]' }, { name: 'target', type: 'number' }],
      returnType: 'number[]',
      hints: ['Hint 1', 'Hint 2']
    };

    vi.spyOn(db, 'getProblem').mockResolvedValue(mockProblem);

    const testEventSpy = vi.fn();
    const hintEventSpy = vi.fn();

    const mockWindow = {
      dispatchEvent: vi.fn((event: any) => {
        if (event.type === 'prep-cockpit:tests-executed') testEventSpy(event.detail);
        if (event.type === 'prep-cockpit:hint-revealed') hintEventSpy(event.detail);
      })
    };
    setGlobal('window', mockWindow);

    await runTestsTool.execute({ problemId: 'two-sum', code: mockProblem.starterCode });
    expect(testEventSpy).toHaveBeenCalled();
    expect(testEventSpy.mock.calls[0][0].problemId).toBe('two-sum');
    expect(testEventSpy.mock.calls[0][0].execResult.allPassed).toBe(true);

    await getHintTool.execute({ problemId: 'two-sum', level: 2 });
    expect(hintEventSpy).toHaveBeenCalled();
    expect(hintEventSpy.mock.calls[0][0].problemId).toBe('two-sum');
    expect(hintEventSpy.mock.calls[0][0].level).toBe(2);
  });

  it('properly manages editorDirty state transitions', () => {
    setClientState({ editorDirty: true });
    expect(getClientState().editorDirty).toBe(true);

    setClientState({ editorDirty: false });
    expect(getClientState().editorDirty).toBe(false);
  });
});

