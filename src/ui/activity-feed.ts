import { getActivityEvents, onActivityEvent, ActivityEvent } from '../webmcp/events';
import {
  iconActivity,
  iconBot,
  iconTarget,
  iconPlay,
  iconFlask,
  iconLightbulb,
  iconTrophy
} from './icons';

export interface ActivityFeedOptions {
  problemId?: string;
  maxItems?: number;
  showScopeToggle?: boolean;
}

/**
 * Formats an ISO date/time into a compact human-readable string or relative time.
 */
export function formatEventTime(isoString: string): string {
  try {
    const eventTime = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - eventTime) / 1000);

    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'recently';
  }
}

/**
 * Returns HTML for the activity feed card/panel.
 */
export function renderActivityFeedHtml(problemId?: string, maxItems: number = 8): string {
  const events = getActivityEvents(problemId).slice(0, maxItems);

  return `
    <div class="card activity-feed-card" id="agent-activity-feed-container">
      <div class="card-header">
        <div class="card-title">
          ${iconActivity({ size: 14, className: 'icon' })}
          <span>Agent Activity Feed</span>
        </div>
        <span class="badge" id="activity-feed-count">${events.length} events</span>
      </div>

      <div class="activity-feed-body" id="activity-feed-list">
        ${renderActivityEventList(events, problemId)}
      </div>
    </div>
  `;
}

/**
 * Renders individual activity events as list items.
 */
export function renderActivityEventList(events: ActivityEvent[], _problemId?: string): string {
  if (events.length === 0) {
    return `
      <div class="activity-feed-empty">
        <div class="empty-icon">${iconBot({ size: 24, className: 'icon' })}</div>
        <div class="empty-text">No agent activity yet</div>
        <div class="empty-subtext">When ChatGPT uses WebMCP tools (recommendations, hints, tests), events will appear here in real-time.</div>
      </div>
    `;
  }

  return `
    <div class="activity-timeline">
      ${events
        .map(evt => {
          const isAgent = evt.actor === 'agent';
          const actorClass = isAgent ? 'actor-agent' : 'actor-user';
          const actorLabel = isAgent ? 'ChatGPT' : 'You';
          const timeLabel = formatEventTime(evt.timestamp);

          let typeIconSvg = iconActivity({ size: 11, className: 'icon' });
          let tagBadge = '';

          switch (evt.type) {
            case 'recommendation':
              typeIconSvg = iconTarget({ size: 11, className: 'icon' });
              tagBadge = '<span class="event-tag rec">Recommendation</span>';
              break;
            case 'problem_started':
              typeIconSvg = iconPlay({ size: 11, className: 'icon' });
              tagBadge = '<span class="event-tag start">Started</span>';
              break;
            case 'tests_run':
              typeIconSvg = iconFlask({ size: 11, className: 'icon' });
              if (evt.metadata?.allPassed) {
                tagBadge = `<span class="event-tag pass">${evt.metadata.passCount}/${evt.metadata.totalCount} Pass</span>`;
              } else if (evt.metadata?.passCount !== undefined) {
                tagBadge = `<span class="event-tag fail">${evt.metadata.passCount}/${evt.metadata.totalCount} Pass</span>`;
              }
              break;
            case 'hint_provided':
              typeIconSvg = iconLightbulb({ size: 11, className: 'icon' });
              tagBadge = `<span class="event-tag hint">Hint ${evt.metadata?.hintLevel || 1}</span>`;
              break;
            case 'solution_submitted':
              typeIconSvg = iconTrophy({ size: 11, className: 'icon' });
              tagBadge = evt.metadata?.outcome === 'passed'
                ? '<span class="event-tag pass">Solved</span>'
                : '<span class="event-tag fail">Failed</span>';
              break;
          }

          return `
            <div class="activity-item" data-event-id="${evt.id}">
              <div class="activity-item-header">
                <div class="activity-actor-pill ${actorClass}">
                  <span class="actor-icon">${typeIconSvg}</span>
                  <span class="actor-name">${actorLabel}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  ${tagBadge}
                  <span class="activity-time" title="${evt.timestamp}">${timeLabel}</span>
                </div>
              </div>
              <div class="activity-summary">${escapeHtml(evt.summary)}</div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

/**
 * Initializes live reactive subscription for the activity feed within a container.
 * Returns unsubscribe cleanup function.
 */
export function initLiveActivityFeed(
  container: HTMLElement,
  options: ActivityFeedOptions = {}
): () => void {
  const { problemId, maxItems = 8 } = options;

  const updateFeed = () => {
    const listEl = container.querySelector('#activity-feed-list');
    const countEl = container.querySelector('#activity-feed-count');
    const currentEvents = getActivityEvents(problemId).slice(0, maxItems);

    if (listEl) {
      listEl.innerHTML = renderActivityEventList(currentEvents, problemId);
    }
    if (countEl) {
      countEl.textContent = `${currentEvents.length} events`;
    }
  };

  const unsubscribe = onActivityEvent(() => {
    updateFeed();
  });

  return unsubscribe;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
