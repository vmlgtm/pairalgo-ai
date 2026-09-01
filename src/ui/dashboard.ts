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
import { initCompanionDrawer, CompanionDrawerInstance } from './companion-drawer';
import {
  iconFlame,
  iconTarget,
  iconClock,
  iconCpu,
  iconActivity,
  iconCheck,
  iconArrowRight
} from './icons';
import type { ProblemProgress } from '../engine/types';

let currentDrawer: CompanionDrawerInstance | null = null;

export async function renderDashboard(
  container: HTMLElement,
  onNavigateWorkspace: (problemId: string) => void
): Promise<void> {
  // Clean up existing companion drawer if any
  if (currentDrawer) {
    currentDrawer.destroy();
    currentDrawer = null;
  }

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

  const rawDueItems = getDueForReview(problems, progressList, now);
  const recommendation = getRecommendation(
    categories,
    problems,
    progressMap,
    attempts,
    { set: activeFilter === 'all' ? undefined : activeFilter },
    now
  );

  // Filter out the active hero recommendation from the due list so it isn't duplicated
  const displayDueItems = recommendation
    ? rawDueItems.filter(d => d.problem.id !== recommendation.problem.id)
    : rawDueItems;

  // Sort categories by interview frequency / weight descending (12% Arrays first -> 2% Bit Manipulation last)
  const sortedCategories = [...categories].sort((a, b) => (b.weight || 0) - (a.weight || 0));

  // Filter state for catalog
  let searchQuery = '';
  let selectedCategorySlug: string | null = null;
  let selectedDifficulty: string = 'all';

  container.innerHTML = `
    <header class="app-header">
      <div class="brand" id="brand-home">
        <div class="brand-logo">PA</div>
        <span class="brand-title">PAIRALGO</span>
      </div>

      <div class="header-right">
        <div class="header-telemetry">
          <span class="telemetry-val" style="color: var(--green);">${Math.round(skillGraph.overallReadiness * 100)}%</span>
          <span>Readiness</span>
          <span class="telemetry-divider">•</span>
          <span class="telemetry-val">${iconFlame({ size: 11, className: 'icon' })} ${streakInfo.currentStreak}d</span>
          <span>streak</span>
          <span class="telemetry-divider">•</span>
          <span class="telemetry-val">${skillGraph.totalSolved}/${problems.length}</span>
          <span>solved</span>
        </div>
      </div>
    </header>

    <div class="dashboard-container">
      <!-- 2-Card Hero: Next Challenge + Due Reviews (100% Practice Focus) -->
      <div class="dashboard-hero">
        <!-- Left Card: Next Challenge Recommendation -->
        <div class="card recommend-card">
          <div class="card-header">
            <span class="card-title">
              ${iconTarget({ size: 13, className: 'icon' })}
              <span>Next Recommended Challenge</span>
            </span>
            <span class="diff-text ${recommendation?.problem.difficulty || 'medium'}">${recommendation?.problem.difficulty ? recommendation.problem.difficulty[0].toUpperCase() + recommendation.problem.difficulty.slice(1) : 'Medium'}</span>
          </div>

          ${
            recommendation
              ? `
            <div class="recommend-body">
              <div>
                <div class="recommend-problem-title">
                  <span>${recommendation.problem.title}</span>
                  <span style="color: var(--text-muted); font-size: 13px; font-weight: normal; font-family: var(--font-mono);">• ${recommendation.problem.category}</span>
                </div>
                <div class="recommend-meta">
                  <span class="meta-item">${iconClock({ size: 12, className: 'icon' })} Target: ${recommendation.problem.timeLimitMinutes} min</span>
                  <span class="meta-divider">•</span>
                  <span class="meta-item">${iconCpu({ size: 12, className: 'icon' })} Pattern: <code>${recommendation.problem.pattern}</code></span>
                  <span class="meta-divider">•</span>
                  <span class="meta-item">Complexity: <code>${recommendation.problem.timeComplexity}</code></span>
                </div>
              </div>

              ${
                recommendation.problem.keyInsight
                  ? `
                <div class="recommend-insight">
                  <span class="insight-label">Key Idea:</span>
                  <span class="insight-text">${recommendation.problem.keyInsight}</span>
                </div>
                `
                  : ''
              }

              <div style="display: flex; align-items: center; gap: 8px;">
                <button id="btn-start-recommended" class="primary" style="padding: 6px 14px; font-size: 12px;">
                  <span>Start Challenge</span>
                  ${iconArrowRight({ size: 12, className: 'icon' })}
                </button>
              </div>
            </div>
            `
              : `<div style="color: var(--text-dim); font-size: 12px; padding: 12px 0;">All current challenges solved! Great work.</div>`
          }
        </div>

        <!-- Right Card: Spaced Repetition Due Queue -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              ${iconActivity({ size: 13, className: 'icon' })}
              <span>Spaced Repetition Queue</span>
            </span>
          </div>
          <div class="due-list" style="max-height: 180px;">
            ${
              displayDueItems.length === 0
                ? `<div style="color: var(--text-dim); font-size: 11px; font-family: var(--font-mono); padding: 16px 0; text-align: center;">All reviews completed. Spaced repetition intervals active.</div>`
                : displayDueItems
                    .slice(0, 3)
                    .map(
                      item => `
                  <div class="due-item">
                    <div class="due-item-left">
                      <span class="diff-text ${item.problem.difficulty}" style="font-weight: 700; width: 14px; text-align: center;">${item.problem.difficulty[0].toUpperCase()}</span>
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
          <span>Skill & Pattern Graph</span>
        </div>

        <div class="category-grid">
          ${sortedCategories
            .map(cat => {
              const pat = skillGraph.patterns[cat.slug] || {
                confidence: 0,
                problemsSolved: 0,
                totalProblems: 0
              };
              const catProbs = problems.filter(p => p.categorySlug === cat.slug);
              const solvedCount = catProbs.filter(p => {
                const prog = progressMap.get(p.id);
                return prog?.status === 'solved' || (prog?.solveCount ?? 0) > 0;
              }).length;

              const dueInCatCount = rawDueItems.filter(d => d.problem.categorySlug === cat.slug).length;
              const confPercent = Math.round(pat.confidence * 100);
              const weightPercent = Math.round((cat.weight || 0.05) * 100);
              const isSelected = selectedCategorySlug === cat.slug;

              return `
              <div class="category-card ${isSelected ? 'selected' : ''}" data-category-slug="${cat.slug}">
                <div class="category-card-top">
                  <span class="category-name">${cat.name}</span>
                  <div class="category-header-right">
                    ${dueInCatCount > 0 ? `<span class="category-due-text" title="${dueInCatCount} problem(s) due for spaced repetition review">${dueInCatCount} due</span>` : ''}
                    <span class="category-weight" title="Interview Frequency: ${weightPercent}% of top tech coding interviews test ${cat.name}">${weightPercent}% wt</span>
                  </div>
                </div>

                <div class="category-confidence-row">
                  <span class="category-resting-info" style="color: var(--text-dim);" title="Pattern Mastery: ${confPercent}% retention based on solve count and SM-2 spaced repetition">Confidence</span>
                  <span class="category-hover-info">${solvedCount}/${catProbs.length} Solved • Filter ↗</span>
                  <span class="category-confidence-val" style="color: ${confPercent >= 85 ? 'var(--green)' : 'var(--text)'}" title="Mastery Score: ${confPercent}%">${confPercent}%</span>
                </div>

                <div class="category-progress-bar" title="${solvedCount} of ${catProbs.length} solved (${confPercent}% pattern mastery)">
                  <div class="category-progress-fill" style="width: ${confPercent}%;"></div>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>

      <!-- Problem Catalog with Unified Toolbar -->
      <div id="catalog-section">
        <div class="catalog-toolbar">
          <div class="catalog-toolbar-left">
            <div class="catalog-search-bar">
              <input type="text" id="catalog-search" placeholder="Search problems, patterns (e.g. graph, sliding window)..." value="${searchQuery}">
              <kbd class="search-kbd">/</kbd>
            </div>
            <div id="active-category-container"></div>
          </div>

          <div class="catalog-toolbar-right">
            <select id="catalog-select-set" class="catalog-select" title="Filter problem curriculum">
              <option value="all" ${activeFilter === 'all' ? 'selected' : ''}>All Problems</option>
              <option value="core-75" ${activeFilter === 'core-75' ? 'selected' : ''}>Core 75</option>
            </select>

            <select id="catalog-select-diff" class="catalog-select" title="Filter by difficulty">
              <option value="all" ${selectedDifficulty === 'all' ? 'selected' : ''}>All Difficulties</option>
              <option value="easy" ${selectedDifficulty === 'easy' ? 'selected' : ''}>Easy</option>
              <option value="medium" ${selectedDifficulty === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="hard" ${selectedDifficulty === 'hard' ? 'selected' : ''}>Hard</option>
            </select>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="problem-table">
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>Title</th>
                <th style="width: 90px; white-space: nowrap;">Difficulty</th>
                <th style="width: 150px; white-space: nowrap;">Category</th>
                <th style="width: 140px; white-space: nowrap;">Pattern</th>
                <th style="width: 130px; white-space: nowrap;">Status</th>
                <th style="width: 90px; text-align: right; white-space: nowrap;">Action</th>
              </tr>
            </thead>
            <tbody id="catalog-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Dashboard Footer with Discrete Utility Links -->
      <footer class="dashboard-footer">
        <span>PairAlgo — Open Source Algorithm Practice</span>
        <button id="btn-demo-reset" class="footer-reset-btn" title="Reset or Reload Demo Seed">
          ↺ Reset demo seed
        </button>
      </footer>
    </div>
  `;

  // Mount Floating Side Sticker & 2-Tab Slide-Over Drawer
  currentDrawer = initCompanionDrawer(document.body);

  // Render Category Filter pill in toolbar
  const updateCategoryPill = () => {
    const catContainer = container.querySelector('#active-category-container');
    if (!catContainer) return;

    if (selectedCategorySlug) {
      const catObj = categories.find(c => c.slug === selectedCategorySlug);
      catContainer.innerHTML = `
        <div class="active-category-pill">
          <span>Category: <strong>${catObj?.name || selectedCategorySlug}</strong></span>
          <span class="active-category-clear" title="Clear category filter">✕</span>
        </div>
      `;
      catContainer.querySelector('.active-category-clear')?.addEventListener('click', () => {
        selectedCategorySlug = null;
        container.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
        updateCategoryPill();
        renderTableRows();
      });
    } else {
      catContainer.innerHTML = '';
    }
  };

  // Render Table rows with clean, calm typography
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
      .map((p, idx) => {
        const prog = progressMap.get(p.id);
        const isSolved = prog?.status === 'solved' || (prog?.solveCount ?? 0) > 0;
        const isDue = rawDueItems.some(d => d.problem.id === p.id);

        let statusHtml = `<span class="status-unattempted">—</span>`;
        if (isDue) {
          statusHtml = `<span class="status-due"><span class="status-due-dot">●</span> Due</span>`;
        } else if (isSolved) {
          statusHtml = `<span class="status-solved">${iconCheck({ size: 10, className: 'icon' })} Solved</span>`;
        }

        const diffClass = p.difficulty === 'easy' ? 'easy' : p.difficulty === 'medium' ? 'medium' : 'hard';
        const diffLabel = p.difficulty[0].toUpperCase() + p.difficulty.slice(1);

        return `
        <tr class="problem-row" data-problem-id="${p.id}" style="cursor: pointer;">
          <td class="col-rank" title="Problem #${idx + 1} (Category Priority: #${p.frequencyRank || 1})">${idx + 1}</td>
          <td class="col-title">
            <span class="problem-link">${p.title}</span>
            ${p.isCore75 ? `<span class="core75-tag">75</span>` : ''}
          </td>
          <td class="col-diff"><span class="diff-text ${diffClass}">${diffLabel}</span></td>
          <td class="col-category" style="color: var(--text-muted);">${p.category}</td>
          <td class="col-pattern"><code>${p.pattern}</code></td>
          <td class="col-status">${statusHtml}</td>
          <td class="col-action" style="text-align: right;">
            <span class="table-action-link">
              ${isSolved ? 'Review →' : 'Start →'}
            </span>
          </td>
        </tr>
      `;
      })
      .join('');

    // Bind click events on rows
    tbody.querySelectorAll('.problem-row').forEach(el => {
      el.addEventListener('click', () => {
        const pId = el.getAttribute('data-problem-id');
        if (pId) {
          if (currentDrawer) currentDrawer.destroy();
          onNavigateWorkspace(pId);
        }
      });
    });
  };

  renderTableRows();
  updateCategoryPill();

  // Event Listeners
  const btnStartRec = container.querySelector('#btn-start-recommended');
  if (btnStartRec && recommendation) {
    btnStartRec.addEventListener('click', () => {
      if (currentDrawer) currentDrawer.destroy();
      onNavigateWorkspace(recommendation.problem.id);
    });
  }

  container.querySelectorAll('.btn-due-review').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const pId = el.getAttribute('data-problem-id');
      if (pId) {
        if (currentDrawer) currentDrawer.destroy();
        onNavigateWorkspace(pId);
      }
    });
  });





  // Dropdown change for problem set in toolbar
  const selectSet = container.querySelector('#catalog-select-set') as HTMLSelectElement;
  selectSet?.addEventListener('change', () => {
    const set = selectSet.value as any;
    setClientState({ targetFilter: set });
    renderDashboard(container, onNavigateWorkspace);
  });

  // Dropdown change for difficulty in toolbar
  const selectDiff = container.querySelector('#catalog-select-diff') as HTMLSelectElement;
  selectDiff?.addEventListener('change', () => {
    selectedDifficulty = selectDiff.value;
    renderTableRows();
  });

  // Category card filter click
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
      updateCategoryPill();
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

  // Global Keyboard shortcut for search (/ or Cmd+K)
  const onKeydown = (e: KeyboardEvent) => {
    const activeTag = (document.activeElement?.tagName || '').toLowerCase();
    if (activeTag === 'input' || activeTag === 'textarea') return;

    if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
      e.preventDefault();
      const catalogSection = container.querySelector('#catalog-section');
      catalogSection?.scrollIntoView({ behavior: 'smooth' });
      searchInput?.focus();
    }
  };
  window.addEventListener('keydown', onKeydown);

  // Reset Demo button in footer
  const btnReset = container.querySelector('#btn-demo-reset');
  btnReset?.addEventListener('click', async () => {
    window.removeEventListener('keydown', onKeydown);
    if (currentDrawer) currentDrawer.destroy();
    await resetDatabase(true);
    showToast('Demo data re-seeded successfully!', 'success');
    renderDashboard(container, onNavigateWorkspace);
  });
}
