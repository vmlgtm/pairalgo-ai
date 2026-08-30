import { getProblem, getProgress, saveProgress } from '../engine/db';
import { runTests as executeSandbox } from '../runner/runner';
import { submitSolutionTool } from '../webmcp/tools/submitSolution';
import { initEditor, setEditorValue, getEditorValue, disposeEditor } from './editor';
import { setClientState } from '../webmcp/state';
import { getWebMCPStatus } from '../webmcp/register';
import { showScorecardModal } from './modal';
import { showToast } from './toast';
import type { Problem, ProblemProgress, ExecutionResult } from '../engine/types';

let timerInterval: any = null;

export async function renderWorkspace(
  container: HTMLElement,
  problemId: string,
  onNavigateDashboard: () => void,
  onNavigateProblem: (nextId: string) => void
): Promise<void> {
  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  disposeEditor();

  const problem = await getProblem(problemId);
  if (!problem) {
    showToast(`Problem "${problemId}" not found.`, 'error');
    onNavigateDashboard();
    return;
  }

  const activeProblem: Problem = problem;

  const existingProgress = await getProgress(problem.id);
  const initialCode = existingProgress?.savedCode || problem.starterCode;
  let hintsRevealed = existingProgress?.lastHintsUsed || 0;
  let remainingSeconds = problem.timeLimitMinutes * 60;
  let lastExecutionResult: ExecutionResult | null = null;
  let activeTestCaseIndex = 0;

  // Set ambient client state
  setClientState({
    view: 'workspace',
    activeProblemId: problem.id,
    timeRemainingSeconds: remainingSeconds,
    testsPassed: 0,
    testsTotal: problem.testCases.length,
    hintsRevealed
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
        <div>
          <span class="brand-title">PAIRALGO.AI</span>
          <span class="brand-subtitle">AI Pair Cockpit • WebMCP</span>
        </div>
      </div>

      <div class="header-stats">
        <button id="btn-back-dashboard" class="secondary">
          ← Dashboard
        </button>
        ${
          getWebMCPStatus() === 'failed'
            ? `<div class="webmcp-indicator" style="color: var(--red); border-color: var(--red-dim); background: #200202;">
                <div class="dot" style="background: var(--red); box-shadow: 0 0 8px var(--red);"></div>
                <span>WebMCP Failed</span>
              </div>`
            : `<div class="webmcp-indicator">
                <div class="dot"></div>
                <span>WebMCP Ambient Agent Connected</span>
              </div>`
        }
      </div>
    </header>

    <div class="workspace-container">
      <!-- Left Panel: Problem Spec & Test Runner -->
      <div class="workspace-left-panel">
        <div class="workspace-header">
          <div class="workspace-title-group">
            <span class="workspace-title">${problem.title}</span>
            <span class="badge ${problem.difficulty}">${problem.difficulty}</span>
            <span class="badge">${problem.category}</span>
          </div>

          <div id="timer-display" class="timer-pill">
            ⏱ <span>${formatTimer(remainingSeconds)}</span>
          </div>
        </div>

        <div class="workspace-content">
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

          <!-- Socratic Hints Drawer -->
          <div class="hints-container">
            <div class="hints-header">
              <span class="hints-header-title">💡 Socratic Hints (${hintsRevealed}/${problem.hints.length})</span>
              ${
                hintsRevealed < problem.hints.length
                  ? `<button id="btn-reveal-hint" class="secondary" style="padding: 3px 8px; font-size: 11px;">
                      Reveal Hint ${hintsRevealed + 1}
                    </button>`
                  : `<span style="font-size: 11px; color: var(--green);">All Hints Revealed</span>`
              }
            </div>
            <div id="hints-body" style="display: flex; flex-direction: column; gap: 8px;">
              ${renderHintsHtml(problem, hintsRevealed)}
            </div>
          </div>

          <!-- Declarative HTML WebMCP Notes Scratchpad -->
          <div class="notes-container">
            <span class="notes-label">📝 Notes & Complexity Scratchpad (WebMCP Annotated)</span>
            <form id="notes-form" data-model-context="problem_notes">
              <textarea
                name="notes"
                id="notes-textarea"
                class="notes-textarea"
                placeholder="Write your approach, invariants, edge cases, and time/space complexity notes here..."
              >${existingProgress?.savedNotes || ''}</textarea>
            </form>
          </div>

          <!-- Test Cases Runner Output -->
          <div class="test-results-panel">
            <div class="test-results-header">
              <span id="test-results-title">Test Cases (${problem.testCases.length})</span>
              <span id="test-results-meta" style="color: var(--text-dim);">Press Cmd+S to run</span>
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
      </div>

      <!-- Right Panel: Monaco Editor & Controls -->
      <div class="workspace-right-panel">
        <div class="editor-top-bar">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>TypeScript Sandbox</span>
            <span class="editor-hint">• Cmd+S / Ctrl+S to run</span>
          </div>
          <button id="btn-reset-code" class="secondary" style="padding: 2px 8px; font-size: 11px;">
            ↺ Reset Code
          </button>
        </div>

        <div id="monaco-editor-container" class="monaco-container"></div>

        <div class="editor-bottom-bar">
          <div id="editor-status" class="editor-status-text">
            Ready to test
          </div>
          <div style="display: flex; gap: 10px;">
            <button id="btn-run-tests" class="secondary" style="font-weight: 600;">
              ▶ Run Tests (Cmd+S)
            </button>
            <button id="btn-submit" class="success">
              ✓ Submit Solution
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

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
    if (hintsBody) hintsBody.innerHTML = renderHintsHtml(activeProblem, hintsRevealed);
    if (headerTitle) headerTitle.innerHTML = `💡 Socratic Hints (${hintsRevealed}/${activeProblem.hints.length})`;

    const revealBtn = container.querySelector('#btn-reveal-hint');
    if (revealBtn) {
      if (hintsRevealed < activeProblem.hints.length) {
        revealBtn.innerHTML = `Reveal Hint ${hintsRevealed + 1}`;
      } else {
        revealBtn.parentElement!.innerHTML = `
          <span class="hints-header-title">💡 Socratic Hints (${hintsRevealed}/${activeProblem.hints.length})</span>
          <span style="font-size: 11px; color: var(--green);">All Hints Revealed</span>
        `;
      }
    }
  }

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

  // Runner Function
  const handleRunTests = async () => {
    const code = getEditorValue();
    const statusEl = container.querySelector('#editor-status') as HTMLElement;
    const resultsMeta = container.querySelector('#test-results-meta') as HTMLElement;

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
    lastExecutionResult = result;

    // Update ambient state
    setClientState({
      testsPassed: result.passedCount,
      testsTotal: result.totalCount
    });

    // Update status text
    if (result.error) {
      if (statusEl) statusEl.innerHTML = `<span style="color: var(--red);">Error: ${result.error}</span>`;
      if (resultsMeta) resultsMeta.innerHTML = `<span style="color: var(--red);">Execution Error</span>`;
      showToast(result.error, 'error');
    } else if (result.allPassed) {
      if (statusEl) statusEl.innerHTML = `<span style="color: var(--green);">✓ All ${result.passedCount}/${result.totalCount} Tests Passed (${result.totalTimeMs}ms)</span>`;
      if (resultsMeta) resultsMeta.innerHTML = `<span style="color: var(--green);">${result.passedCount}/${result.totalCount} Passed (${result.totalTimeMs}ms)</span>`;
      showToast(`All ${result.passedCount} tests passed!`, 'success');
    } else {
      if (statusEl) statusEl.innerHTML = `<span style="color: var(--red);">✕ ${result.passedCount}/${result.totalCount} Tests Passed</span>`;
      if (resultsMeta) resultsMeta.innerHTML = `<span style="color: var(--red);">${result.passedCount}/${result.totalCount} Passed</span>`;
      showToast(`${result.totalCount - result.passedCount} tests failed`, 'warning');
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
  };

  const renderSelectedTestCase = () => {
    const detailContainer = container.querySelector('#tc-detail-container');
    if (!detailContainer) return;
    const tc = activeProblem.testCases[activeTestCaseIndex];
    const res = lastExecutionResult?.results.find(r => r.testIndex === activeTestCaseIndex) || null;
    detailContainer.innerHTML = renderTestCaseDetail(tc, res);
  };

  // Submit Solution Function
  const handleSubmitSolution = async () => {
    const code = getEditorValue();
    const timeSpent = activeProblem.timeLimitMinutes * 60 - remainingSeconds;
    const res = await submitSolutionTool.execute({
      problemId: activeProblem.id,
      code,
      timeSpentSeconds: timeSpent
    });

    if (!res.passed) {
      showToast('Cannot submit: One or more test cases failed.', 'error');
      handleRunTests();
    }
  };

  // Listen for Scorecard Event
  const onScorecard = (e: any) => {
    const data = e.detail;
    showScorecardModal(
      data,
      () => {
        // Next problem
        onNavigateProblem('course-schedule');
      },
      () => {
        onNavigateDashboard();
      }
    );
  };
  window.addEventListener('prep-cockpit:scorecard', onScorecard);

  // Initialize Monaco Editor
  const editorContainer = container.querySelector('#monaco-editor-container') as HTMLElement;
  await initEditor(
    editorContainer,
    initialCode,
    () => {
      handleRunTests();
    },
    async (newCode) => {
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
    }
  );

  // Event Listeners
  container.querySelector('#btn-back-dashboard')?.addEventListener('click', onNavigateDashboard);
  container.querySelector('#workspace-brand')?.addEventListener('click', onNavigateDashboard);
  container.querySelector('#btn-run-tests')?.addEventListener('click', handleRunTests);
  container.querySelector('#btn-submit')?.addEventListener('click', handleSubmitSolution);

  container.querySelector('#btn-reset-code')?.addEventListener('click', () => {
    if (confirm('Reset code to starter template?')) {
      setEditorValue(activeProblem.starterCode);
      showToast('Code reset to starter template', 'info');
    }
  });

  container.querySelector('#btn-reveal-hint')?.addEventListener('click', () => {
    if (hintsRevealed < activeProblem.hints.length) {
      hintsRevealed++;
      setClientState({ hintsRevealed });
      updateHintsUI();
      showToast(`Hint ${hintsRevealed} revealed`, 'info');
    }
  });

  // Tab clicks on initial load
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
    return `<div style="color: var(--text-dim); font-size: 12px; font-family: var(--font-mono);">Click "Reveal Hint" to get progressive Socratic clues without spoiling the solution.</div>`;
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

function renderTestCaseDetail(tc: any, res: any): string {
  const inputStr = JSON.stringify(tc.input, null, 2);
  const expectedStr = JSON.stringify(tc.expected, null, 2);
  const actualStr = res ? JSON.stringify(res.actual, null, 2) : 'Not run yet';
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
        <span class="tc-field-label">Actual Output ${res ? (res.passed ? '<span style="color: var(--green);">(Passed)</span>' : '<span style="color: var(--red);">(Failed)</span>') : ''}</span>
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
