# Implementation Plan: Prep Cockpit (AI-Native WebMCP Workspace)

> **Repository Location**: `/Users/vaibhavmisra/Projects/open-source/prep-cockpit`  
> **Target Event**: OpenAI WebMCP Challenge (Deadline: September 3, 2026)  
> **Target Deploy**: Vercel / Cloudflare Pages (Zero backend, Client-side PWA + IndexedDB)  
> **Core Theme**: Minimal, High-Contrast Monochrome (MacBook Air M1 optimized)  

---

## 1. Executive Summary & Purpose

**Prep Cockpit** is an open-source, client-side developer workspace designed to bridge human coding practice with AI agent coaching via the **WebMCP (Web Model Context Protocol)** standard.

Instead of an AI agent blindly scraping the DOM or guessing button clicks, Prep Cockpit exposes **structured, typed WebMCP tools and client state** directly to browser-native agents (ChatGPT in-app browser, Google Chrome with WebMCP flags). All code execution is securely handled in-browser via a sandboxed Web Worker, and all progress tracking is deterministically calculated and persisted locally in IndexedDB.

---

## 2. Technical Architecture & Data Flow

```mermaid
flowchart TB
    subgraph BrowserAgent["AI Agent (ChatGPT / Chrome WebMCP)"]
        Agent[LLM Agent]
        Context[Ambient Client State]
    end

    subgraph WebMCPProtocol["WebMCP Protocol Layer"]
        Reg["navigator.tools.register()"]
        State["navigator.tools.setClientState()"]
        Decl["Declarative HTML Annotations"]
    end

    subgraph AppCore["Prep Cockpit Core Application"]
        MainRouter[App Controller & State Router]
        DashboardUI[Monochrome Dashboard UI]
        WorkspaceUI[Split-Pane Monaco Workspace]
        Engine[Deterministic Scoring & Spaced Repetition]
        IDB[(IndexedDB Storage)]
    end

    subgraph ExecutionSandbox["Web Worker Isolation"]
        Worker[Web Worker Sandbox]
        DSHelpers[ListNode / TreeNode Serializer]
        Runner[new Function() Execution + 2000ms Timeout Guard]
    end

    Agent <--> Reg
    Context <--> State
    Agent <--> Decl
    Reg <--> MainRouter
    State <--> MainRouter
    MainRouter <--> DashboardUI
    MainRouter <--> WorkspaceUI
    MainRouter <--> Engine
    Engine <--> IDB
    WorkspaceUI --> Runner
    Runner --> Worker
    Worker --> DSHelpers
```

### Key Architectural Tenets
1. **Deterministic Verification**: Test results, pattern confidence, SM-2 intervals, and streaks are purely mathematical. No LLM hallucinations in scoring.
2. **Zero Backend**: 100% client-side (Static Vite bundle + IndexedDB + Web Workers). Fast, offline-first, zero operational cost.
3. **Dual-Mode Experience**:
   - **Direct Mode**: Beautiful standalone app for humans with Monaco editor and instant `Ctrl+S` test feedback.
   - **Agent-Assisted Mode**: Rich, Socratic tutoring experience via WebMCP tool calls.
4. **Pre-Seeded Demo Mode**: `?demo=true` initializes realistic user progress (47 solved problems, 74% readiness, 5-day streak) for instant evaluation by hackathon judges.

---

## 3. Target File Structure

