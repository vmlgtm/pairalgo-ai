import { getActivityEvents, onActivityEvent, ActivityEvent } from '../webmcp/events';
import { SUGGESTED_PROMPTS, copyPromptToClipboard } from './guide';
import {
  iconBot,
  iconCopy,
  iconLock,
  iconActivity,
  iconTarget,
  iconPlay,
  iconFlask,
  iconLightbulb,
  iconTrophy
} from './icons';

export interface CompanionDrawerInstance {
  open: (tab?: 'prompts' | 'feed') => void;
  close: () => void;
  toggle: (tab?: 'prompts' | 'feed') => void;
  destroy: () => void;
}

export interface CompanionDrawerOptions {
  showSticker?: boolean;
}

/**
 * Initializes the floating side sticker and 2-tab slide-over companion drawer.
 */
export function initCompanionDrawer(
  container: HTMLElement,
  problemId?: string,
  options: CompanionDrawerOptions = { showSticker: true }
): CompanionDrawerInstance {
  // Remove existing drawer elements if any
  container.querySelectorAll('#companion-drawer-root').forEach(el => el.remove());

  const root = document.createElement('div');
  root.id = 'companion-drawer-root';

  let isOpen = false;

  const getEvents = () => getActivityEvents(problemId);
  const showSticker = options.showSticker !== false;

  root.innerHTML = `
    <!-- Floating Side Sticker -->
    ${
      showSticker
        ? `
    <button id="side-sticker-btn" class="side-sticker" title="Open ChatGPT Pairing Guide & Live Activity Feed">
      <span class="sticker-sparkle">✦</span>
      <span class="sticker-text">Pair in ChatGPT</span>
      <span id="sticker-event-badge" class="sticker-badge" style="display: none;">0</span>
    </button>
    `
        : ''
    }

    <!-- Slide-Over Drawer Overlay & Sheet -->
    <div id="drawer-overlay" class="drawer-overlay">
      <div id="drawer-sheet" class="drawer-sheet">
        <!-- Drawer Header -->
        <div class="drawer-header">
          <div class="drawer-title-group">
            <span class="drawer-sparkle">✦</span>
            <span class="drawer-title">Pair with ChatGPT</span>
          </div>
          <button id="btn-close-drawer" class="drawer-close-btn" title="Close drawer (Esc)">✕</button>
        </div>

        <!-- 2 Segmented Tabs -->
        <div class="drawer-tabs">
          <button id="tab-btn-prompts" class="drawer-tab-btn active" data-tab="prompts">
            ${iconBot({ size: 12, className: 'icon' })}
            <span>Prompts & Guide</span>
          </button>
          <button id="tab-btn-feed" class="drawer-tab-btn" data-tab="feed">
            ${iconActivity({ size: 12, className: 'icon' })}
            <span>Activity Feed</span>
            <span id="drawer-feed-count" class="drawer-tab-badge">0</span>
          </button>
        </div>

        <!-- Tab 1: Prompts & Guide Content -->
        <div id="drawer-pane-prompts" class="drawer-tab-pane active">
          <div class="drawer-guide-body">
            <div class="drawer-guide-info">
              Open PairAlgo in <strong>ChatGPT's in-app browser</strong>. Ask ChatGPT to analyze your skill graph, recommend targets, and test your code in-browser.
            </div>

            <div class="guide-prompts-section">
              <div class="guide-prompts-label">Suggested Prompts (Click to Copy):</div>
              <div class="guide-prompt-chips">
                ${SUGGESTED_PROMPTS.map(
                  p => `
                  <button class="prompt-chip" data-copy-prompt="${escapeHtml(p.prompt)}" title="Click to copy prompt for ChatGPT">
                    <span class="prompt-icon">${p.iconSvg}</span>
                    <span class="prompt-text">${escapeHtml(p.prompt)}</span>
                    <span class="prompt-copy-icon">${iconCopy({ size: 11, className: 'icon' })}</span>
                  </button>
                `
                ).join('')}
              </div>
            </div>

            <div class="guide-footer-note">
              ${iconLock({ size: 12, className: 'icon' })}
              <span>Code is only shared with ChatGPT when you explicitly ask it to test or submit.</span>
            </div>
          </div>
        </div>

        <!-- Tab 2: Activity Feed Content -->
        <div id="drawer-pane-feed" class="drawer-tab-pane">
          <div class="drawer-feed-body" id="drawer-activity-feed-list">
            ${renderDrawerActivityList(getEvents())}
          </div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(root);

  const overlay = root.querySelector('#drawer-overlay') as HTMLElement;
  const stickerBtn = root.querySelector('#side-sticker-btn') as HTMLElement;
  const stickerBadge = root.querySelector('#sticker-event-badge') as HTMLElement;
  const closeBtn = root.querySelector('#btn-close-drawer') as HTMLElement;
  const tabPromptsBtn = root.querySelector('#tab-btn-prompts') as HTMLElement;
  const tabFeedBtn = root.querySelector('#tab-btn-feed') as HTMLElement;
  const panePrompts = root.querySelector('#drawer-pane-prompts') as HTMLElement;
  const paneFeed = root.querySelector('#drawer-pane-feed') as HTMLElement;
  const feedCountBadge = root.querySelector('#drawer-feed-count') as HTMLElement;
  const feedListContainer = root.querySelector('#drawer-activity-feed-list') as HTMLElement;

  const updateFeedUI = () => {
    const events = getEvents();
    if (feedCountBadge) feedCountBadge.textContent = String(events.length);
    if (stickerBadge) {
      if (events.length > 0) {
        stickerBadge.textContent = String(events.length);
        stickerBadge.style.display = 'inline-flex';
      } else {
        stickerBadge.style.display = 'none';
      }
    }
    if (feedListContainer) {
      feedListContainer.innerHTML = renderDrawerActivityList(events);
    }
  };

  const switchTab = (tab: 'prompts' | 'feed') => {
    if (tab === 'prompts') {
      tabPromptsBtn.classList.add('active');
      tabFeedBtn.classList.remove('active');
      panePrompts.classList.add('active');
      paneFeed.classList.remove('active');
    } else {
      tabPromptsBtn.classList.remove('active');
      tabFeedBtn.classList.add('active');
      panePrompts.classList.remove('active');
      paneFeed.classList.add('active');
    }
  };

  const openDrawer = (tab?: 'prompts' | 'feed') => {
    isOpen = true;
    if (tab) switchTab(tab);
    overlay.classList.add('open');
    updateFeedUI();
  };

  const closeDrawer = () => {
    isOpen = false;
    overlay.classList.remove('open');
  };

  const toggleDrawer = (tab?: 'prompts' | 'feed') => {
    if (isOpen) closeDrawer();
    else openDrawer(tab);
  };

  // Event Bindings
  stickerBtn?.addEventListener('click', () => toggleDrawer());
  closeBtn?.addEventListener('click', () => closeDrawer());
  tabPromptsBtn?.addEventListener('click', () => switchTab('prompts'));
  tabFeedBtn?.addEventListener('click', () => switchTab('feed'));

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDrawer();
    }
  });

  // Prompt click copy
  panePrompts.querySelectorAll('.prompt-chip[data-copy-prompt]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const promptText = el.getAttribute('data-copy-prompt');
      if (promptText) {
        copyPromptToClipboard(promptText, el as HTMLElement);
      }
    });
  });

  // Global keydown (Esc to close)
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      closeDrawer();
    }
  };
  window.addEventListener('keydown', onKeydown);

  // Subscribe to live activity events
  const unsubscribe = onActivityEvent(() => {
    updateFeedUI();
  });

  updateFeedUI();

  return {
    open: openDrawer,
    close: closeDrawer,
    toggle: toggleDrawer,
    destroy: () => {
      unsubscribe();
      window.removeEventListener('keydown', onKeydown);
      root.remove();
    }
  };
}

function renderDrawerActivityList(events: ActivityEvent[]): string {
  if (events.length === 0) {
    return `
      <div class="activity-feed-empty" style="padding: 32px 16px;">
        <div class="empty-icon">${iconBot({ size: 24, className: 'icon' })}</div>
        <div class="empty-text">No agent activity yet</div>
        <div class="empty-subtext">When ChatGPT uses tools in-browser (recommendations, hints, tests), events will stream here live.</div>
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
          const timeLabel = formatRelativeTime(evt.timestamp);

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

function formatRelativeTime(isoString: string): string {
  try {
    const eventTime = new Date(isoString).getTime();
    const diffSec = Math.floor((Date.now() - eventTime) / 1000);
    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'recently';
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
