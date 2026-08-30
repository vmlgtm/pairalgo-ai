# PairAlgo.ai ⚡️
> **AI-Native Algorithm Pair Practice Cockpit powered by WebMCP**  
> Built for the **OpenAI WebMCP Challenge**

**PairAlgo.ai** is an open-source, client-side developer workspace designed to bridge human coding practice with AI pair coaching via the **WebMCP (Web Model Context Protocol)** standard.

Instead of an AI agent blindly scraping the DOM or guessing button clicks, PairAlgo.ai exposes **structured, typed WebMCP tools and ambient client state** directly to browser-native agents (ChatGPT in-app browser, Google Chrome with WebMCP flags). All code execution is securely handled in-browser via a sandboxed Web Worker, and all progress tracking is deterministically calculated and persisted locally in IndexedDB.

---

## 🌟 Key Capabilities

1. **Browser-Native WebMCP Tools**: Exposes typed, structured tools directly to browser AI agents (`navigator.tools.register()` & `document.modelContext.registerTool()`). The agent can inspect state, run tests, offer Socratic hints, and log attempts without brittle DOM scraping.
2. **Continuous Agent Loop & In-App Activity Feed**: Seamless pair-programming onboarding guide with 1-click copyable prompts, a real-time chronological agent activity feed (`ChatGPT` vs `You`), and reactive UI updates as the agent acts.
3. **Actionable "Run Latest Code" Cue**: Detects code changes since the last test run and guides the user to test the latest code with ChatGPT, without auto-submitting or silently transmitting raw keystrokes.
4. **Ambient Client State Sync**: Continuously broadcasts workspace view, timer, test pass counts, hints revealed, and readiness to the LLM agent via `navigator.tools.setClientState()`.
5. **Declarative HTML Context**: Enhances notes and reflection forms with `data-model-context="problem_notes"` attributes for zero-overhead agent awareness.
6. **In-Browser Web Worker Sandbox**: Executes solutions against test suites in an isolated Web Worker using `new Function()` with 2500ms timeout protection, console log capture, and DSA helper serialization (`ListNode`, `TreeNode`).
7. **Deterministic Scoring Engine**: Calculates pattern confidence, SM-2 spaced repetition intervals, retention, speed, and overall readiness using mathematical models (no LLM hallucinations in progress tracking).
8. **Offline-First & Zero Backend**: 100% client-side (Static Vite bundle + IndexedDB + Web Workers). Fast, private, and zero operational cost.
9. **High-Contrast Monochrome UI**: Clean, distraction-free interface optimized for readability across all displays (including MacBook Air M1).
10. **Curated Problem Bank**: 150 computer science algorithm challenges across 18 core patterns with verified test suites and multi-tier progressive hints.

---

## 🛠 WebMCP Tool Declarations

| Tool Name | Description | Parameters |
|---|---|---|
| `get_recommendation` | Returns optimal next problem with mathematical reasoning based on skill gaps, interview frequency weights, and spaced repetition schedules | `{ set?: 'all' \| 'core-75' \| 'extended-150', category?: string, difficulty?: 'easy' \| 'medium' \| 'hard' }` |
| `start_problem` | Loads problem into Monaco editor, resets timer, and updates workspace ambient context | `{ problemId: string }` |
| `run_tests` | Executes code against problem test cases in the Web Worker sandbox | `{ problemId?: string, code?: string }` |
| `get_hint` | Returns progressive Socratic hint (Level 1 Intuition → Level 2 Strategy → Level 3 Step) | `{ problemId?: string, level: number }` |
| `submit_solution` | Deterministically verifies full test suite, updates SM-2 intervals and IndexedDB skill graph | `{ problemId?: string, code?: string, timeSpentSeconds?: number }` |
| `get_skill_profile` | Returns current readiness score, streak, and per-pattern confidence breakdown | `{}` |

---

## 🏗 Architecture