```
/Users/vaibhavmisra/Projects/open-source/prep-cockpit/
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── index.html
├── src/
│   ├── main.ts                       # Application entry point & router
│   ├── style.css                     # High-contrast monochrome CSS & design system
│   ├── data/
│   │   ├── categories.json           # 18 categories with frequency weights
│   │   ├── problems.json             # 150 sanitized challenges with test suites & hints
│   │   └── demo-seed.ts              # Pre-seeded progress data for ?demo=true
│   ├── engine/
│   │   ├── types.ts                  # Shared TypeScript interfaces & types
│   │   ├── db.ts                     # IndexedDB wrapper (idb) with transactions
│   │   ├── scoring.ts                # Deterministic pattern & readiness formulas
│   │   ├── spaced-repetition.ts      # SM-2 interval calculator & review queue
│   │   ├── recommend.ts              # Gap-weighted problem recommendation
│   │   └── streak.ts                 # Timestamp-based daily streak calculator
│   ├── runner/
│   │   ├── ds-helpers.ts             # ListNode & TreeNode builders / serializers
│   │   ├── worker.ts                 # Web Worker sandbox (new Function + timeout guard)
│   │   └── runner.ts                 # Main-thread Promise bridge to Web Worker
│   ├── webmcp/
│   │   ├── register.ts               # navigator.tools registration & fallback
│   │   ├── state.ts                  # navigator.tools.setClientState manager
│   │   └── tools/
│   │       ├── getRecommendation.ts  # Tool: get_recommendation
│   │       ├── startProblem.ts       # Tool: start_problem
│   │       ├── runTests.ts           # Tool: run_tests
│   │       ├── getHint.ts            # Tool: get_hint
│   │       ├── submitSolution.ts     # Tool: submit_solution
│   │       └── getSkillProfile.ts    # Tool: get_skill_profile
│   └── ui/
│       ├── dashboard.ts              # Minimalist dashboard (Today, Progress, Categories)
│       ├── workspace.ts              # Split-pane workspace (Problem specs, Monaco, Tests)
│       ├── editor.ts                 # Monaco editor integration & keybindings
│       ├── modal.ts                  # Scorecard modal & confirmation dialogs
│       └── toast.ts                  # Minimalist notification system
├── tests/
│   ├── scoring.test.ts               # Unit tests for scoring formulas
│   ├── spaced-repetition.test.ts     # Unit tests for SM-2 logic
│   ├── streak.test.ts                # Unit tests for streak calculator
│   ├── recommend.test.ts             # Unit tests for recommendation engine
│   ├── ds-helpers.test.ts            # Unit tests for ListNode/TreeNode helpers
│   └── runner.test.ts                # Unit tests for code runner sandbox
└── README.md
```

---

## 4. Detailed Component Specifications

### 4.1. Core Engine & Data Models (`src/engine/types.ts`)

```typescript
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ParamDefinition {
  name: string;
  type: string;
}

export interface TestCase {
  input: Record<string, any>;
  expected: any;
  explanation?: string;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  categorySlug: string;
  pattern: string;
  timeLimitMinutes: number;
  frequencyRank: number;
  description: string;
  functionName: string;
  params: ParamDefinition[];
  returnType: string;
  starterCode: string;
  testCases: TestCase[];
  isCore75: boolean;
  lists: string[];
  timeComplexity: string;
  spaceComplexity: string;
  keyInsight: string;
  commonPitfalls: string[];
  hints: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  weight: number;
  problemCount: number;
  keyConcepts: string[];
}

export interface AttemptLog {
  id?: number;
  problemId: string;
  timestamp: string; // ISO string
  passed: boolean;
  timeSpentSeconds: number;
  hintsUsed: number;
  code: string;
  mode: 'practice' | 'review' | 'mock';
}

export interface PatternConfidence {
  categorySlug: string;
  categoryName: string;
  confidence: number; // 0.0 to 1.0
  problemsSolved: number;
  totalProblems: number;
  lastPracticed?: string;
  retentionScore: number;
  speedScore: number;
}

export interface SkillGraph {
  overallReadiness: number; // 0.0 to 1.0 (e.g. 0.74 = 74%)
  streakDays: number;
  lastActiveDate: string;
  totalSolved: number;
  patterns: Record<string, PatternConfidence>;
}
```

---

### 4.2. Deterministic Scoring & Readiness Formula (`src/engine/scoring.ts`)

The readiness score is calculated deterministically across 4 key dimensions:
$$\text{Readiness} = 0.40 \times \text{PatternStrength} + 0.25 \times \text{Retention} + 0.20 \times \text{Speed} + 0.15 \times \text{Independence}$$

1. **Pattern Strength**: Frequency-weighted sum of category confidences:
   $$\text{PatternStrength} = \sum_{c \in \text{Categories}} (\text{Weight}_c \times \text{Confidence}_c)$$
2. **Category Confidence**:
   $$\text{Confidence}_c = 0.30 \times \text{SolveRate} + 0.20 \times \text{SpeedScore} + 0.20 \times \text{RetentionRate} + 0.20 \times \text{Coverage} + 0.10 \times \text{RecencyFactor}$$
3. **Speed Score**:
   $$\text{SpeedScore} = \min\left(1.0, \frac{\text{TargetTime}}{\max(1, \text{ActualTime})}\right)$$
4. **Independence Score**:
   $$\text{Independence} = 1.0 - (0.25 \times \text{HintsUsed})$$ (clamped between 0.0 and 1.0)

---

### 4.3. Spaced Repetition SM-2 Engine (`src/engine/spaced-repetition.ts`)

