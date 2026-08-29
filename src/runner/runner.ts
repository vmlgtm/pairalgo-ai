import type { Problem, ExecutionResult } from '../engine/types';
import { executeCode } from './worker-core';

let currentWorker: Worker | null = null;
let currentWorkerTimeout: any = null;

/**
 * Runs test cases for a given problem against user code inside a sandboxed Web Worker.
 * If Web Worker is unavailable (such as during Vitest CLI tests), falls back to direct execution.
 */
export async function runTests(
  problem: Problem,
  code: string,
  timeoutMs: number = 2500
): Promise<ExecutionResult> {
  // If Worker API is unavailable (Node.js test environment)
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return executeCode(
      code,
      problem.functionName,
      problem.testCases,
      problem.params,
      problem.returnType
    );
  }

  // Cancel / terminate any previous running worker to prevent overlapping execution
  if (currentWorker) {
    currentWorker.terminate();
    currentWorker = null;
  }
  if (currentWorkerTimeout) {
    clearTimeout(currentWorkerTimeout);
    currentWorkerTimeout = null;
  }

  return new Promise<ExecutionResult>((resolve) => {
    try {
      // Create fresh worker via Vite module worker syntax
      const worker = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module'
      });
      currentWorker = worker;

      const reqId = Math.random().toString(36).substring(7);

      currentWorkerTimeout = setTimeout(() => {
        if (currentWorker === worker) {
          worker.terminate();
          currentWorker = null;
          resolve({
            allPassed: false,
            passedCount: 0,
            totalCount: problem.testCases.length,
            results: [],
            totalTimeMs: timeoutMs,
            error: `Execution timed out (> ${timeoutMs}ms). Check for infinite loops or high time complexity.`
          });
        }
      }, timeoutMs);

      worker.onmessage = (e: MessageEvent) => {
        if (e.data?.id === reqId) {
          if (currentWorkerTimeout) {
            clearTimeout(currentWorkerTimeout);
            currentWorkerTimeout = null;
          }
          worker.terminate();
          if (currentWorker === worker) {
            currentWorker = null;
          }
          resolve(e.data.result);
        }
      };

      worker.onerror = (err: ErrorEvent) => {
        if (currentWorkerTimeout) {
          clearTimeout(currentWorkerTimeout);
          currentWorkerTimeout = null;
        }
        worker.terminate();
        if (currentWorker === worker) {
          currentWorker = null;
        }
        resolve({
          allPassed: false,
          passedCount: 0,
          totalCount: problem.testCases.length,
          results: [],
          totalTimeMs: 0,
          error: `Worker Runtime Error: ${err.message || 'Unknown error'}`
        });
      };

      worker.postMessage({
        id: reqId,
        code,
        functionName: problem.functionName,
        testCases: problem.testCases,
        params: problem.params,
        returnType: problem.returnType
      });
    } catch {
      // Fallback to direct execution if worker instantiation fails
      const result = executeCode(
        code,
        problem.functionName,
        problem.testCases,
        problem.params,
        problem.returnType
      );
      resolve(result);
    }
  });
}
