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

/**
 * Registers all Prep Cockpit tools with the WebMCP browser protocol.
 * Supports standard navigator.tools, document.modelContext, and window.__webmcp_tools.
 */
export function registerAllTools(): void {
  const registeredNames: string[] = [];

  for (const tool of ALL_TOOLS) {
    // 1. Standard WebMCP via navigator.tools.register()
    if (typeof navigator !== 'undefined' && (navigator as any).tools?.register) {
      try {
        (navigator as any).tools.register({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          handler: tool.execute
        });
      } catch (err) {
        console.warn(`[WebMCP] Failed to register "${tool.name}" on navigator.tools:`, err);
      }
    }

    // 2. Alternative / experimental standard: document.modelContext.registerTool()
    if (typeof document !== 'undefined' && (document as any).modelContext?.registerTool) {
      try {
        (document as any).modelContext.registerTool({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          handler: tool.execute
        });
      } catch (err) {
        console.warn(`[WebMCP] Failed to register "${tool.name}" on document.modelContext:`, err);
      }
    }

    registeredNames.push(tool.name);
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

    console.log(
      `%c[WebMCP] Successfully registered ${registeredNames.length} AI agent tools:\n` +
      registeredNames.map(n => ` • ${n}`).join('\n'),
      'color: #4ade80; font-weight: bold;'
    );
  }
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
