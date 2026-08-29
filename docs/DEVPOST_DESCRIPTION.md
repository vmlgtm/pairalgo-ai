# PairAlgo.ai — WebMCP Algorithm & Interview Workspace

## Inspiration

When practicing coding interview problems, asking an LLM for help usually fails in two ways:
1. **Hallucination**: The model claims broken code "looks correct" because it cannot actually execute the code or evaluate edge cases.
2. **Solution Dumping**: You ask for a subtle nudge, and it immediately dumps the full optimal solution, spoiling the problem.

Most browser AI agents try to interact with web apps by taking screenshots and scraping the DOM. This is slow, fragile, and lacks structured context.

With **WebMCP (Web Model Context Protocol)**, the web app exposes typed execution tools (`run_tests`, `get_hint`, `get_recommendation`) and pushes live state (`clientState`) directly to the agent. Code executes in an isolated in-browser Web Worker, giving the agent deterministic test results so it can act as a reliable pair programming coach.

---

## What It Does

PairAlgo.ai is an in-browser algorithm workspace built for WebMCP. It allows browser agents (ChatGPT in-app browser, Chrome with WebMCP enabled) to inspect editor state, execute code deterministically, and provide progressive hints.

### 1. Ambient State Synchronization (`setClientState`)
The app continuously syncs session state to the agent via `navigator.tools.setClientState()`:
- Active problem ID, difficulty, and target time
- Test pass count (e.g. `3/5 passing`)
- Hints revealed count (Levels 1–3)
- Current interview readiness score and streak

The agent knows what the user is working on and whether tests pass without repetitive prompt questions.

### 2. Six Typed WebMCP Tools
The app registers 6 typed tools via `navigator.tools.register()` (with `document.modelContext` fallback):
- `get_recommendation`: Returns the optimal next problem based on category skill gaps, interview frequency weights, and SM-2 review schedules.
- `start_problem`: Loads the problem starter code into Monaco and resets the timer.
- `run_tests`: Executes editor code in an isolated Web Worker sandbox and returns structured pass/fail JSON diffs, timing, and console logs.
- `get_hint`: Returns 3 tiers of hints (Level 1: Intuition → Level 2: Data Structure → Level 3: Implementation Detail) so the agent guides without spoiling.
- `submit_solution`: Validates the full test suite, logs the attempt in IndexedDB, and updates SM-2 repetition schedules.
- `get_skill_profile`: Returns the user's readiness score, streak, and per-category breakdown.

### 3. Deterministic Scoring Engine
Readiness is calculated purely from IndexedDB attempt logs:
$$\text{Readiness} = 0.40 \times \text{PatternStrength} + 0.25 \times \text{Retention} + 0.20 \times \text{Speed} + 0.15 \times \text{Independence}$$

---

## How It Works in Practice

1. **Recommendation**: The user asks what to study. The agent calls `get_recommendation({ set: 'core-75' })`, which finds an unpracticed high-weight category (e.g. Graphs) and returns `course-schedule`.
2. **Context Setup**: The agent calls `start_problem({ problemId: 'course-schedule' })`, loading the starter code into Monaco.
3. **Execution & Coaching**: The user writes a BFS cycle detection solution and asks why it fails. The agent calls `run_tests()`, inspects the failing assertion, and calls `get_hint({ level: 2 })` to guide the user on in-degrees without revealing the solution.
4. **Submission**: Once all tests pass, the agent calls `submit_solution()`, updating the user's progress and SM-2 review dates in IndexedDB.

---

## How We Built It

- **Frontend & Editor**: Vite, TypeScript, and `@monaco-editor/loader` with `Ctrl+S` / `Cmd+S` instant testing.
- **Web Worker Sandbox**: Runs untrusted code inside a Web Worker using `new Function()` with a 2500ms timeout guard to prevent infinite loops.
- **Data Structure Serialization**: Custom BFS serializers and deserializers (`arrayToList`, `listToArray`, `arrayToTree`, `treeToArray`) with cycle detection, allowing `ListNode` and `TreeNode` problems to run across worker boundaries.
- **Storage**: IndexedDB (via `idb`) for offline persistence of 150 challenges, attempt histories, notes, and SM-2 review intervals.
- **WebMCP Evals**: Built an automated eval suite (`evals/webmcp-evals.json` and `tests/evals.test.ts`) to verify tool-calling accuracy across 6 core intents.
- **Demo Mode**: `?demo=true` pre-populates IndexedDB with 52 completed problems, a 66% readiness score, and active practice history for rapid evaluation.

---

## Challenges We Ran Into

1. **WebMCP API Fragmentation**: WebMCP implementations vary across browser builds. We built an adapter supporting `navigator.tools`, `document.modelContext`, and a `window.__webmcp_tools` test harness.
2. **Worker Boundary Serialization**: Standard `postMessage` cannot transfer circular object references. We built dedicated BFS tree/list serializers and deep-equality assertions.
3. **Structuring Tool Payloads**: Instead of wrapping UI buttons, tools return raw structured data (assertion diffs, hint levels, gap weights), allowing the model to reason about code rather than parse raw text.

---

## Accomplishments

- **Deterministic Sandbox**: Actual in-browser code execution—zero hallucinated test passes.
- **Sub-10ms Feedback**: Tests run locally with zero network round-trips.
- **150 Real Problems**: Complete bank of 150 algorithm challenges across 18 patterns with verified test cases and 3-level hints.
- **100% Client-Side**: No backend servers, zero database costs, works fully offline.

---

## What's Next

- **Multi-Language Sandboxes**: In-browser Python (Pyodide) and Go (WASM) execution.
- **Visual Traversal Debugger**: Interactive step-through animation for graph/tree traversals wired to WebMCP inspection tools.
- **Timed Mock Interviews**: Agent-conducted 45-minute timed sessions with follow-up complexity questions.
