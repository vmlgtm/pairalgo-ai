import {
  ListNode,
  TreeNode,
  arrayToList,
  listToArray,
  arrayToTree,
  treeToArray,
  deepEqual,
  serializeValue,
  isListNode,
  isTreeNode
} from './ds-helpers';
import type { TestCase, ParamDefinition, TestResult, ExecutionResult } from '../engine/types';

/**
 * Lightweight TypeScript annotation stripper to allow running TS starter code
 * in pure JS sandbox.
 */
export function stripTypeAnnotations(code: string): string {
  let cleaned = code;

  // Remove import/export statements
  cleaned = cleaned.replace(/^import\s+.*?;?$/gm, '');
  cleaned = cleaned.replace(/^export\s+/gm, '');

  // Remove interfaces and types
  cleaned = cleaned.replace(/^(interface|type)\s+[\s\S]*?^}/gm, '');
  cleaned = cleaned.replace(/^type\s+[^=]+=\s*[\s\S]*?;/gm, '');

  // Strip param and return type annotations
  // e.g., (nums: number[], target: number): number[]
  cleaned = cleaned.replace(/:\s*([A-Za-z0-9_<>\[\]|&\s]+(?=[,\)=;{]))/g, '');

  // Strip generic parameter annotations like <T>
  cleaned = cleaned.replace(/<[A-Za-z0-9_,\s]+>(?=\()/g, '');

  return cleaned;
}

/**
 * Executes a test suite against user code safely.
 */
export function executeCode(
  rawCode: string,
  functionName: string,
  testCases: TestCase[],
  params: ParamDefinition[] = [],
  returnType: string = 'any'
): ExecutionResult {
  const startTime = performance.now();
  const results: TestResult[] = [];
  let passedCount = 0;

  const cleanedCode = stripTypeAnnotations(rawCode);

  // Setup execution environment harness
  let userFn: any;
  try {
    const factory = new Function(
      'ListNode',
      'TreeNode',
      'arrayToList',
      'listToArray',
      'arrayToTree',
      'treeToArray',
      `
      ${cleanedCode}
      
      if (typeof ${functionName} !== 'undefined') {
        return ${functionName};
      }
      return null;
      `
    );

    userFn = factory(
      ListNode,
      TreeNode,
      arrayToList,
      listToArray,
      arrayToTree,
      treeToArray
    );

    if (typeof userFn !== 'function') {
      return {
        allPassed: false,
        passedCount: 0,
        totalCount: testCases.length,
        results: [],
        totalTimeMs: 0,
        error: `Function "${functionName}" was not found or is not defined.`
      };
    }
  } catch (err: any) {
    return {
      allPassed: false,
      passedCount: 0,
      totalCount: testCases.length,
      results: [],
      totalTimeMs: 0,
      error: `Syntax / Compilation Error: ${err?.message || String(err)}`
    };
  }

  // Iterate test cases
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const testLogs: string[] = [];
    const originalConsoleLog = console.log;

    console.log = (...args: any[]) => {
      testLogs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    };

    const testStartTime = performance.now();
    let actual: any;
    let passed = false;
    let testError: string | undefined = undefined;

    try {
      // Check if this is an operations-based class test (e.g. MinStack, LRUCache, Trie, Codec, Twitter)
      if (tc.input && 'ops' in tc.input && Array.isArray(tc.input.ops)) {
        // Class constructor & method invocation runner
        const ops = tc.input.ops as string[];
        const constructorArgs = tc.input.capacity !== undefined ? [tc.input.capacity] : [];
        const instance = new userFn(...constructorArgs);
        const opOutputs: any[] = [];

        for (const opStr of ops) {
          // e.g. "push(-2)", "getMin()", "put(1,1)"
          const match = opStr.match(/^([A-Za-z0-9_]+)\((.*)\)$/);
          if (match) {
            const methodName = match[1];
            const rawArgs = match[2].trim();
            const parsedArgs = rawArgs.length > 0 ? JSON.parse(`[${rawArgs}]`) : [];

            if (typeof instance[methodName] === 'function') {
              const res = instance[methodName](...parsedArgs);
              opOutputs.push(res !== undefined ? res : null);
            } else {
              throw new Error(`Method "${methodName}" not found on ${functionName}`);
            }
          }
        }
        actual = opOutputs;
      } else if (returnType === 'void') {
        // In-place modification problems (e.g. rotate, reorderList, setZeroes, wallsAndGates, solve)
        const paramNames = params.length > 0 ? params.map(p => p.name) : Object.keys(tc.input);
        const args = paramNames.map((name, idx) => {
          const rawVal = tc.input[name];
          const pType = params[idx]?.type || '';
          if (pType === 'ListNode' || pType.includes('ListNode')) {
            return arrayToList(rawVal);
          }
          if (pType === 'TreeNode' || pType.includes('TreeNode')) {
            return arrayToTree(rawVal);
          }
          // Clone nested array/object to allow mutation
          return JSON.parse(JSON.stringify(rawVal));
        });

        userFn(...args);

        // The primary modified parameter is usually args[0]
        const modified = args[0];
        if (isListNode(modified)) {
          actual = listToArray(modified);
        } else if (isTreeNode(modified)) {
          actual = treeToArray(modified);
        } else {
          actual = modified;
        }
      } else {
        // Standard function call
        const paramNames = params.length > 0 ? params.map(p => p.name) : Object.keys(tc.input);
        const args = paramNames.map((name, idx) => {
          const rawVal = tc.input[name];
          const pType = params[idx]?.type || '';
          if (pType === 'ListNode') {
            return arrayToList(rawVal);
          }
          if (pType === 'TreeNode') {
            return arrayToTree(rawVal);
          }
          if (pType === 'ListNode[]' && Array.isArray(rawVal)) {
            return rawVal.map(arrayToList);
          }
          return rawVal;
        });

        const rawResult = userFn(...args);

        if (isListNode(rawResult)) {
          actual = listToArray(rawResult);
        } else if (isTreeNode(rawResult)) {
          actual = treeToArray(rawResult);
        } else {
          actual = rawResult;
        }
      }

      passed = deepEqual(actual, tc.expected);
      if (passed) {
        passedCount++;
      }
    } catch (err: any) {
      testError = err?.message || String(err);
      passed = false;
    } finally {
      console.log = originalConsoleLog;
    }

    const testEndTime = performance.now();
    results.push({
      testIndex: i,
      passed,
      input: serializeValue(tc.input),
      expected: serializeValue(tc.expected),
      actual: serializeValue(actual),
      executionTimeMs: Number((testEndTime - testStartTime).toFixed(2)),
      error: testError,
      logs: testLogs.length > 0 ? testLogs : undefined
    });
  }

  const totalTimeMs = Number((performance.now() - startTime).toFixed(2));
  return {
    allPassed: passedCount === testCases.length,
    passedCount,
    totalCount: testCases.length,
    results,
    totalTimeMs
  };
}