```mermaid
flowchart TB
    subgraph BrowserAgent["AI Agent (ChatGPT / Chrome WebMCP)"]
        Agent["LLM Agent (GPT-5.6 Terra)"]
        Context["Ambient Client State"]
    end

    subgraph WebMCPProtocol["WebMCP Protocol Layer"]
        Reg["navigator.tools.register()"]
        State["navigator.tools.setClientState()"]
        Decl["Declarative HTML Annotations"]
        Evts["Activity Event Bus & Dispatcher"]
    end

    subgraph AppCore["PairAlgo.ai Core Application"]
        MainRouter["App Controller & State Router"]
        DashboardUI["Dashboard & Pair Guide"]
        WorkspaceUI["Split-Pane Monaco Workspace"]
        FeedUI["In-App Agent Activity Feed"]
        Engine["Deterministic Scoring & Spaced Repetition"]
        IDB[("IndexedDB Storage")]
    end

    subgraph ExecutionSandbox["Web Worker Isolation"]
        Worker["Web Worker Sandbox"]
        DSHelpers["ListNode / TreeNode Serializer"]
        Runner["new Function() Execution + Timeout Guard"]
    end

    Agent <--> Reg
    Context <--> State
    Agent <--> Decl
    Reg <--> MainRouter
    State <--> MainRouter
    Reg --> Evts
    Evts --> FeedUI
    MainRouter <--> DashboardUI
    MainRouter <--> WorkspaceUI
    MainRouter <--> Engine
    Engine <--> IDB
    WorkspaceUI --> Runner
    Runner --> Worker
    Worker --> DSHelpers
```

---

## 🤝 Continuous Agent Workflow (ChatGPT Pair-Programming)

PairAlgo bridges the human developer workflow with ChatGPT via seamless WebMCP tool calls:

1. **Ask for recommendations**: Ask ChatGPT `"What should I practice today?"`. The agent executes `get_recommendation` and suggests the optimal challenge.
2. **Start hands-free**: Ask ChatGPT `"Start the recommended problem."`. The workspace switches view, loads starter code in Monaco, and logs the event in the **In-App Agent Activity Feed**.
3. **Code & test interactively**: Write your solution in Monaco. If code changes after testing, an actionable cue prompts you to ask ChatGPT to run the latest code.
4. **Targeted coaching**: Ask ChatGPT `"Run my latest code and explain any failing test."` or `"Give me hint 1 without revealing the solution."`. The UI updates live with assertion results and hints.
5. **Private by design**: Code is only evaluated when explicitly requested via `run_tests` or `submit_solution`. Keystrokes are never auto-transmitted.

---

## 🚀 Quickstart

```bash
# Clone the repository
git clone https://github.com/vmlgtm/pairalgo-ai.git
cd pairalgo-ai

# Install dependencies
npm install

# Run unit tests
npm test

# Build production bundle
npm run build

# Run locally in development mode
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🧪 Live Deployment & Demo Mode (for Judges)

The application is deployed live on **Vercel** with continuous deployment:

🔗 **[https://pairalgo-ai.vercel.app/?demo=true](https://pairalgo-ai.vercel.app/?demo=true)**

*(Pre-seeded with benchmark data: 52 solved problems, 84% readiness, 5-day streak, and 3 SM-2 spaced repetition reviews due today)*

### Try WebMCP in Browser Console / Agent Callers
You can test the WebMCP tools directly in the browser console via the global inspection harness:
```javascript
// Get intelligent recommendation
await window.callWebMCPTool('get_recommendation', { set: 'core-75' });

// Start problem in editor
await window.callWebMCPTool('start_problem', { problemId: 'course-schedule' });

// Get Socratic hint
await window.callWebMCPTool('get_hint', { level: 1 });

// Run tests
await window.callWebMCPTool('run_tests');

// Submit solution
await window.callWebMCPTool('submit_solution', { timeSpentSeconds: 420 });

// Inspect skill profile
await window.callWebMCPTool('get_skill_profile');
```

---

## 📜 License
MIT License © 2026 Vaibhav Misra
