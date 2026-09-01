import { getProblem, getProgress, saveProgress } from '../engine/db';
import { runTests as executeSandbox } from '../runner/runner';
import { submitSolutionTool } from '../webmcp/tools/submitSolution';
import { initEditor, setEditorValue, getEditorValue, disposeEditor } from './editor';
import { setClientState } from '../webmcp/state';
import { addActivityEvent } from '../webmcp/events';
import { showScorecardModal } from './modal';
import { showToast } from './toast';
import { renderPairGuideHtml, bindGuidePromptClicks, copyPromptToClipboard } from './guide';
import { renderActivityFeedHtml, initLiveActivityFeed } from './activity-feed';
import { initCompanionDrawer } from './companion-drawer';
import {
  iconArrowLeft,
  iconClock,
  iconLightbulb,
  iconFileText,
  iconBot,
  iconPlay,
  iconCheck,
  iconRotateCcw,
  iconCopy,
  iconTerminal
} from './icons';
import type { Problem, ProblemProgress, ExecutionResult } from '../engine/types';

let timerInterval: any = null;
let activeUnsubscribeActivity: (() => void) | null = null;
let activeCleanupListeners: (() => void) | null = null;

export async function renderWorkspace(
  container: HTMLElement,
  problemId: string,
  onNavigateDashboard: () => void,
  onNavigateProblem: (nextId: string) => void
): Promise<void> {
  // Clear any existing timer & listeners
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (activeUnsubscribeActivity) {
    activeUnsubscribeActivity();
    activeUnsubscribeActivity = null;
  }
  if (activeCleanupListeners) {
    activeCleanupListeners();
    activeCleanupListeners = null;
  }
  disposeEditor();

  const problem = await getProblem(problemId);
  if (!problem) {
    showToast(`Problem "${problemId}" not found.`, 'error');
    onNavigateDashboard();
    return;
  }

  // Mount Companion Drawer without floating sticker (accessed via header button)
  const drawer = initCompanionDrawer(document.body, problem.id, { showSticker: false });

  const activeProblem: Problem = problem;

  const existingProgress = await getProgress(problem.id);
  const initialCode = existingProgress?.savedCode || problem.starterCode;
  let hintsRevealed = existingProgress?.lastHintsUsed || 0;
  let remainingSeconds = problem.timeLimitMinutes * 60;
  let lastExecutionResult: ExecutionResult | null = null;
  let lastTestedCode: string = initialCode;
  let activeTestCaseIndex = 0;

  // Set ambient client state
  setClientState({
    view: 'workspace',
    activeProblemId: problem.id,
    timeRemainingSeconds: remainingSeconds,
    testsPassed: 0,
    testsTotal: problem.testCases.length,
    hintsRevealed,
    editorDirty: false
  });

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  container.innerHTML = `
    <header class="app-header">
      <div class="brand" id="workspace-brand">
        <div class="brand-logo">PA</div>
        <span class="brand-title">PAIRALGO</span>
      </div>

      <div class="header-right">
        <button id="btn-header-pair-ws" class="header-action-badge" title="Open ChatGPT Pairing Guide & Live Activity Feed">
          <span class="sticker-sparkle" style="font-size: 13px;">✦</span>
          <span>Pair in ChatGPT</span>
        </button>
        <button id="btn-back-dashboard" class="secondary" style="padding: 4px 10px; font-size: 11px;">
          ${iconArrowLeft({ size: 12, className: 'icon' })}
          <span>Dashboard</span>
        </button>
      </div>
    </header>

    <div class="workspace-container">
      <!-- Left Panel: Problem Spec, Tabs, Guide & Test Runner -->
      <div class="workspace-left-panel">
        <div class="workspace-header">
          <div class="workspace-title-group">
            <span class="workspace-title">${problem.title}</span>
            <span class="diff-text ${problem.difficulty}" style="font-size: 12px; line-height: 1;">${problem.difficulty[0].toUpperCase() + problem.difficulty.slice(1)}</span>
            <span class="workspace-meta-sep">•</span>
            <span class="workspace-category">${problem.category}</span>
          </div>

          <div id="timer-display" class="timer-pill">
            ${iconClock({ size: 12, className: 'icon' })}
            <span>${formatTimer(remainingSeconds)}</span>
          </div>
        </div>

        <!-- Segmented Tab Navigation -->
        <div class="workspace-tabs-bar" id="workspace-tab-controls">
          <button class="tab-btn active" data-pane="pane-spec">
            ${iconFileText({ size: 12, className: 'icon' })}
            <span>Spec & Tests</span>
          </button>
          <button class="tab-btn" data-pane="pane-pair">
            ${iconBot({ size: 12, className: 'icon' })}
            <span>AI Pair & Hints</span>
            <span class="tab-badge" id="tab-hints-badge">${hintsRevealed > 0 ? hintsRevealed : ''}</span>
          </button>
          <button class="tab-btn" data-pane="pane-notes">
            ${iconTerminal({ size: 12, className: 'icon' })}
            <span>Scratchpad</span>
          </button>
        </div>

        <!-- Tab 1: Spec & Test Runner -->
        <div id="pane-spec" class="workspace-tab-pane active">
          <!-- Problem Description -->
          <div class="problem-description">
            <p>${problem.description}</p>
          </div>

          <!-- Complexity Goals -->
          <div class="complexity-goals">
            <div class="complexity-item">
              <span class="complexity-label">Time Complexity Goal</span>
              <span class="complexity-value"><code>${problem.timeComplexity}</code></span>
            </div>
            <div class="complexity-item">
              <span class="complexity-label">Space Complexity Goal</span>
              <span class="complexity-value"><code>${problem.spaceComplexity}</code></span>
            </div>
          </div>

          <!-- Test Cases Runner Output -->
          <div class="test-results-panel">
            <div class="test-results-header">
              <span id="test-results-title">Test Cases (${problem.testCases.length})</span>
              <span id="test-results-meta" style="color: var(--text-dim);">Cmd+S to run</span>
            </div>

            <div class="test-cases-tabs" id="tc-tabs">
              ${problem.testCases
                .map(
                  (_, i) => `
                <div class="tc-tab ${i === 0 ? 'active' : ''}" data-index="${i}">
                  Case ${i + 1}
                </div>
              `
                )
                .join('')}
            </div>

            <div id="tc-detail-container">
              ${renderTestCaseDetail(problem.testCases[0], null)}
            </div>
          </div>
        </div>

        <!-- Tab 2: AI Pair Guide, Socratic Hints & Activity Feed -->
        <div id="pane-pair" class="workspace-tab-pane">
          <!-- Socratic Hints Drawer -->
          <div class="hints-container">
            <div class="hints-header">
              <span class="hints-header-title">
                ${iconLightbulb({ size: 13, className: 'icon' })}
                <span>Socratic Hints (${hintsRevealed}/${problem.hints.length})</span>
              </span>
              ${
                hintsRevealed < problem.hints.length
                  ? `<button id="btn-reveal-hint" class="secondary" style="padding: 2px 7px; font-size: 11px;">
                      Reveal Hint ${hintsRevealed + 1}
                    </button>`
                  : `<span style="font-size: 11px; color: var(--green);">All Hints Revealed</span>`
              }
            </div>
            <div id="hints-body" style="display: flex; flex-direction: column; gap: 8px;">
              ${renderHintsHtml(problem, hintsRevealed)}
            </div>
          </div>

          <!-- Pair with ChatGPT Guide Card -->
          ${renderPairGuideHtml('workspace')}

          <!-- In-App Agent Activity Feed Scoped to Active Problem -->
          ${renderActivityFeedHtml(problem.id, 6)}
        </div>

        <!-- Tab 3: Declarative HTML WebMCP Notes Scratchpad -->
        <div id="pane-notes" class="workspace-tab-pane">
          <div class="notes-container">
            <span class="notes-label">
              ${iconFileText({ size: 12, className: 'icon' })}
              <span>Notes & Complexity Scratchpad (WebMCP Annotated)</span>
            </span>
            <form id="notes-form" data-model-context="problem_notes">
              <textarea
                name="notes"
                id="notes-textarea"
                class="notes-textarea"
                placeholder="Write your approach, invariants, edge cases, and time/space complexity notes here..."
              >${existingProgress?.savedNotes || ''}</textarea>
            </form>
          </div>
        </div>
      </div>

      <!-- Right Panel: Monaco Editor, Dirty Cue & Controls -->
      <div class="workspace-right-panel">
        <div class="editor-top-bar">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>TypeScript Sandbox</span>
            <span class="editor-hint">• Cmd+S / Ctrl+S to run</span>
          </div>
          <button id="btn-reset-code" class="secondary" style="padding: 2px 8px; font-size: 11px;">
            ${iconRotateCcw({ size: 11, className: 'icon' })}
            <span>Reset Code</span>
          </button>
        </div>

        <div id="monaco-editor-container" class="monaco-container"></div>

        <!-- Subtle "Run Latest Code" Dirty State Cue -->
        <div id="editor-dirty-cue" class="dirty-cue-banner" style="display: none; margin: 0 14px 8px 14px;">
          <div class="dirty-cue-left">
            <div class="dirty-cue-dot"></div>
            <span class="dirty-cue-text">Code modified since last run. Ask ChatGPT to test latest code.</span>
          </div>
          <button class="dirty-cue-copy-btn" data-copy-prompt="Run my latest code and explain any failing test." title="Click to copy prompt for ChatGPT">
            ${iconCopy({ size: 10, className: 'icon' })}
            <span>Copy Prompt</span>
          </button>
        </div>

        <div class="editor-bottom-bar">
          <div id="editor-status" class="editor-status-text">
            Ready to test
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="btn-run-tests" class="secondary" style="font-weight: 600;">
              ${iconPlay({ size: 11, className: 'icon' })}
              <span>Run Tests</span>
            </button>
            <button id="btn-submit" class="success">
              ${iconCheck({ size: 12, className: 'icon' })}
              <span>Submit Solution</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind Segmented Tabs in Left Rail
  const tabButtons = container.querySelectorAll('.workspace-tabs-bar .tab-btn');
  const tabPanes = container.querySelectorAll('.workspace-tab-pane');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const paneId = btn.getAttribute('data-pane');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const activePane = container.querySelector(`#${paneId}`);
      if (activePane) activePane.classList.add('active');
    });
  });

  // Start Countdown Timer
  const timerSpan = container.querySelector('#timer-display span') as HTMLElement;
  const timerPill = container.querySelector('#timer-display') as HTMLElement;
  timerInterval = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      if (timerSpan) timerSpan.innerText = formatTimer(remainingSeconds);
      if (remainingSeconds < 120) {
        timerPill?.classList.add('urgent');
      }
      setClientState({ timeRemainingSeconds: remainingSeconds });
    }
  }, 1000);

  // Helper to re-render hints
  function updateHintsUI() {
    const hintsBody = container.querySelector('#hints-body');
    const headerTitle = container.querySelector('.hints-header-title');
    const hintsBadge = container.querySelector('#tab-hints-badge');
    if (hintsBody) hintsBody.innerHTML = renderHintsHtml(activeProblem, hintsRevealed);
    if (headerTitle) {
      headerTitle.innerHTML = `
        ${iconLightbulb({ size: 13, className: 'icon' })}
        <span>Socratic Hints (${hintsRevealed}/${activeProblem.hints.length})</span>
      `;
    }
    if (hintsBadge) {
      hintsBadge.textContent = hintsRevealed > 0 ? String(hintsRevealed) : '';
    }

    const revealBtn = container.querySelector('#btn-reveal-hint');
    if (revealBtn) {
      if (hintsRevealed < activeProblem.hints.length) {
        revealBtn.innerHTML = `Reveal Hint ${hintsRevealed + 1}`;
      } else {
        revealBtn.parentElement!.innerHTML = `
          <span class="hints-header-title">
            ${iconLightbulb({ size: 13, className: 'icon' })}
            <span>Socratic Hints (${hintsRevealed}/${activeProblem.hints.length})</span>
          </span>
          <span style="font-size: 11px; color: var(--green);">All Hints Revealed</span>
        `;
      }
    }
  }

  // Update Test Results UI across panel
  function updateTestResultsUI(result: ExecutionResult) {
    lastExecutionResult = result;
    const statusEl = container.querySelector('#editor-status') as HTMLElement;
    const resultsMeta = container.querySelector('#test-results-meta') as HTMLElement;

    if (result.error) {
      if (statusEl) statusEl.innerHTML = `<span style="color: var(--red);">Error: ${result.error}</span>`;
      if (resultsMeta) resultsMeta.innerHTML = `<span style="color: var(--red);">Execution Error</span>`;
    } else if (result.allPassed) {
      if (statusEl) statusEl.innerHTML = `<span style="color: var(--green);">✓ All ${result.passedCount}/${result.totalCount} Tests Passed (${result.totalTimeMs}ms)</span>`;
      if (resultsMeta) resultsMeta.innerHTML = `<span style="color: var(--green);">${result.passedCount}/${result.totalCount} Passed (${result.totalTimeMs}ms)</span>`;
    } else {
      if (statusEl) statusEl.innerHTML = `<span style="color: var(--red);">✕ ${result.passedCount}/${result.totalCount} Tests Passed</span>`;
      if (resultsMeta) resultsMeta.innerHTML = `<span style="color: var(--red);">${result.passedCount}/${result.totalCount} Passed</span>`;
    }

    // Update test tabs
    const tabsContainer = container.querySelector('#tc-tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = activeProblem.testCases
        .map((_, i) => {
          const testRes = result.results.find(r => r.testIndex === i);
          let passClass = '';
          if (testRes) {
            passClass = testRes.passed ? 'passed' : 'failed';
          }
          return `
          <div class="tc-tab ${i === activeTestCaseIndex ? 'active' : ''} ${passClass}" data-index="${i}">
            Case ${i + 1} ${testRes ? (testRes.passed ? '✓' : '✕') : ''}
          </div>
        `;
        })
        .join('');

      // Rebind tab clicks
      tabsContainer.querySelectorAll('.tc-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const idx = Number(tab.getAttribute('data-index'));
          activeTestCaseIndex = idx;
          tabsContainer.querySelectorAll('.tc-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          renderSelectedTestCase();
        });
      });
    }

    renderSelectedTestCase();
  }

  const renderSelectedTestCase = () => {
    const detailContainer = container.querySelector('#tc-detail-container');
    if (!detailContainer) return;
    const tc = activeProblem.testCases[activeTestCaseIndex];
    const res = lastExecutionResult?.results.find(r => r.testIndex === activeTestCaseIndex) || null;
    detailContainer.innerHTML = renderTestCaseDetail(tc, res);
  };

  // Setup Notes Auto-Save
  const notesTextarea = container.querySelector('#notes-textarea') as HTMLTextAreaElement;
  notesTextarea?.addEventListener('input', async () => {
    const notesVal = notesTextarea.value;
    const prog: ProblemProgress = (await getProgress(activeProblem.id)) || {
      problemId: activeProblem.id,
      status: 'unattempted',
      solveCount: 0,
      failCount: 0,
      sm2IntervalDays: 1,
      sm2Repetitions: 0,
      sm2EaseFactor: 2.5
    };
    prog.savedNotes = notesVal;
    await saveProgress(prog);
  });

  // Runner Function for local execution
  const handleRunTests = async () => {
    const code = getEditorValue();
    const statusEl = container.querySelector('#editor-status') as HTMLElement;
    if (statusEl) statusEl.innerHTML = `Running in sandbox...`;

    // Save code to progress
    const prog: ProblemProgress = (await getProgress(activeProblem.id)) || {
      problemId: activeProblem.id,
      status: 'unattempted',
      solveCount: 0,
      failCount: 0,
      sm2IntervalDays: 1,
      sm2Repetitions: 0,
      sm2EaseFactor: 2.5
    };
    prog.savedCode = code;
    await saveProgress(prog);

    const result = await executeSandbox(activeProblem, code);
    lastTestedCode = code;

    // Clear dirty cue
    const dirtyCue = container.querySelector('#editor-dirty-cue') as HTMLElement;
    if (dirtyCue) dirtyCue.style.display = 'none';

    // Update ambient state
    setClientState({
      testsPassed: result.passedCount,
      testsTotal: result.totalCount,
      editorDirty: false,
      lastTestSummary: {
        passedCount: result.passedCount,
        totalCount: result.totalCount,
        allPassed: result.allPassed,
        totalTimeMs: result.totalTimeMs,
        error: result.error
      }
    });

    // Record user activity event
    addActivityEvent({
      actor: 'user',
      type: 'tests_run',
      summary: `You ran tests — ${result.passedCount}/${result.totalCount} passing (${result.totalTimeMs}ms)`,
      problemId: activeProblem.id,
      problemTitle: activeProblem.title,
      metadata: {
        passCount: result.passedCount,
        totalCount: result.totalCount,
        durationMs: result.totalTimeMs,
        allPassed: result.allPassed,
        error: result.error
      }
    });

    updateTestResultsUI(result);

    // Switch to Spec tab if not already there so results are visible
    const specTabBtn = container.querySelector('.tab-btn[data-pane="pane-spec"]') as HTMLElement;
    if (specTabBtn && !specTabBtn.classList.contains('active')) {
      specTabBtn.click();
    }

    if (result.error) {
      showToast(result.error, 'error');
    } else if (result.allPassed) {
      showToast(`All ${result.passedCount} tests passed!`, 'success');
    } else {
      showToast(`${result.totalCount - result.passedCount} tests failed`, 'warning');
    }
  };

  // Submit Solution Function
  const handleSubmitSolution = async () => {
    const code = getEditorValue();
    const timeSpent = activeProblem.timeLimitMinutes * 60 - remainingSeconds;
    const res = await submitSolutionTool.execute({
      problemId: activeProblem.id,
      code,
      timeSpentSeconds: timeSpent,
      actor: 'user'
    });

    if (!res.passed) {
      showToast('Cannot submit: One or more test cases failed.', 'error');
      handleRunTests();
    }
  };

  // Reactive listener for WebMCP agent test execution
  const onTestsExecuted = (e: any) => {
    const detail = e.detail;
    if (detail && detail.problemId === activeProblem.id && detail.execResult) {
      lastTestedCode = getEditorValue();
      const dirtyCue = container.querySelector('#editor-dirty-cue') as HTMLElement;
      if (dirtyCue) dirtyCue.style.display = 'none';
      updateTestResultsUI(detail.execResult);
    }
  };
  window.addEventListener('prep-cockpit:tests-executed', onTestsExecuted);

  // Reactive listener for WebMCP hint reveal
  const onHintRevealed = (e: any) => {
    const detail = e.detail;
    if (detail && detail.problemId === activeProblem.id && detail.hintsRevealed !== undefined) {
      hintsRevealed = detail.hintsRevealed;
      updateHintsUI();
    }
  };
  window.addEventListener('prep-cockpit:hint-revealed', onHintRevealed);

  // Listen for Scorecard Event
  const onScorecard = (e: any) => {
    const data = e.detail;
    showScorecardModal(
      data,
      () => {
        onNavigateProblem('course-schedule');
      },
      () => {
        onNavigateDashboard();
      }
    );
  };
  window.addEventListener('prep-cockpit:scorecard', onScorecard);

  activeCleanupListeners = () => {
    window.removeEventListener('prep-cockpit:tests-executed', onTestsExecuted);
    window.removeEventListener('prep-cockpit:hint-revealed', onHintRevealed);
    window.removeEventListener('prep-cockpit:scorecard', onScorecard);
    drawer.destroy();
  };

  // Initialize Monaco Editor
  const editorContainer = container.querySelector('#monaco-editor-container') as HTMLElement;
  await initEditor(
    editorContainer,
    initialCode,
    () => {
      handleRunTests();
    },
    async (newCode) => {
      // Save code
      const prog: ProblemProgress = (await getProgress(activeProblem.id)) || {
        problemId: activeProblem.id,
        status: 'unattempted',
        solveCount: 0,
        failCount: 0,
        sm2IntervalDays: 1,
        sm2Repetitions: 0,
        sm2EaseFactor: 2.5
      };
      prog.savedCode = newCode;
      await saveProgress(prog);

      // Check if code changed from last tested code
      const isDirty = newCode !== lastTestedCode;
      const dirtyCue = container.querySelector('#editor-dirty-cue') as HTMLElement;
      if (dirtyCue) {
        dirtyCue.style.display = isDirty ? 'flex' : 'none';
      }
      setClientState({ editorDirty: isDirty });
    }
  );

  // Bind Pair Guide prompt clicks & live activity feed
  bindGuidePromptClicks(container);
  activeUnsubscribeActivity = initLiveActivityFeed(container, { problemId: problem.id, maxItems: 6 });

  // Bind Dirty Cue Copy Prompt Button
  container.querySelectorAll('.dirty-cue-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const promptText = btn.getAttribute('data-copy-prompt');
      if (promptText) {
        copyPromptToClipboard(promptText, btn as HTMLElement);
      }
    });
  });

  // Event Listeners
  container.querySelector('#btn-header-pair-ws')?.addEventListener('click', () => {
    drawer.open('prompts');
  });

  container.querySelector('#btn-back-dashboard')?.addEventListener('click', () => {
    if (activeCleanupListeners) activeCleanupListeners();
    onNavigateDashboard();
  });
  container.querySelector('#workspace-brand')?.addEventListener('click', () => {
    if (activeCleanupListeners) activeCleanupListeners();
    onNavigateDashboard();
  });
  container.querySelector('#btn-run-tests')?.addEventListener('click', handleRunTests);
  container.querySelector('#btn-submit')?.addEventListener('click', handleSubmitSolution);

  container.querySelector('#btn-reset-code')?.addEventListener('click', () => {
    if (confirm('Reset code to starter template?')) {
      setEditorValue(activeProblem.starterCode);
      lastTestedCode = activeProblem.starterCode;
      const dirtyCue = container.querySelector('#editor-dirty-cue') as HTMLElement;
      if (dirtyCue) dirtyCue.style.display = 'none';
      setClientState({ editorDirty: false });
      showToast('Code reset to starter template', 'info');
    }
  });

  container.querySelector('#btn-reveal-hint')?.addEventListener('click', () => {
    if (hintsRevealed < activeProblem.hints.length) {
      hintsRevealed++;
      setClientState({ hintsRevealed });
      updateHintsUI();

      addActivityEvent({
        actor: 'user',
        type: 'hint_provided',
        summary: `You revealed Hint ${hintsRevealed}`,
        problemId: activeProblem.id,
        problemTitle: activeProblem.title,
        metadata: {
          hintLevel: hintsRevealed
        }
      });

      showToast(`Hint ${hintsRevealed} revealed`, 'info');
    }
  });

  // Tab clicks on initial load for test cases
  container.querySelectorAll('.tc-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const idx = Number(tab.getAttribute('data-index'));
      activeTestCaseIndex = idx;
      container.querySelectorAll('.tc-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderSelectedTestCase();
    });
  });
}

