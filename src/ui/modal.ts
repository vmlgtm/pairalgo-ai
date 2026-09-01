import type { Problem } from '../engine/types';
import type { SM2UpdateResult } from '../engine/spaced-repetition';
import { iconCheckCircle, iconArrowRight, iconArrowLeft } from './icons';

export interface ScorecardData {
  problem: Problem;
  timeSpentSeconds: number;
  speedScore: number;
  independenceScore: number;
  sm2Update: SM2UpdateResult;
  readiness: number;
  categoryConfidence: number;
  streakDays: number;
}

/**
 * Shows the submission scorecard modal with performance metrics and next steps.
 */
export function showScorecardModal(
  data: ScorecardData,
  onNextProblem: () => void,
  onReturnDashboard: () => void
): void {
  if (typeof document === 'undefined') return;

  // Remove any existing modal
  closeModal();

  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.className = 'modal-overlay';

  const timeMins = Math.floor(data.timeSpentSeconds / 60);
  const timeSecs = data.timeSpentSeconds % 60;
  const timeStr = `${timeMins}m ${timeSecs}s`;
  const nextReviewStr = new Date(data.sm2Update.nextReviewDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

  overlay.innerHTML = `
    <div class="modal-card">
      <div class="scorecard-header">
        <div class="scorecard-badge">
          ${iconCheckCircle({ size: 12, className: 'icon' })}
          <span>Solved & Verified</span>
        </div>
        <h2 class="scorecard-title">${data.problem.title}</h2>
        <span class="diff-text ${data.problem.difficulty}" style="font-size: 12px;">${data.problem.difficulty[0].toUpperCase() + data.problem.difficulty.slice(1)}</span>
      </div>

      <div class="scorecard-metrics">
        <div class="metric-box">
          <span class="metric-label">Time Spent</span>
          <span class="metric-val">${timeStr}</span>
        </div>
        <div class="metric-box">
          <span class="metric-label">Target Limit</span>
          <span class="metric-val">${data.problem.timeLimitMinutes}m</span>
        </div>
        <div class="metric-box">
          <span class="metric-label">Speed Score</span>
          <span class="metric-val" style="color: var(--green);">${Math.round(data.speedScore * 100)}%</span>
        </div>
        <div class="metric-box">
          <span class="metric-label">Independence</span>
          <span class="metric-val" style="color: var(--green);">${Math.round(data.independenceScore * 100)}%</span>
        </div>
        <div class="metric-box">
          <span class="metric-label">Next Review</span>
          <span class="metric-val">${nextReviewStr} (${data.sm2Update.intervalDays}d)</span>
        </div>
        <div class="metric-box">
          <span class="metric-label">Overall Readiness</span>
          <span class="metric-val" style="color: var(--green);">${Math.round(data.readiness * 100)}%</span>
        </div>
      </div>

      <div class="scorecard-actions">
        <button id="btn-modal-dashboard" class="secondary">
          ${iconArrowLeft({ size: 12, className: 'icon' })}
          <span>Dashboard</span>
        </button>
        <button id="btn-modal-next" class="primary">
          <span>Next Challenge</span>
          ${iconArrowRight({ size: 12, className: 'icon' })}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const btnDashboard = overlay.querySelector('#btn-modal-dashboard');
  const btnNext = overlay.querySelector('#btn-modal-next');

  btnDashboard?.addEventListener('click', () => {
    closeModal();
    onReturnDashboard();
  });

  btnNext?.addEventListener('click', () => {
    closeModal();
    onNextProblem();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });
}

export function closeModal(): void {
  const existing = document.getElementById('modal-overlay');
  if (existing && existing.parentElement) {
    existing.parentElement.removeChild(existing);
  }
}
