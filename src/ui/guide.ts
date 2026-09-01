import { showToast } from './toast';
import {
  iconBot,
  iconTarget,
  iconPlay,
  iconTerminal,
  iconLightbulb,
  iconCopy,
  iconCheck,
  iconLock
} from './icons';

export interface GuidePrompt {
  label: string;
  prompt: string;
  context: 'dashboard' | 'workspace' | 'both';
  iconSvg: string;
}

export const SUGGESTED_PROMPTS: GuidePrompt[] = [
  {
    label: 'Ask for next problem',
    prompt: 'What should I practice today?',
    context: 'dashboard',
    iconSvg: iconTarget({ size: 12 })
  },
  {
    label: 'Start challenge',
    prompt: 'Start the recommended problem.',
    context: 'dashboard',
    iconSvg: iconPlay({ size: 12 })
  },
  {
    label: 'Run latest code',
    prompt: 'Run my latest code and explain any failing test.',
    context: 'workspace',
    iconSvg: iconTerminal({ size: 12 })
  },
  {
    label: 'Request hint 1',
    prompt: 'Give me hint 1 without revealing the solution.',
    context: 'workspace',
    iconSvg: iconLightbulb({ size: 12 })
  }
];

/**
 * Copies text to clipboard and shows visual feedback.
 */
export async function copyPromptToClipboard(text: string, buttonEl?: HTMLElement): Promise<void> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for environments where clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    if (buttonEl) {
      const originalHtml = buttonEl.innerHTML;
      buttonEl.innerHTML = `${iconCheck({ size: 12, className: 'icon' })} <span>Copied</span>`;
      buttonEl.classList.add('copied');
      setTimeout(() => {
        buttonEl.innerHTML = originalHtml;
        buttonEl.classList.remove('copied');
      }, 1500);
    }

    showToast('Prompt copied to clipboard', 'info');
  } catch (err) {
    showToast('Failed to copy prompt', 'error');
  }
}

/**
 * Returns HTML string for the "Pair with ChatGPT" guide card.
 */
export function renderPairGuideHtml(variant: 'dashboard' | 'workspace'): string {
  const isDashboard = variant === 'dashboard';
  const relevantPrompts = SUGGESTED_PROMPTS.filter(
    p => p.context === variant || p.context === 'both'
  );

  return `
    <div class="card pair-guide-card ${isDashboard ? 'dashboard-guide' : 'workspace-guide'}">
      <div class="card-header">
        <div class="card-title">
          ${iconBot({ size: 14, className: 'icon' })}
          <span>Pair with ChatGPT</span>
        </div>
        <span class="badge webmcp">WebMCP</span>
      </div>

      <div class="guide-body">
        <p class="guide-description">
          ${
            isDashboard
              ? `Open PairAlgo in <strong>ChatGPT's in-app browser</strong>. Ask ChatGPT to analyze your skill graph, recommend your next spaced-repetition target, and start challenges hands-free.`
              : `Write your solution in the editor. Then ask ChatGPT in your conversation outside the page to <strong>run your latest code</strong>, explain failing tests, or give progressive hints.`
          }
        </p>

        <div class="guide-prompts-section">
          <div class="guide-prompts-label">Suggested Prompts (Click to Copy):</div>
          <div class="guide-prompt-chips">
            ${relevantPrompts
              .map(
                p => `
              <button class="prompt-chip" data-copy-prompt="${escapeHtml(p.prompt)}" title="Click to copy prompt for ChatGPT">
                <span class="prompt-icon">${p.iconSvg}</span>
                <span class="prompt-text">${escapeHtml(p.prompt)}</span>
                <span class="prompt-copy-icon">${iconCopy({ size: 11, className: 'icon' })}</span>
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="guide-footer-note">
          ${iconLock({ size: 12, className: 'icon' })}
          <span>Code is only shared with ChatGPT when you ask it to run or submit. Typing does not automatically transmit code.</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Binds copy click events to prompt chips in a container.
 */
export function bindGuidePromptClicks(container: HTMLElement): void {
  container.querySelectorAll('.prompt-chip[data-copy-prompt]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const promptText = el.getAttribute('data-copy-prompt');
      if (promptText) {
        copyPromptToClipboard(promptText, el as HTMLElement);
      }
    });
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