function renderHintsHtml(problem: Problem, revealedCount: number): string {
  if (revealedCount === 0) {
    return `<div style="color: var(--text-dim); font-size: 11px; font-family: var(--font-mono);">Click "Reveal Hint" to get progressive Socratic clues without spoiling the solution.</div>`;
  }

  const levelTitles = [
    'Level 1: High-Level Intuition',
    'Level 2: Data Structure Strategy',
    'Level 3: Implementation Detail'
  ];

  let html = '';
  for (let i = 0; i < revealedCount; i++) {
    const hint = problem.hints[i] || 'Examine constraints and edge cases.';
    html += `
      <div class="hint-item">
        <span class="hint-level-tag">${levelTitles[i] || `Level ${i + 1}`}</span>
        <div class="hint-text">${hint}</div>
        ${i === 1 && problem.keyInsight ? `<div style="color: var(--green); font-size: 11px; font-family: var(--font-mono); margin-top: 4px;"><strong>Key Insight:</strong> ${problem.keyInsight}</div>` : ''}
      </div>
    `;
  }
  return html;
}

function formatTestCaseValue(val: any): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);

  if (Array.isArray(val)) {
    return JSON.stringify(val).replace(/,/g, ', ');
  }

  return JSON.stringify(val);
}

function formatTestCaseInput(input: Record<string, any>): string {
  if (!input || typeof input !== 'object') return String(input);
  const entries = Object.entries(input);
  if (entries.length === 0) return '{}';
  return entries
    .map(([paramName, val]) => `${paramName} = ${formatTestCaseValue(val)}`)
    .join(', ');
}

