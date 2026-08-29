import { describe, it, expect } from 'vitest';
import { executeCode, stripTypeAnnotations } from '../src/runner/worker-core';
import type { TestCase, ParamDefinition } from '../src/engine/types';

describe('Execution Sandbox Runner', () => {
  it('strips TypeScript type annotations properly', () => {
    const tsCode = `
      function twoSum(nums: number[], target: number): number[] {
        const map = new Map<number, number>();
        return [0, 1];
      }
    `;
    const jsCode = stripTypeAnnotations(tsCode);
    expect(jsCode).not.toContain(': number[]');
    expect(jsCode).not.toContain(': number');
  });

  it('runs standard algorithm test suite (Two Sum)', () => {
    const code = `
      function twoSum(nums, target) {
        const map = new Map();
        for (let i = 0; i < nums.length; i++) {
          const complement = target - nums[i];
          if (map.has(complement)) {
            return [map.get(complement), i];
          }
          map.set(nums[i], i);
        }
        return [];
      }
    `;

    const testCases: TestCase[] = [
      { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] }
    ];

    const params: ParamDefinition[] = [
      { name: 'nums', type: 'number[]' },
      { name: 'target', type: 'number' }
    ];

    const res = executeCode(code, 'twoSum', testCases, params, 'number[]');
    expect(res.allPassed).toBe(true);
    expect(res.passedCount).toBe(2);
    expect(res.results.length).toBe(2);
  });

  it('runs linked list algorithm test suite (Reverse Linked List)', () => {
    const code = `
      function reverseList(head) {
        let prev = null;
        let curr = head;
        while (curr !== null) {
          const next = curr.next;
          curr.next = prev;
          prev = curr;
          curr = next;
        }
        return prev;
      }
    `;

    const testCases: TestCase[] = [
      { input: { head: [1, 2, 3, 4, 5] }, expected: [5, 4, 3, 2, 1] }
    ];

    const params: ParamDefinition[] = [{ name: 'head', type: 'ListNode' }];

    const res = executeCode(code, 'reverseList', testCases, params, 'ListNode');
    expect(res.allPassed).toBe(true);
    expect(res.passedCount).toBe(1);
    expect(res.results[0].actual).toEqual([5, 4, 3, 2, 1]);
  });

  it('runs binary tree algorithm test suite (Invert Tree)', () => {
    const code = `
      function invertTree(root) {
        if (!root) return null;
        const temp = root.left;
        root.left = invertTree(root.right);
        root.right = invertTree(temp);
        return root;
      }
    `;

    const testCases: TestCase[] = [
      { input: { root: [4, 2, 7, 1, 3, 6, 9] }, expected: [4, 7, 2, 9, 6, 3, 1] }
    ];

    const params: ParamDefinition[] = [{ name: 'root', type: 'TreeNode' }];

    const res = executeCode(code, 'invertTree', testCases, params, 'TreeNode');
    expect(res.allPassed).toBe(true);
    expect(res.passedCount).toBe(1);
    expect(res.results[0].actual).toEqual([4, 7, 2, 9, 6, 3, 1]);
  });

  it('handles in-place void modification functions (Rotate Image)', () => {
    const code = `
      function rotate(matrix) {
        const n = matrix.length;
        // Transpose
        for (let i = 0; i < n; i++) {
          for (let j = i; j < n; j++) {
            const temp = matrix[i][j];
            matrix[i][j] = matrix[j][i];
            matrix[j][i] = temp;
          }
        }
        // Reverse rows
        for (let i = 0; i < n; i++) {
          matrix[i].reverse();
        }
      }
    `;

    const testCases: TestCase[] = [
      {
        input: {
          matrix: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
          ]
        },
        expected: [
          [7, 4, 1],
          [8, 5, 2],
          [9, 6, 3]
        ]
      }
    ];

    const params: ParamDefinition[] = [{ name: 'matrix', type: 'number[][]' }];

    const res = executeCode(code, 'rotate', testCases, params, 'void');
    expect(res.allPassed).toBe(true);
    expect(res.passedCount).toBe(1);
  });

  it('handles class design operations (MinStack)', () => {
    const code = `
      function MinStack() {
        this.stack = [];
        this.minStack = [];
      }
      MinStack.prototype.push = function(val) {
        this.stack.push(val);
        if (this.minStack.length === 0 || val <= this.minStack[this.minStack.length - 1]) {
          this.minStack.push(val);
        }
      };
      MinStack.prototype.pop = function() {
        const val = this.stack.pop();
        if (val === this.minStack[this.minStack.length - 1]) {
          this.minStack.pop();
        }
      };
      MinStack.prototype.top = function() {
        return this.stack[this.stack.length - 1];
      };
      MinStack.prototype.getMin = function() {
        return this.minStack[this.minStack.length - 1];
      };
    `;

    const testCases: TestCase[] = [
      {
        input: {
          ops: ['push(-2)', 'push(0)', 'push(-3)', 'getMin()', 'pop()', 'top()', 'getMin()']
        },
        expected: [null, null, null, -3, null, 0, -2]
      }
    ];

    const res = executeCode(code, 'MinStack', testCases, [], 'void');
    expect(res.allPassed).toBe(true);
    expect(res.passedCount).toBe(1);
  });

  it('reports compilation and syntax errors cleanly', () => {
    const badCode = `
      function twoSum(nums, target) {
        return [0,
      }
    `;

    const testCases: TestCase[] = [{ input: { nums: [1, 2], target: 3 }, expected: [0, 1] }];

    const res = executeCode(badCode, 'twoSum', testCases, [], 'number[]');
    expect(res.allPassed).toBe(false);
    expect(res.error).toBeDefined();
  });
});
