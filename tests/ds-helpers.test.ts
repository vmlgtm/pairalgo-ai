import { describe, it, expect } from 'vitest';
import {
  ListNode,
  TreeNode,
  arrayToList,
  listToArray,
  arrayToTree,
  treeToArray,
  deepEqual,
  serializeValue
} from '../src/runner/ds-helpers';

describe('Data Structure Helpers', () => {
  it('converts array to ListNode and back', () => {
    const arr = [1, 2, 3, 4, 5];
    const list = arrayToList(arr);
    expect(list).toBeInstanceOf(ListNode);
    expect(list?.val).toBe(1);
    expect(list?.next?.val).toBe(2);

    const converted = listToArray(list);
    expect(converted).toEqual(arr);

    // Empty list
    expect(arrayToList([])).toBeNull();
    expect(listToArray(null)).toEqual([]);
  });

  it('converts level-order array to TreeNode and back', () => {
    const arr = [1, 2, 3, null, null, 4, 5];
    const tree = arrayToTree(arr);
    expect(tree).toBeInstanceOf(TreeNode);
    expect(tree?.val).toBe(1);
    expect(tree?.left?.val).toBe(2);
    expect(tree?.right?.val).toBe(3);
    expect(tree?.right?.left?.val).toBe(4);
    expect(tree?.right?.right?.val).toBe(5);

    const converted = treeToArray(tree);
    expect(converted).toEqual(arr);

    // Empty tree
    expect(arrayToTree([])).toBeNull();
    expect(treeToArray(null)).toEqual([]);
  });

  it('compares structures deeply with deepEqual', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('test', 'test')).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);

    // Float tolerance
    expect(deepEqual(1.5, 1.50000001)).toBe(true);

    // ListNode vs Array
    const list = arrayToList([10, 20, 30]);
    expect(deepEqual(list, [10, 20, 30])).toBe(true);

    // TreeNode vs Array
    const tree = arrayToTree([4, 2, 7, 1, 3, 6, 9]);
    expect(deepEqual(tree, [4, 2, 7, 1, 3, 6, 9])).toBe(true);

    // Nested objects
    expect(deepEqual({ a: [1, 2], b: { c: 'd' } }, { a: [1, 2], b: { c: 'd' } })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('serializes structures to JSON safely', () => {
    const list = arrayToList([1, 2]);
    expect(serializeValue(list)).toEqual([1, 2]);

    const tree = arrayToTree([1, null, 2]);
    expect(serializeValue(tree)).toEqual([1, null, 2]);
  });
});