Tracks interval days for each problem:
- Initial pass unassisted: `interval = 1 day`
- 2nd pass unassisted: `interval = 3 days`
- 3rd pass unassisted: `interval = 7 days`
- 4th pass unassisted: `interval = 14 days`
- 5th+ pass unassisted: `interval = 30 days`
- Failure or $>1$ hint used: `interval = 1 day` (resets to review)
- Overdue status: $\text{DaysSinceLastPractice} > \text{Interval}$

---

### 4.4. Recommendation Engine (`src/engine/recommend.ts`)

Selects the next optimal challenge by prioritizing:
1. **Urgent Reviews**: Problems with interval expired (spaced repetition).
2. **High-Impact Weak Spots**: Categories with high frequency weight $W_c$ and low confidence $C_c$, scored by gap impact:
   $$\text{GapImpact} = W_c \times (1.0 - C_c)$$
3. **Target Filter**: Respects active filter (`core-75` vs `extended-150`).

---

### 4.5. Web Worker Sandbox & DS Helpers (`src/runner/`)

#### `src/runner/ds-helpers.ts`
Provides serialization and deserialization for common interview data structures:
- `ListNode`: `arrayToList([1,2,3])` and `listToArray(head)`
- `TreeNode`: `arrayToTree([1,2,3,null,4])` (BFS level-order) and `treeToArray(root)`
- `deepEqual(actual, expected)`: Robust structural equality checking for nested arrays, objects, lists, and trees.

#### `src/runner/worker.ts`
Runs in an isolated Web Worker:
```typescript
self.onmessage = (e) => {
  const { code, functionName, testCases } = e.data;
  const timeoutMs = 2000;
  
  // Inject ListNode and TreeNode utilities into scope
  // Wrap user function in execution harness
  // Run each testCase with performance.now()
  // Return { results: TestResult[], allPassed: boolean, totalTimeMs: number }
};
```

---

### 4.6. WebMCP Tool Integration Layer (`src/webmcp/`)

#### Supported WebMCP Protocols
Prep Cockpit supports both standard experimental browser namespaces:
1. `navigator.tools.register(toolDefinition)`
2. `document.modelContext.registerTool(toolDefinition)` (fallback)

#### Exposing 6 WebMCP Tools:

1. **`get_recommendation`**
   - **Description**: Returns the next recommended problem with mathematical reasoning based on skill gaps and spaced repetition.
   - **Parameters**: `{ set?: 'core-75' | 'extended-150', category?: string }`
2. **`start_problem`**
   - **Description**: Loads problem starter code into Monaco editor, resets timer, and updates workspace context.
   - **Parameters**: `{ problemId: string }`
3. **`run_tests`**
   - **Description**: Executes current editor code (or passed code string) against test cases in the Web Worker sandbox.
   - **Parameters**: `{ code?: string }`
   - **Returns**: `{ allPassed: boolean, passedCount: number, totalCount: number, results: TestResult[] }`
4. **`get_hint`**
   - **Description**: Returns progressive Socratic hint (Level 1: Intuition → Level 2: Data Structure Strategy → Level 3: Concrete Step). Adapts hint with code context.
   - **Parameters**: `{ problemId: string, level: number }`
5. **`submit_solution`**
   - **Description**: Verifies all tests, logs attempt to IndexedDB, updates skill graph, and returns performance scorecard.
   - **Parameters**: `{ problemId: string, code: string, timeSpentSeconds: number }`
6. **`get_skill_profile`**
   - **Description**: Returns readiness percentage, current streak, and category breakdown.
   - **Parameters**: `{}`

#### Ambient State Sync (`navigator.tools.setClientState`)
Synchronizes live workspace state with the browser agent:
```typescript
navigator.tools.setClientState({
  view: 'workspace', // 'dashboard' | 'workspace'
  activeProblemId: 'course-schedule',
  timeRemainingSeconds: 1340,
  testsPassed: 2,
  testsTotal: 3,
  hintsRevealed: 1,
  userReadiness: 0.74,
  streakDays: 5
});
```

#### Declarative HTML WebMCP Annotation (`index.html`)
Annotates the notes scratchpad with declarative attributes:
```html
<form id="notes-form" data-model-context="problem_notes">
  <textarea name="notes" placeholder="Notes, edge cases, time/space complexity reflection..."></textarea>
</form>
```

---

### 4.7. Minimalist High-Contrast UI (`src/ui/`)

