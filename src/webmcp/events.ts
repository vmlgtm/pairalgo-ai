export type ActivityEventType =
  | 'recommendation'
  | 'problem_started'
  | 'tests_run'
  | 'hint_provided'
  | 'solution_submitted';

export type ActivityActor = 'agent' | 'user';

export interface ActivityEventMetadata {
  reason?: string;
  priority?: string;
  passCount?: number;
  totalCount?: number;
  durationMs?: number;
  hintLevel?: number;
  outcome?: 'passed' | 'failed';
  allPassed?: boolean;
  error?: string;
  targetMinutes?: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: string; // ISO string
  type: ActivityEventType;
  actor: ActivityActor;
  summary: string;
  problemId?: string;
  problemTitle?: string;
  metadata?: ActivityEventMetadata;
}

const MAX_EVENTS = 100;
const events: ActivityEvent[] = [];
const listeners = new Set<(event: ActivityEvent, allEvents: ActivityEvent[]) => void>();

let eventIdCounter = 1;

/**
 * Adds an activity event to the store and notifies listeners.
 */
export function addActivityEvent(
  eventData: Omit<ActivityEvent, 'id' | 'timestamp'> & { timestamp?: string }
): ActivityEvent {
  const newEvent: ActivityEvent = {
    id: `evt-${Date.now()}-${eventIdCounter++}`,
    timestamp: eventData.timestamp || new Date().toISOString(),
    type: eventData.type,
    actor: eventData.actor,
    summary: eventData.summary,
    problemId: eventData.problemId,
    problemTitle: eventData.problemTitle,
    metadata: eventData.metadata
  };

  events.unshift(newEvent); // Newest first

  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }

  // Expose on window for debugging / inspection
  if (typeof window !== 'undefined') {
    (window as any).__webmcp_activity_events = events;
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('prep-cockpit:activity-event', { detail: { event: newEvent, events } })
        );
      } catch (e) {
        // Ignore event dispatch errors in testing
      }
    }
  }

  // Notify listeners
  for (const listener of listeners) {
    try {
      listener(newEvent, [...events]);
    } catch (err) {
      console.error('[ActivityEvent] Listener error:', err);
    }
  }

  return newEvent;
}

/**
 * Returns activity events, optionally filtered by problemId.
 */
export function getActivityEvents(problemId?: string): ActivityEvent[] {
  if (!problemId) {
    return [...events];
  }
  return events.filter(e => !e.problemId || e.problemId === problemId);
}

/**
 * Subscribes to activity event additions.
 */
export function onActivityEvent(
  callback: (event: ActivityEvent, allEvents: ActivityEvent[]) => void
): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Clears all recorded activity events (useful for reset/testing).
 */
export function clearActivityEvents(): void {
  events.length = 0;
  if (typeof window !== 'undefined') {
    (window as any).__webmcp_activity_events = events;
  }
}
