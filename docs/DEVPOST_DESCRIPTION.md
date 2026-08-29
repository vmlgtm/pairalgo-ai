# PairAlgo.ai — WebMCP Algorithm & Interview Workspace

## Inspiration

I’ve been preparing for staff-level engineering rounds recently, and my daily routine was frustrating: I'd solve a problem in my editor, switch to ChatGPT for a code review or a nudge, and get back either a hallucinated confirmation that my code "looks good" (when an edge case failed) or a full solution dump when I just needed a subtle hint.

Most browser AI agents today try to interact with web apps via visual actuation and DOM scraping—taking screenshots, clicking around, and hoping classes didn't change. It's slow and fragile.

When I saw the WebMCP specification, the value was immediately clear. Instead of an agent guessing what’s on screen, the web app can expose typed tools (`run_tests`, `get_hint`, `get_recommendation`) and stream live state (`clientState`). Code executes inside a sandboxed Web Worker in the browser—the agent gets real JSON test outputs, and the user gets a pair programming coach that relies on deterministic execution instead of hallucinations.

---

## What it does

PairAlgo.ai is an algorithm workspace that exposes structured WebMCP tools directly to AI agents (like ChatGPT’s in-app browser or Chrome with WebMCP enabled).

### 1. Direct Workspace (Human Mode)
- **150 curated challenges** across 18 core patterns (Arrays, Two Pointers, Graphs, Trees, 1D/2D DP, etc.) with verified test cases.
- **Monaco Editor** with TypeScript support.
- **Instant testing**: Press `Ctrl+S` / `Cmd+S` to run your solution against test cases in an in-browser Web Worker in under 10ms. No server round-trip, works offline.
- **Transparent scoring**: Readiness, pattern confidence, SM-2 spaced repetition intervals, and daily streaks are derived purely from local attempt logs.

### 2. Agent-Assisted Workspace (WebMCP Mode)
The app registers 6 typed tools via `navigator.tools.register()`:
- `get_recommendation`: Finds the user's biggest skill gaps using pattern frequency weights and SM-2 review schedules, then returns the optimal next challenge.
- `start_problem`: Loads the problem starter code into Monaco and starts the session timer.
- `run_tests`: Executes the current editor code against the test suite in the Web Worker sandbox and returns pass/fail diffs.
- `get_hint`: Returns tiered Socratic hints (Level 1: intuition $\rightarrow$ Level 2: data structure $\rightarrow$ Level 3: implementation detail).
- `submit_solution`: Validates the full test suite, logs the attempt in IndexedDB, and updates the skill graph.
- `get_skill_profile`: Returns the overall readiness score, streak, and per-pattern breakdown.

It also syncs ambient context to the agent via `navigator.tools.setClientState()`. The agent always knows which problem is active, time elapsed, tests passing, and hints revealed without having to ask.

### Readiness Formula
$$\text{Readiness} = 0.40 \times \text{PatternStrength} + 0.25 \times \text{Retention} + 0.20 \times \text{Speed} + 0.15 \times \text{Independence}$$

---

## How we built it

- **Frontend & Editor**: Vite, TypeScript, and `@monaco-editor/loader`.
- **Execution Sandbox**: An isolated Web Worker running `new Function()` with a 2000ms execution timeout. Built custom BFS serializers and deserializers for `ListNode` and `TreeNode` so standard linked list and binary tree problems run natively in-browser.
- **Storage**: IndexedDB (via `idb`) for offline-first persistence of attempt logs, custom problem notes, and skill graphs.
- **WebMCP Integration**: Registered tool schemas with input/output validation, added ambient state sync, and included fallback checks for `document.modelContext`.
- **Demo Mode**: Added a `?demo=true` query parameter that pre-populates IndexedDB with 47 completed problems, a 74% readiness score, and a 5-day streak so evaluators and judges can test agent flows immediately.

---

## Challenges we ran into

1. **WebMCP API variations**: The standard is experimental. We had to support multiple potential namespace implementations (`navigator.tools` vs `document.modelContext`) and ensure the entire app functions smoothly as a standalone tool when WebMCP isn't supported.
2. **Serializing data structures across worker boundaries**: Standard `postMessage` calls can't serialize cyclical linked lists or tree object references directly. We wrote dedicated serialization helpers (`arrayToList`, `listToArray`, `arrayToTree`, `treeToArray`) and structural deep-equality assertions.
3. **Designing non-trivial tool interactions**: We avoided making WebMCP tools simple button-click wrappers. Instead, tools return raw structured data (test diffs, hint tiers, skill gap weights), letting the LLM do what it's actually good at—explaining *why* a BFS cycle check failed or nudging the user without spoiling the solution.

---

## Accomplishments that we're proud of

- **Deterministic testing**: Test evaluations come from actual code execution in a sandbox, not LLM guesses.
- **Sub-10ms feedback**: Zero network latency. `Ctrl+S` runs tests immediately in a background worker.
- **150 real problems**: A complete bank of 150 algorithm challenges with test cases, complexity targets, and progressive hints—not just 2 or 3 hardcoded demos.
- **Progressive enhancement**: The app is genuinely useful as a clean, fast standalone practice tool. WebMCP makes it better, but isn't a fragile hard requirement.

---

## What we learned

- **Ambient state is just as important as tools**: Registering tools is standard, but `setClientState()` is what makes the interaction feel like pair programming. When the agent already knows your active problem and failing test count, conversations are focused rather than repetitive.
- **Browser-side compute is capable**: Web Workers + IndexedDB + Monaco provide a full coding and testing environment with zero backend infrastructure or hosting costs.

---

## What's next for PairAlgo.ai

- **Multi-language sandbox**: Adding in-browser Python (Pyodide) and Go (WASM) execution.
- **Visual algorithm debugger**: Interactive step-through visualizer for tree/graph traversals linked to WebMCP inspection tools.
- **Mock interview mode**: An agent-driven mode that conducts timed 45-minute interviews with follow-up optimization questions and behavioral follow-through.
