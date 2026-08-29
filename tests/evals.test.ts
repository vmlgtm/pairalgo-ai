import { describe, it, expect } from 'vitest';
import { ALL_TOOLS } from '../src/webmcp/register';
import evalsDataset from '../evals/webmcp-evals.json';

describe('Chrome WebMCP Evals Compliance Suite', () => {
  it('loads valid evals dataset conforming to Chrome WebMCP format', () => {
    expect(Array.isArray(evalsDataset)).toBe(true);
    expect(evalsDataset.length).toBeGreaterThanOrEqual(6);

    for (const item of evalsDataset) {
      expect(item.id).toBeDefined();
      expect(item.messages).toBeDefined();
      expect(item.expectedCall).toBeDefined();
      expect(Array.isArray(item.expectedCall)).toBe(true);
    }
  });

  it('matches all eval expected calls with registered WebMCP tool definitions', () => {
    const toolMap = new Map(ALL_TOOLS.map(t => [t.name, t]));

    for (const evalItem of evalsDataset) {
      for (const expected of evalItem.expectedCall) {
        const tool = toolMap.get(expected.functionName);
        expect(tool).toBeDefined();
        expect(tool?.description).toBeTruthy();
        expect(tool?.parameters).toBeDefined();
        expect(tool?.parameters.type).toBe('object');

        // Check that any provided arguments match parameter properties
        if (expected.arguments && Object.keys(expected.arguments).length > 0) {
          for (const argKey of Object.keys(expected.arguments)) {
            expect(tool?.parameters.properties).toHaveProperty(argKey);
          }
        }
      }
    }
  });

  it('ensures all registered tools have clear, non-ambiguous descriptions', () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.name).toMatch(/^[a-z_]+$/);
    }
  });
});
