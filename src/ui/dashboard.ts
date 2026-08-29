import {
  getAllCategories,
  getAllProblems,
  getAllProgress,
  getAllAttempts,
  resetDatabase
} from '../engine/db';
import { calculateSkillGraph } from '../engine/scoring';
import { calculateStreak } from '../engine/streak';
import { getDueForReview } from '../engine/spaced-repetition';
import { getRecommendation } from '../engine/recommend';
import { setClientState, getClientState } from '../webmcp/state';
import { showToast } from './toast';
import type { ProblemProgress } from '../engine/types';

export async function renderDashboard(
  container: HTMLElement,
  onNavigateWorkspace: (problemId: string) => void
): Promise<void> {
  const categories = await getAllCategories();
  const problems = await getAllProblems();
  const progressList = await getAllProgress();
  const attempts = await getAllAttempts();

  const now = new Date();
  const streakInfo = calculateStreak(attempts, now);
  const progressMap = new Map<string, ProblemProgress>(progressList.map(p => [p.problemId, p]));

  const skillGraph = calculateSkillGraph(
    categories,
    problems,
    progressMap,
    attempts,
    streakInfo.currentStreak,
    now
  );

  // Update client state
  const currentState = getClientState();
  const activeFilter = currentState.targetFilter || 'all';

  setClientState({
    view: 'dashboard',
    userReadiness: skillGraph.overallReadiness,
    streakDays: streakInfo.currentStreak
  });

  const dueItems = getDueForReview(problems, progressList, now);
  const recommendation = getRecommendation(
    categories,
    problems,
    progressMap,
    attempts,
    { set: activeFilter === 'all' ? undefined : activeFilter },
    now
  );

  // Filter state for catalog
  let searchQuery = '';
  let selectedCategorySlug: string | null = null;
  let selectedDifficulty: string = 'all';

  container.innerHTML = `
    <header class="app-header">
      <div class="brand" id="brand-home">
        <div class="brand-logo">PA</div>
        <div>
          <span class="brand-title">PAIRALGO.AI</span>
          <span class="brand-subtitle">AI Pair Cockpit • WebMCP</span>
        </div>
      </div>

      <div class="header-stats">
        <div class="stat-pill">
          <span class="stat-label">Readiness:</span>
          <span class="stat-val" style="color: var(--green);">${Math.round(skillGraph.overallReadiness * 100)}%</span>
        </div>
        <div class="stat-pill">
          <span class="stat-label">Streak:</span>
          <span class="stat-val">🔥 ${streakInfo.currentStreak}d</span>
        </div>
        <div class="stat-pill">
          <span class="stat-label">Solved:</span>
          <span class="stat-val">${skillGraph.totalSolved}/${problems.length}</span>
        </div>
        <div class="webmcp-indicator">
          <div class="dot"></div>
          <span>WebMCP Ready</span>
        </div>
        <button id="btn-demo-reset" class="secondary" title="Reset or Reload Demo Seed">
          ↺ Reset Demo
        </button>
      </div>
    </header>

    <div class="dashboard-container">
      <!-- Top Mission Hero -->
      <div class="dashboard-hero">
        <!-- Next Challenge Recommendation -->
        <div class="card recommend-card">
          <div class="card-header">
            <span class="card-title">🎯 Next Recommended Challenge</span>
            <span class="badge ${recommendation?.problem.difficulty || 'medium'}">${recommendation?.problem.difficulty || 'medium'}</span>
          </div>

          ${
            recommendation
              ? `
            <div class="recommend-body">
              <div class="recommend-problem-title">
                ${recommendation.problem.title}
                <span class="badge">${recommendation.problem.category}</span>
              </div>
              <div class="recommend-reason">
                💡 ${recommendation.reason}
              </div>
              <div class="recommend-meta">
                <span>⏱ Target: ${recommendation.problem.timeLimitMinutes} min</span>
                <span>•</span>
                <span>🔑 Pattern: <code>${recommendation.problem.pattern}</code></span>
                <span>•</span>
                <span>Complexity Goal: <code>${recommendation.problem.timeComplexity}</code></span>
              </div>
              <div style="margin-top: 6px;">
                <button id="btn-start-recommended" class="primary" style="padding: 8px 16px;">
                  Start Challenge →
                </button>
              </div>
            </div>
            `
              : `<div class="recommend-reason">All current challenges solved! Great work.</div>`
          }
        </div>

        <!-- Spaced Repetition Due Queue -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">⚡ Spaced Repetition Due (${dueItems.length})</span>
          </div>
          <div class="due-list">
            ${
              dueItems.length === 0
                ? `<div style="color: var(--text-dim); font-size: 12px; font-family: var(--font-mono); padding: 12px 0;">No reviews due right now. Next review intervals active.</div>`
                : dueItems
                    .slice(0, 5)
                    .map(
                      item => `
                  <div class="due-item">
                    <div class="due-item-left">
                      <span class="badge ${item.problem.difficulty}">${item.problem.difficulty[0].toUpperCase()}</span>
                      <div>
                        <div class="due-item-title">${item.problem.title}</div>
                        <div class="due-item-overdue">${item.overdueDays >= 1 ? `${Math.round(item.overdueDays)}d overdue` : 'Due today'}</div>
                      </div>
                    </div>
                    <button class="btn-due-review" data-problem-id="${item.problem.id}">Review</button>
                  </div>
                `
                    )
                    .join('')
            }
          </div>
        </div>
      </div>

      <!-- Skill & Pattern Matrix -->
      <div>
        <div class="category-section-title">
          <span>Skill & Pattern Graph (${categories.length} Categories)</span>
          <div class="filter-tabs">
            <button class="filter-tab ${activeFilter === 'all' ? 'active' : ''}" data-set="all">All (150)</button>
            <button class="filter-tab ${activeFilter === 'core-75' ? 'active' : ''}" data-set="core-75">Core 75</button>
            <button class="filter-tab ${activeFilter === 'extended-150' ? 'active' : ''}" data-set="extended-150">Extended 150</button>
          </div>
        </div>

        <div class="category-grid">
          ${categories
            .map(cat => {
              const pat = skillGraph.patterns[cat.slug] || {
                confidence: 0,
                problemsSolved: 0,
                totalProblems: 0
              };
              const catProbs = problems.filter(p => p.categorySlug === cat.slug);
              const confPercent = Math.round(pat.confidence * 100);
              const weightPercent = Math.round((cat.weight || 0.05) * 100);

              // Render dot matrix for problems in category
              const dots = catProbs
                .map(prob => {
                  const prog = progressMap.get(prob.id);
                  if (prog?.status === 'solved' || (prog?.solveCount ?? 0) > 0) {
                    return `<div class="dot filled" title="${prob.title} (Solved)"></div>`;
                  }
                  return `<div class="dot" title="${prob.title} (Unsolved)"></div>`;
                })
                .join('');

              return `
              <div class="category-card" data-category-slug="${cat.slug}">
                <div class="category-card-top">
                  <span class="category-name">${cat.name}</span>
                  <span class="category-weight">${weightPercent}% wt</span>
                </div>
                <div class="category-confidence-row">
                  <span style="color: var(--text-dim);">Confidence</span>
                  <span class="category-confidence-val" style="color: ${confPercent > 70 ? 'var(--green)' : confPercent > 40 ? 'var(--yellow)' : 'var(--text-muted)'}">${confPercent}%</span>
                </div>
                <div class="category-progress-bar">
                  <div class="category-progress-fill" style="width: ${confPercent}%;"></div>
                </div>
                <div class="dot-matrix">
                  ${dots}
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>

      <!-- Problem Catalog -->
      <div id="catalog-section">
        <div class="catalog-header">
          <div class="catalog-search-bar">
            <input type="text" id="catalog-search" placeholder="Search problems, patterns, topics (e.g. graph, two pointers)..." value="${searchQuery}">
          </div>

          <div class="filter-tabs">
            <button class="filter-tab active" data-diff="all">All Difficulties</button>
            <button class="filter-tab" data-diff="easy">Easy</button>
            <button class="filter-tab" data-diff="medium">Medium</button>
            <button class="filter-tab" data-diff="hard">Hard</button>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="problem-table">
            <thead>
              <tr>
                <th style="width: 60px;">#</th>
                <th>Title</th>
                <th style="width: 100px;">Difficulty</th>
                <th style="width: 180px;">Category</th>
                <th style="width: 160px;">Pattern</th>
                <th style="width: 120px;">Status</th>
                <th style="width: 90px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="catalog-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Render Table rows
  const tbody = container.querySelector('#catalog-tbody') as HTMLElement;
  const renderTableRows = () => {
    let filtered = problems;

    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => p.lists?.includes(activeFilter));
    }
    if (selectedCategorySlug) {
      filtered = filtered.filter(p => p.categorySlug === selectedCategorySlug);
    }
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(p => p.difficulty === selectedDifficulty);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.pattern.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-dim); padding: 24px;">
            No matching problems found. Try clearing your search filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map(p => {
        const prog = progressMap.get(p.id);
        const isSolved = prog?.status === 'solved' || (prog?.solveCount ?? 0) > 0;
        const isDue = dueItems.some(d => d.problem.id === p.id);

        let statusBadge = `<span class="badge" style="opacity: 0.5;">Unattempted</span>`;
        if (isDue) {
          statusBadge = `<span class="badge due">Review Due</span>`;
        } else if (isSolved) {
          statusBadge = `<span class="badge solved">✓ Solved</span>`;
        }

        return `
        <tr>
          <td class="col-rank">#${p.frequencyRank || '-'}</td>
          <td class="col-title">
            <span style="cursor: pointer;" class="problem-link" data-problem-id="${p.id}">${p.title}</span>
            ${p.isCore75 ? `<span class="badge" style="font-size: 9px; padding: 1px 4px;">75</span>` : ''}
          </td>
          <td><span class="badge ${p.difficulty}">${p.difficulty}</span></td>
          <td style="color: var(--text-muted);">${p.category}</td>
          <td><code>${p.pattern}</code></td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            <button class="btn-table-start" data-problem-id="${p.id}" style="padding: 4px 8px; font-size: 11px;">
              ${isSolved ? 'Review' : 'Start'}
            </button>
          </td>
        </tr>
      `;
      })
      .join('');

    // Bind click events on rows
    tbody.querySelectorAll('.problem-link, .btn-table-start').forEach(el => {
      el.addEventListener('click', () => {
        const pId = el.getAttribute('data-problem-id');
        if (pId) onNavigateWorkspace(pId);
      });
    });
  };

  renderTableRows();

  // Event Listeners
  const btnStartRec = container.querySelector('#btn-start-recommended');
  if (btnStartRec && recommendation) {
    btnStartRec.addEventListener('click', () => {
      onNavigateWorkspace(recommendation.problem.id);
    });
  }

  container.querySelectorAll('.btn-due-review').forEach(el => {
    el.addEventListener('click', () => {
      const pId = el.getAttribute('data-problem-id');
      if (pId) onNavigateWorkspace(pId);
    });
  });

  // Filter tabs for problem sets
  container.querySelectorAll('.filter-tab[data-set]').forEach(el => {
    el.addEventListener('click', () => {
      const set = el.getAttribute('data-set') as any;
      setClientState({ targetFilter: set });
      renderDashboard(container, onNavigateWorkspace);
    });
  });

  // Difficulty filter pills
  container.querySelectorAll('.filter-tab[data-diff]').forEach(el => {
    el.addEventListener('click', () => {
      container.querySelectorAll('.filter-tab[data-diff]').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      selectedDifficulty = el.getAttribute('data-diff') || 'all';
      renderTableRows();
    });
  });

  // Category card filter
  container.querySelectorAll('.category-card').forEach(el => {
    el.addEventListener('click', () => {
      const slug = el.getAttribute('data-category-slug');
      if (selectedCategorySlug === slug) {
        selectedCategorySlug = null;
        el.classList.remove('selected');
      } else {
        container.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
        selectedCategorySlug = slug;
        el.classList.add('selected');
      }
      renderTableRows();

      const catalogSection = container.querySelector('#catalog-section');
      catalogSection?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Search input
  const searchInput = container.querySelector('#catalog-search') as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    renderTableRows();
  });

  // Reset Demo button
  const btnReset = container.querySelector('#btn-demo-reset');
  btnReset?.addEventListener('click', async () => {
    await resetDatabase(true);
    showToast('Demo data re-seeded successfully!', 'success');
    renderDashboard(container, onNavigateWorkspace);
  });
}
