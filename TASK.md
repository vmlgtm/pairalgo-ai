# Agent Handoff: Make the ChatGPT Pair-Programming Flow Feel Continuous

## Context

PairAlgo's WebMCP integration is now working end-to-end in ChatGPT's in-app browser with GPT-5.6 Terra:

- all six tools are discovered;
- `get_skill_profile` and `get_recommendation` return structured data;
- `start_problem`, `run_tests`, and `get_hint` work against the active editor state.

The remaining problem is UX, not tool registration. A user writes code in the PairAlgo Monaco editor while the ChatGPT conversation lives outside the page. The product currently has no clear handoff, shared activity history, or guidance for when to ask ChatGPT to act.

Reference captures:

- `audit-artifacts/01-dashboard.png`
- `audit-artifacts/02-workspace.png`

## Goal

Make the human + ChatGPT loop obvious and continuous:

1. ChatGPT recommends a problem.
2. The user starts it and writes code in PairAlgo.
3. The user can immediately see when and how to ask ChatGPT to test, explain a failure, or provide a hint.
4. PairAlgo visibly reflects the agent actions and results.

Do this without auto-submitting solutions or silently sending editor code to the agent.

## Issues To Fix

### P0 — No onboarding into the ChatGPT workflow

The dashboard only says `WebMCP Ready`. It does not tell a first-time user:

- that they should use ChatGPT's in-app browser;
- what to ask first;
- that ChatGPT can start the recommended challenge and later test the code in the editor.

### P0 — The coding and ChatGPT surfaces feel disconnected

The workspace says `WebMCP Ambient Agent Connected`, but there is no visible evidence of what the agent did. After ChatGPT starts a problem, runs tests, or returns a hint, the user cannot see an in-app timeline of those events.

### P1 — No clear "latest editor code" handoff

The user can edit code, but the page does not guide them to ask ChatGPT to run the latest code. ChatGPT only receives the current editor content when it explicitly calls `run_tests()` or `submit_solution()`.

## Required Changes

### 1. Add a compact `Pair with ChatGPT` guide

Add a visible, non-intrusive guide:

- On the dashboard, place it near the recommended challenge.
- In the workspace, place it in the left information panel or as a collapsible panel.

It should explain the real workflow in plain language:

> Write your solution in the editor. Then ask ChatGPT to run your latest code, explain a failing test, or give a progressive hint.

Include suggested prompts that are easy to copy:

- `What should I practice today?`
- `Start the recommended problem.`
- `Run my latest code and explain any failing test.`
- `Give me hint 1 without revealing the solution.`

Do not imply that PairAlgo embeds ChatGPT or that typing in the editor automatically sends code anywhere.

### 2. Add an in-app agent activity feed

Create a small chronological activity feed showing meaningful WebMCP events. It should be scoped to the active problem when applicable.

Record and render concise entries for:

- recommendation returned;
- problem started;
- tests run, including pass count and duration;
- hint returned, including hint level;
- solution submitted, including pass/fail outcome.

Example entries:

- `ChatGPT recommended Invert Binary Tree — 1 day overdue review`
- `ChatGPT started Invert Binary Tree`
- `ChatGPT ran tests — 0/1 passing`
- `ChatGPT provided Hint 1`

Requirements:

- newest entry is easy to scan;
- show timestamps or relative time;
- empty state explains that the feed fills when ChatGPT uses PairAlgo tools;
- avoid logging full editor code, test inputs, or private user notes.

### 3. Add a clear "run latest code" cue in the workspace

When the editor becomes dirty after a test run, show a subtle cue near the existing `Run Tests` control or the new guide:

> Code changed since the last test. Ask ChatGPT to run your latest code.

This is guidance only. Do not auto-run tests and do not automatically transmit code.

The existing local `Run Tests` button and `Cmd/Ctrl+S` behavior must continue working.

### 4. Make the WebMCP state intentional

Extend the app's local state as needed to represent:

- active problem;
- latest test summary;
- editor dirty/clean status;
- hints used;
- recent agent activity events.

Keep the raw editor code out of general ambient client state. `run_tests` and `submit_solution` may continue reading current editor code only when those tools are explicitly invoked.

## Suggested Implementation Direction

- Keep WebMCP tool contracts unchanged unless a UI need requires a backward-compatible additive field.
- Add a small typed activity-event store near `src/webmcp/state.ts`.
- Record events inside the existing WebMCP tools (`getRecommendation`, `startProblem`, `runTests`, `getHint`, and `submitSolution`) after successful execution.
- Connect Monaco's change callback to a local `editorDirty` state. Reset it when tests run against the current editor content.
- Build the UI from existing visual language: dark surface, compact cards, monospace metadata, green success accents.
- Ensure the activity feed works whether the action came from WebMCP or from the existing in-page buttons where sensible; clearly label only agent-originated actions as `ChatGPT`.

## Acceptance Criteria

### Product flow

1. A first-time dashboard user can see what to ask ChatGPT and understands that coding happens in PairAlgo's editor.
2. After ChatGPT calls `start_problem`, the workspace shows an activity entry for the selected challenge.
3. After ChatGPT calls `run_tests`, the page shows a concise result such as `0/1 passing` and the activity feed updates.
4. After ChatGPT calls `get_hint({ level: 1 })`, the page visibly reflects that Hint 1 was provided.
5. Editing code after a test run reveals the "latest code" cue; running tests clears it.
6. The user can still use the normal page buttons and keyboard shortcut without regression.

### WebMCP and privacy

1. GPT-5.6 Terra in ChatGPT's in-app browser still discovers all six WebMCP tools.
2. `run_tests()` with no `code` argument tests the current Monaco editor content.
3. Editing code does not automatically expose or transmit the full code to ChatGPT.
4. `submit_solution` remains the only action that records a completion attempt; do not call it during normal UI testing.

### Engineering quality

1. Add/extend unit tests for the event store and editor-dirty transitions.
2. Preserve existing WebMCP registration tests and all existing tests.
3. Run `npm test` and `npm run build` before handoff.

## Non-Goals

- Do not build an embedded ChatGPT clone or a backend chat service.
- Do not auto-run tests on every keystroke.
- Do not auto-submit solutions.
- Do not add automatic full-code synchronization into ambient WebMCP state.

## Manual QA Script

Use the deployed app in ChatGPT's in-app browser with GPT-5.6 Terra:

1. Open `https://pairalgo-ai.vercel.app/?demo=true`.
2. Ask: `What should I practice today?`
3. Ask: `Start it.`
4. Confirm the workspace and agent activity feed identify the selected challenge.
5. Edit the starter code in Monaco.
6. Ask: `Run my latest code and explain the failure.`
7. Confirm test result, activity entry, and dirty-state cue behavior.
8. Ask: `Give me hint 1 without the solution.`
9. Confirm the hint appears and the activity feed records it.
