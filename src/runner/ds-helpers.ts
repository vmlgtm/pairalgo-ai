/**
 * Definition for singly-linked list.
 */
export class ListNode {
  val: number;
  next: ListNode | null;

  constructor(val: number = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

/**
 * Definition for a binary tree node.
 */
export class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;

  constructor(
    val: number = 0,
    left: TreeNode | null = null,
    right: TreeNode | null = null
  ) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

/**
 * Converts a standard array of numbers into a singly-linked list.
 */
export function arrayToList(arr: number[] | null | undefined): ListNode | null {
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return null;
  }

  const head = new ListNode(arr[0]);
  let curr = head;
  for (let i = 1; i < arr.length; i++) {
    curr.next = new ListNode(arr[i]);
    curr = curr.next;
  }
  return head;
}

/**
 * Converts a singly-linked list into an array of numbers.
 * Detects cycles to prevent infinite loops (max 10,000 nodes).
 */
export function listToArray(head: ListNode | null | undefined): number[] {
  if (!head) return [];
  const result: number[] = [];
  const visited = new Set<ListNode>();
  let curr: ListNode | null = head;

  while (curr !== null) {
    if (visited.has(curr) || result.length >= 10000) {
      // Cycle detected or safety limit reached
      break;
    }
    visited.add(curr);
    result.push(curr.val);
    curr = curr.next;
  }

  return result;
}

/**
 * Converts a BFS level-order array (with nulls) into a binary tree.
 * e.g. [1, 2, 3, null, null, 4, 5]
 */
export function arrayToTree(arr: (number | null)[] | null | undefined): TreeNode | null {
  if (!arr || !Array.isArray(arr) || arr.length === 0 || arr[0] === null || arr[0] === undefined) {
    return null;
  }

  const root = new TreeNode(arr[0]);
  const queue: TreeNode[] = [root];
  let i = 1;

  while (queue.length > 0 && i < arr.length) {
    const current = queue.shift()!;

    // Left child
    if (i < arr.length) {
      const leftVal = arr[i++];
      if (leftVal !== null && leftVal !== undefined) {
        current.left = new TreeNode(leftVal);
        queue.push(current.left);
      }
    }

    // Right child
    if (i < arr.length) {
      const rightVal = arr[i++];
      if (rightVal !== null && rightVal !== undefined) {
        current.right = new TreeNode(rightVal);
        queue.push(current.right);
      }
    }
  }

  return root;
}

/**
 * Converts a binary tree into a BFS level-order array, trimming trailing nulls.
 */
export function treeToArray(root: TreeNode | null | undefined): (number | null)[] {
  if (!root) return [];

  const result: (number | null)[] = [];
  const queue: (TreeNode | null)[] = [root];

  while (queue.length > 0) {
    const node = queue.shift();
    if (node) {
      result.push(node.val);
      queue.push(node.left ?? null);
      queue.push(node.right ?? null);
    } else {
      result.push(null);
    }
  }

  // Trim trailing null values from level-order representation
  while (result.length > 0 && result[result.length - 1] === null) {
    result.pop();
  }

  return result;
}

/**
 * Checks if an object is an instance of ListNode or has ListNode shape.
 */
export function isListNode(obj: any): obj is ListNode {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'val' in obj &&
    'next' in obj &&
    !('left' in obj)
  );
}

/**
 * Checks if an object is an instance of TreeNode or has TreeNode shape.
 */
export function isTreeNode(obj: any): obj is TreeNode {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'val' in obj &&
    'left' in obj &&
    'right' in obj
  );
}

/**
 * Converts any value (including ListNode, TreeNode, Maps, Sets) into a clean JSON-serializable representation.
 */
export function serializeValue(val: any): any {
  if (val === null || val === undefined) return val;
  if (isListNode(val)) {
    return listToArray(val);
  }
  if (isTreeNode(val)) {
    return treeToArray(val);
  }
  if (Array.isArray(val)) {
    return val.map(serializeValue);
  }
  if (val instanceof Set) {
    return Array.from(val).map(serializeValue);
  }
  if (val instanceof Map) {
    return Object.fromEntries(Array.from(val.entries()).map(([k, v]) => [k, serializeValue(v)]));
  }
  if (typeof val === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = serializeValue(v);
    }
    return res;
  }
  return val;
}

/**
 * Robust structural equality comparator.
 * Handles numbers (with float tolerance), strings, arrays, nested arrays,
 * objects, ListNode, TreeNode, and set-comparison where appropriate.
 */
export function deepEqual(actual: any, expected: any): boolean {
  // Direct identity
  if (actual === expected) return true;

  // Float tolerance comparison (e.g. median finder, division results)
  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) < 1e-6;
  }

  // Handle ListNode comparison
  if (isListNode(actual) || isListNode(expected)) {
    const arrA = isListNode(actual) ? listToArray(actual) : (Array.isArray(actual) ? actual : null);
    const arrB = isListNode(expected) ? listToArray(expected) : (Array.isArray(expected) ? expected : null);
    if (arrA && arrB) {
      return deepEqual(arrA, arrB);
    }
  }

  // Handle TreeNode comparison
  if (isTreeNode(actual) || isTreeNode(expected)) {
    const arrA = isTreeNode(actual) ? treeToArray(actual) : (Array.isArray(actual) ? actual : null);
    const arrB = isTreeNode(expected) ? treeToArray(expected) : (Array.isArray(expected) ? expected : null);
    if (arrA && arrB) {
      return deepEqual(arrA, arrB);
    }
  }

  // Handle Null / Undefined mismatches
  if (actual === null || actual === undefined || expected === null || expected === undefined) {
    return actual === expected;
  }

  // Array comparison
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;

    // Check if both are 2D arrays that might need set comparison or element-wise comparison
    for (let i = 0; i < actual.length; i++) {
      if (!deepEqual(actual[i], expected[i])) {
        // Optional: for problems like Group Anagrams or 3Sum where order of outer array doesn't matter,
        // if exact order fails, check if sorted/multiset matches
        return false;
      }
    }
    return true;
  }

  // If one is array and other is not
  if (Array.isArray(actual) !== Array.isArray(expected)) {
    return false;
  }

  // Object comparison
  if (typeof actual === 'object' && typeof expected === 'object') {
    const keysA = Object.keys(actual);
    const keysB = Object.keys(expected);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(expected, key)) return false;
      if (!deepEqual(actual[key], expected[key])) return false;
    }
    return true;
  }

  return false;
}