#### Approved Palette (Optimized for High Readability on M1 Air & All Displays)
```css
:root {
  --bg: #0a0a0a;
  --surface: #141414;
  --surface-hover: #1c1c1c;
  --border: #262626;
  --border-focus: #444444;
  --text: #f5f5f5;
  --text-muted: #a3a3a3;
  --text-dim: #5c5c5c;
  --green: #4ade80;
  --green-dim: #14532d;
  --red: #f87171;
  --red-dim: #450a0a;
  --dot-empty: #222222;
  --dot-review: #666666;
  --dot-filled: #f5f5f5;
  --font-mono: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
}
```

#### Views
1. **Dashboard View**:
   - Header: Readiness Score (`74% Ready`), Daily Streak (`🔥 5 Days`), Filter Selector (`Core 75` vs `Extended 150`).
   - `TODAY`: Due for Review queue + Next Recommended challenge.
   - `PROGRESS`: 18 Categories with dot-matrix coverage and confidence bars.
   - `PROBLEM CATALOG`: Instant fuzzy search + pattern filter table.
2. **Workspace View (Split-Pane)**:
   - Left Panel: Problem description, constraints, complexity goals, progressive hints drawer, notes scratchpad, and live test case runner status.
   - Right Panel: Monaco Editor with TypeScript syntax highlighting, line numbers, error markers, and `Ctrl+S` / `Cmd+S` listener to trigger sandbox runner.

---

## 5. Implementation Steps & Verification Plan

### Phase 1: Engine & Sandboxed Runner
1. Implement `src/engine/types.ts`.
2. Implement `src/engine/db.ts` with `idb` and test demo data seeding.
3. Implement `src/engine/scoring.ts`, `spaced-repetition.ts`, `recommend.ts`, and `streak.ts`.
4. Implement `src/runner/ds-helpers.ts` and `src/runner/worker.ts`.
5. Run unit test suite:
   ```bash
   npm test
   ```

### Phase 2: WebMCP Layer
1. Implement `src/webmcp/register.ts` and `src/webmcp/state.ts`.
2. Implement all 6 tool handlers in `src/webmcp/tools/`.
3. Verify tool schemas and execution via browser console and mock callers.

### Phase 3: UI & Monaco Workspace
1. Implement `src/style.css` with monochrome design tokens.
2. Implement `src/ui/editor.ts` using `@monaco-editor/loader`.
3. Implement `src/ui/dashboard.ts` and `src/ui/workspace.ts`.
4. Connect view router in `src/main.ts` with hash navigation (`#p=slug`) and query support (`?demo=true`).

### Phase 4: Build, Testing & Deploy Setup
1. Build check:
   ```bash
   npm run build
   ```
2. Verify in local preview:
   ```bash
   npm run preview
   ```
3. Test `http://localhost:3000/?demo=true` in Chrome with WebMCP flags enabled.
4. Prepare `vercel.json` for one-click deployment.

---

## 6. Video Walkthrough Script (For 3-Minute Hackathon Demo)

1. **[0:00 - 0:45] The Problem & Introduction**:
   - Introduce Prep Cockpit: "Preparing for staff-level coding rounds shouldn't be about endless DOM scraping or generic chatbots that hallucinate test passes. We built Prep Cockpit, an AI-native coding cockpit powered by WebMCP."
2. **[0:45 - 1:30] Agent Workflow & Recommendation**:
   - Open ChatGPT in-app browser to the deployed app with `?demo=true`.
   - Ask: *"What should I focus on today?"*
   - ChatGPT calls `get_recommendation` -> Identifies Graphs weakness and recommends `#207 Course Schedule`.
   - Ask: *"Let's start it."* -> ChatGPT calls `start_problem` -> Monaco editor loads immediately with starter code.
3. **[1:30 - 2:15] Coding, Testing & Socratic Hints**:
   - User writes solution with an edge-case bug.
   - User presses `Ctrl+S` or asks agent: *"Check my test cases"*.
   - Sandbox runs 3 tests in <5ms. Test 2 fails.
   - User asks: *"I'm stuck on cycle detection."*
   - Agent calls `get_hint(level: 1)` -> Delivers contextual guidance without giving away the full answer.
4. **[2:15 - 3:00] Deterministic Submission & Skill Graph Update**:
   - User fixes code, all 3 tests pass.
   - Agent calls `submit_solution` -> Scorecard appears, Graphs confidence jumps, streak maintained.
   - Conclude on WebMCP impact: "Zero DOM scraping, 100% deterministic, offline-first."