function renderTestCaseDetail(tc: any, res: any): string {
  const inputStr = formatTestCaseInput(tc.input);
  const expectedStr = formatTestCaseValue(tc.expected);
  const actualStr = res ? formatTestCaseValue(res.actual) : 'Not run yet';
  const logsStr = res?.logs && res.logs.length > 0 ? res.logs.join('\n') : null;

  return `
    <div class="tc-detail-box">
      <div class="tc-field">
        <span class="tc-field-label">Input</span>
        <div class="tc-field-val">${inputStr}</div>
      </div>
      <div class="tc-field">
        <span class="tc-field-label">Expected Output</span>
        <div class="tc-field-val">${expectedStr}</div>
      </div>
      <div class="tc-field">
        <span class="tc-field-label">Actual Output ${res ? (res.passed ? '<span style="color: var(--green); font-weight: 600;">(Passed)</span>' : '<span style="color: var(--red); font-weight: 600;">(Failed)</span>') : ''}</span>
        <div class="tc-field-val" style="color: ${res ? (res.passed ? 'var(--green)' : 'var(--red)') : 'var(--text-dim)'};">${actualStr}</div>
      </div>
      ${
        res?.error
          ? `
        <div class="tc-field">
          <span class="tc-field-label" style="color: var(--red);">Error Message</span>
          <div class="tc-field-val" style="color: var(--red);">${res.error}</div>
        </div>
      `
          : ''
      }
      ${
        logsStr
          ? `
        <div class="tc-field">
          <span class="tc-field-label">Console Logs</span>
          <div class="tc-field-val" style="color: var(--text-muted);">${logsStr}</div>
        </div>
      `
          : ''
      }
    </div>
  `;
}
