import { getRecommendationTool } from './tools/getRecommendation';
import { startProblemTool } from './tools/startProblem';
import { runTestsTool } from './tools/runTests';
import { getHintTool } from './tools/getHint';
import { submitSolutionTool } from './tools/submitSolution';
import { getSkillProfileTool } from './tools/getSkillProfile';

export interface WebMCPToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: any) => Promise<any>;
}

export const ALL_TOOLS: WebMCPToolDefinition[] = [
  getRecommendationTool,
  startProblemTool,
  runTestsTool,
  getHintTool,
  submitSolutionTool,
  getSkillProfileTool
];

let registrationStatus: 'idle' | 'ready' | 'fallback' | 'failed' = 'idle';

export function getWebMCPStatus(): 'idle' | 'ready' | 'fallback' | 'failed' {
  return registrationStatus;
}

/**
 * Registers all Prep Cockpit tools with the WebMCP browser protocol.
 * Supports standard document.modelContext, legacy navigator.tools, and window.__webmcp_tools.
 */
export async function registerAllTools(): Promise<string[]> {
  const registeredNames: string[] = [];
  const modelContextAvailable = typeof document !== 'undefined' && Boolean((document as any).modelContext?.registerTool);
  const navigatorToolsAvailable = typeof navigator !== 'undefined' && Boolean((navigator as any).tools?.register);
  const hasProvider = modelContextAvailable || navigatorToolsAvailable;

  const successfullyRegistered = new Set<string>();

  for (const tool of ALL_TOOLS) {
    // 1. Standard WebMCP imperative API: document.modelContext.registerTool()
    if (modelContextAvailable) {
      try {
        await (document as any).modelContext.registerTool({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.parameters,
          execute: async (args: any, _options?: any) => tool.execute(args)
        });
        successfullyRegistered.add(tool.name);
      } catch (err) {
        console.error(`[WebMCP] Failed to register "${tool.name}" on document.modelContext:`, err);
      }
    }

    // 2. Legacy navigator.tools adapter
    if (navigatorToolsAvailable) {
      try {
        await (navigator as any).tools.register({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          handler: tool.execute
        });
        successfullyRegistered.add(tool.name);
      } catch (err) {
        console.warn(`[WebMCP] Failed to register "${tool.name}" on navigator.tools:`, err);
      }
    }
  }

  // 3. Fallback & developer inspection bridge on window
  if (typeof window !== 'undefined') {
    const toolMap: Record<string, WebMCPToolDefinition> = {};
    for (const tool of ALL_TOOLS) {
      toolMap[tool.name] = tool;
    }
    (window as any).__webmcp_tools = toolMap;
    (window as any).callWebMCPTool = async (toolName: string, args: any = {}) => {
      const tool = toolMap[toolName];
      if (!tool) {
        throw new Error(`Tool "${toolName}" not found. Available: ${Object.keys(toolMap).join(', ')}`);
      }
      return tool.execute(args);
    };
  }

  if (hasProvider) {
    if (successfullyRegistered.size > 0) {
      registrationStatus = 'ready';
      registeredNames.push(...Array.from(successfullyRegistered));
      console.log(
        `%c[WebMCP] Successfully registered ${registeredNames.length} AI agent tools:\n` +
        registeredNames.map(n => ` • ${n}`).join('\n'),
        'color: #4ade80; font-weight: bold;'
      );
    } else {
      registrationStatus = 'failed';
      console.error('[WebMCP] Tool registration failed: No tools could be registered with the WebMCP provider.');
    }
  } else {
    registrationStatus = 'fallback';
    for (const tool of ALL_TOOLS) {
      registeredNames.push(tool.name);
    }
    console.log(
      `%c[WebMCP Fallback] Successfully registered ${registeredNames.length} AI agent tools:\n` +
      registeredNames.map(n => ` • ${n}`).join('\n'),
      'color: #4ade80; font-weight: bold;'
    );
  }

  return registeredNames;
}

/**
 * Execute a tool directly by name.
 */
export async function executeTool(name: string, args: any = {}): Promise<any> {
  const tool = ALL_TOOLS.find(t => t.name === name);
  if (!tool) {
    throw new Error(`WebMCP Tool "${name}" is not registered.`);
  }
  return tool.execute(args);
}
