import { executeCode } from './worker-core';

// This entry point is compiled strictly as a Web Worker script.
// Ensure it only attaches listeners when inside a DedicatedWorkerGlobalScope (never in window)
const isDedicatedWorker =
  typeof window === 'undefined' &&
  typeof self !== 'undefined' &&
  typeof (self as any).postMessage === 'function';

if (isDedicatedWorker) {
  self.onmessage = (e: MessageEvent) => {
    // Ignore invalid / non-runner messages
    if (!e.data || typeof e.data !== 'object' || !e.data.id) {
      return;
    }

    const { id, code, functionName, testCases, params, returnType } = e.data;
    try {
      const result = executeCode(code, functionName, testCases || [], params || [], returnType || 'any');
      self.postMessage({ id, result });
    } catch (err: any) {
      self.postMessage({
        id,
        result: {
          allPassed: false,
          passedCount: 0,
          totalCount: testCases?.length || 0,
          results: [],
          totalTimeMs: 0,
          error: err?.message || String(err)
        }
      });
    }
  };
}
