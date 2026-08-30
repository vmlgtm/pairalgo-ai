import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addActivityEvent,
  getActivityEvents,
  clearActivityEvents,
  onActivityEvent
} from '../src/webmcp/events';
import { formatEventTime } from '../src/ui/activity-feed';

describe('Activity Events Store Suite', () => {
  beforeEach(() => {
    clearActivityEvents();
  });

  it('records events in chronological order (newest first)', () => {
    addActivityEvent({
      actor: 'agent',
      type: 'recommendation',
      summary: 'ChatGPT recommended Two Sum',
      problemId: 'two-sum',
      problemTitle: 'Two Sum'
    });

    addActivityEvent({
      actor: 'agent',
      type: 'problem_started',
      summary: 'ChatGPT started Two Sum',
      problemId: 'two-sum',
      problemTitle: 'Two Sum'
    });

    const events = getActivityEvents();
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('problem_started');
    expect(events[0].summary).toBe('ChatGPT started Two Sum');
    expect(events[1].type).toBe('recommendation');
  });

  it('filters events by problemId when requested', () => {
    addActivityEvent({
      actor: 'agent',
      type: 'problem_started',
      summary: 'ChatGPT started Two Sum',
      problemId: 'two-sum'
    });

    addActivityEvent({
      actor: 'agent',
      type: 'problem_started',
      summary: 'ChatGPT started Invert Tree',
      problemId: 'invert-binary-tree'
    });

    const twoSumEvents = getActivityEvents('two-sum');
    expect(twoSumEvents).toHaveLength(1);
    expect(twoSumEvents[0].problemId).toBe('two-sum');

    const invertEvents = getActivityEvents('invert-binary-tree');
    expect(invertEvents).toHaveLength(1);
    expect(invertEvents[0].problemId).toBe('invert-binary-tree');

    const allEvents = getActivityEvents();
    expect(allEvents).toHaveLength(2);
  });

  it('notifies listeners when a new activity event is added', () => {
    const listenerSpy = vi.fn();
    const unsubscribe = onActivityEvent(listenerSpy);

    addActivityEvent({
      actor: 'user',
      type: 'tests_run',
      summary: 'You ran tests — 2/2 passing',
      problemId: 'two-sum',
      metadata: { passCount: 2, totalCount: 2, allPassed: true }
    });

    expect(listenerSpy).toHaveBeenCalledTimes(1);
    const [eventArg, allEventsArg] = listenerSpy.mock.calls[0];
    expect(eventArg.summary).toBe('You ran tests — 2/2 passing');
    expect(eventArg.actor).toBe('user');
    expect(allEventsArg).toHaveLength(1);

    unsubscribe();

    addActivityEvent({
      actor: 'agent',
      type: 'hint_provided',
      summary: 'ChatGPT provided Hint 1',
      problemId: 'two-sum'
    });

    // Should not be called again after unsubscribe
    expect(listenerSpy).toHaveBeenCalledTimes(1);
  });

  it('formats relative event times correctly', () => {
    const nowIso = new Date().toISOString();
    expect(formatEventTime(nowIso)).toBe('just now');

    const tenSecAgo = new Date(Date.now() - 30 * 1000).toISOString();
    expect(formatEventTime(tenSecAgo)).toBe('30s ago');

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatEventTime(fiveMinAgo)).toBe('5m ago');

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatEventTime(twoHoursAgo)).toBe('2h ago');
  });
});
