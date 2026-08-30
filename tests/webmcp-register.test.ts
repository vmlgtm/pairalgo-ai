import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerAllTools, getWebMCPStatus, executeTool, ALL_TOOLS } from '../src/webmcp/register';
import * as db from '../src/engine/db';

function setGlobal(name: string, value: any) {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true
  });
}

describe('WebMCP Tool Registration Suite', () => {
  const originalDocument = (globalThis as any).document;
  const originalNavigator = (globalThis as any).navigator;
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setGlobal('document', originalDocument);
    setGlobal('navigator', originalNavigator);
    setGlobal('window', originalWindow);
  });

  it('registers all six tools on document.modelContext with standard WebMCP imperative API', async () => {
    const registeredTools: any[] = [];
    const mockModelContext = {
      registerTool: vi.fn(async (toolDef: any) => {
        registeredTools.push(toolDef);
      }),
      getTools: vi.fn(() => registeredTools)
    };

    setGlobal('document', { modelContext: mockModelContext });
    setGlobal('window', {});
    setGlobal('navigator', {});

    const result = await registerAllTools();

    expect(mockModelContext.registerTool).toHaveBeenCalledTimes(6);
    expect(result).toHaveLength(6);
    expect(getWebMCPStatus()).toBe('ready');

    const expectedToolNames = [
      'get_recommendation',
      'start_problem',
      'run_tests',
      'get_hint',
      'submit_solution',
      'get_skill_profile'
    ];

    const tools = mockModelContext.getTools();
    expect(tools.map(t => t.name)).toEqual(expectedToolNames);

    // Verify each returned tool has name, description, inputSchema, and an executable callback
    for (const tool of tools) {
      expect(tool.name).toBeDefined();
      expect(typeof tool.name).toBe('string');
      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe('string');
      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.inputSchema).toBe('object');
      expect(tool.execute).toBeDefined();
      expect(typeof tool.execute).toBe('function');
    }
  });

  it('calls tool execute callback and returns structured data for get_recommendation', async () => {
    const registeredTools: any[] = [];
    const mockModelContext = {
      registerTool: vi.fn(async (toolDef: any) => {
        registeredTools.push(toolDef);
      }),
      getTools: vi.fn(() => registeredTools)
    };

    setGlobal('document', { modelContext: mockModelContext });
    setGlobal('window', {});
    setGlobal('navigator', {});

    // Mock DB calls for getRecommendation
    vi.spyOn(db, 'getAllCategories').mockResolvedValue([
      { slug: '01_arrays', name: 'Arrays', weight: 0.12 }
    ]);
    vi.spyOn(db, 'getAllProblems').mockResolvedValue([
      {
        id: 'two-sum',
        slug: 'two-sum',
        title: 'Two Sum',
        difficulty: 'easy',
        category: 'Arrays',
        categorySlug: '01_arrays',
        pattern: 'hash_map',
        timeLimitMinutes: 15,
        frequencyRank: 1,
        description: 'Find two indices',
        functionName: 'twoSum',
        params: [],
        returnType: 'number[]',
        starterCode: '',
        testCases: [],
        isCore75: true,
        lists: ['core-75', 'extended-150'],
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
        keyInsight: 'Hash map lookups',
        commonPitfalls: [],
        hints: []
      }
    ]);
    vi.spyOn(db, 'getAllProgress').mockResolvedValue([]);
    vi.spyOn(db, 'getAllAttempts').mockResolvedValue([]);

    await registerAllTools();

    const getRecTool = registeredTools.find(t => t.name === 'get_recommendation');
    expect(getRecTool).toBeDefined();

    const response = await getRecTool.execute({ set: 'core-75' });
    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(response.recommendation).toBeDefined();
    expect(response.recommendation.problemId).toBe('two-sum');
    expect(response.recommendation.pattern).toBe('hash_map');
  });

  it('accurately reports registration errors and does not claim WebMCP ready if all registrations fail', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockModelContext = {
      registerTool: vi.fn().mockRejectedValue(new Error('Simulated WebMCP registration failure'))
    };

    setGlobal('document', { modelContext: mockModelContext });
    setGlobal('window', {});
    setGlobal('navigator', {});

    const result = await registerAllTools();

    expect(mockModelContext.registerTool).toHaveBeenCalledTimes(6);
    expect(result).toHaveLength(0);
    expect(getWebMCPStatus()).toBe('failed');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('only lists successfully registered tools when partial registration failure occurs', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    let callCount = 0;
    const mockModelContext = {
      registerTool: vi.fn(async (toolDef: any) => {
        callCount++;
        if (callCount <= 2) {
          throw new Error(`Failed to register ${toolDef.name}`);
        }
      })
    };

    setGlobal('document', { modelContext: mockModelContext });
    setGlobal('window', {});
    setGlobal('navigator', {});

    const result = await registerAllTools();

    expect(result).toHaveLength(4);
    expect(result).not.toContain(ALL_TOOLS[0].name);
    expect(result).not.toContain(ALL_TOOLS[1].name);
    expect(getWebMCPStatus()).toBe('ready');
  });

  it('preserves window.callWebMCPTool and window.__webmcp_tools fallback harness', async () => {
    const mockWindow: any = {};
    setGlobal('document', undefined);
    setGlobal('navigator', undefined);
    setGlobal('window', mockWindow);

    const result = await registerAllTools();

    expect(result).toHaveLength(6);
    expect(getWebMCPStatus()).toBe('fallback');
    expect(mockWindow.__webmcp_tools).toBeDefined();
    expect(typeof mockWindow.callWebMCPTool).toBe('function');

    // Test unknown tool throws error
    await expect(mockWindow.callWebMCPTool('non_existent_tool')).rejects.toThrow(
      'Tool "non_existent_tool" not found'
    );
  });

  it('registers tools with parameters and handler on legacy navigator.tools adapter', async () => {
    const registeredOnNav: any[] = [];
    const mockNavigator = {
      tools: {
        register: vi.fn(async (toolDef: any) => {
          registeredOnNav.push(toolDef);
        })
      }
    };

    setGlobal('document', undefined);
    setGlobal('navigator', mockNavigator);
    setGlobal('window', {});

    const result = await registerAllTools();

    expect(mockNavigator.tools.register).toHaveBeenCalledTimes(6);
    expect(result).toHaveLength(6);
    expect(getWebMCPStatus()).toBe('ready');

    for (const tool of registeredOnNav) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.parameters).toBeDefined();
      expect(tool.handler).toBeDefined();
      expect(typeof tool.handler).toBe('function');
    }
  });

  it('executes tools directly using executeTool helper', async () => {
    vi.spyOn(db, 'getAllCategories').mockResolvedValue([]);
    vi.spyOn(db, 'getAllProblems').mockResolvedValue([]);
    vi.spyOn(db, 'getAllProgress').mockResolvedValue([]);
    vi.spyOn(db, 'getAllAttempts').mockResolvedValue([]);

    const res = await executeTool('get_recommendation', { set: 'core-75' });
    expect(res).toBeDefined();
    expect(res.success).toBe(false); // No problems in mock DB
    expect(res.message).toBe('No matching problems found for the specified criteria.');

    await expect(executeTool('invalid_tool_name')).rejects.toThrow(
      'WebMCP Tool "invalid_tool_name" is not registered.'
    );
  });
});
