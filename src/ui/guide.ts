import { showToast } from './toast';

export interface GuidePrompt {
  label: string;
  prompt: string;
  context: 'dashboard' | 'workspace' | 'both';
  icon: string;
}

export const SUGGESTED_PROMPTS: GuidePrompt[] = [
  {
    label: 'Ask for next problem',
    prompt: 'What should I practice today?',
    context: 'dashboard',
    icon: '🎯'
  },
  {
    label: 'Start challenge',
    prompt: 'Start the recommended problem.',
    context: 'dashboard',
    icon: '🚀'
  },
  {
    label: 'Run latest code',
    prompt: 'Run my latest code and explain any failing test.',
    context: 'workspace',
    icon: '⚡'
  },
  {
    label: 'Request hint 1',
    prompt: 'Give me hint 1 without revealing the solution.',
    context: 'workspace',
    icon: '💡'
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
      const originalText = buttonEl.innerHTML;
      buttonEl.innerHTML = `✓ Copied`;
      buttonEl.classList.add('copied');
      setTimeout(() => {
        buttonEl.innerHTML = originalText;
        buttonEl.classList.remove('copied');
      }, 1500);
    }

    showToast(`Prompt copied to clipboard!`, 'info');
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
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="guide-icon">🤖</span>
          <span class="card-title">Pair with ChatGPT</span>
        </div>
        <span class="badge" style="color: var(--green); border-color: var(--green-dim); font-size: 10px;">WebMCP</span>
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
                <span class="prompt-icon">${p.icon}</span>
                <span class="prompt-text">${p.prompt}</span>
                <span class="prompt-copy-icon">📋</span>
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="guide-footer-note">
          🔒 Code is only shared with ChatGPT when you ask it to run or submit. Typing does not automatically transmit code.
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
