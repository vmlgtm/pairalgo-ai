# Prep Cockpit ⚡️
> **AI-Native Algorithm & Problem Solving Cockpit powered by WebMCP**

Prep Cockpit is an open-source, client-side developer workspace designed to bridge human coding practice with AI agent coaching via the **WebMCP (Web Model Context Protocol)** standard.

---

## 🌟 Key Capabilities

1. **Browser-Native WebMCP Tools**: Exposes typed, structured tools directly to browser AI agents (ChatGPT in-app browser, Chrome with WebMCP origin trial). The agent can inspect state, run tests, offer Socratic hints, and log attempts without brittle DOM scraping.
2. **In-Browser Web Worker Sandbox**: Executes solutions against test suites in an isolated Web Worker using `new Function()` with strict timeouts and DSA helper serialization (`ListNode`, `TreeNode`).
3. **Deterministic Scoring Engine**: Calculates pattern confidence, retention, speed, and overall readiness using mathematical models (no hallucinated progress).
4. **Offline-First Storage**: All logs, progress graphs, and notes persist in browser `IndexedDB`.
5. **High-Contrast Monochrome UI**: Clean, distraction-free interface tested for readability across displays (including MacBook Air M1).
6. **Curated Problem Bank**: 150 classic computer science algorithm challenges across 18 core patterns with verified test suites and multi-tier progressive hints.

---

## 🛠 WebMCP Tool Declarations

| Tool Name | Description | Parameters |
|---|---|---|
| `get_recommendation` | Returns optimal next problem based on skill graph gaps & spaced repetition | `{ set?: 'core-75' | 'extended-150', category?: string }` |
| `start_problem` | Loads problem into editor, resets timer & worker state | `{ problemId: string }` |
| `run_tests` | Executes code against problem test cases in sandbox | `{ code?: string }` |
| `get_hint` | Returns progressive Socratic hint (Level 1 → 2 → 3) with code context | `{ problemId: string, level: number }` |
| `submit_solution` | Deterministically verifies full test suite, updates IndexedDB skill graph | `{ problemId: string, code: string, timeSpentSeconds: number }` |
| `get_skill_profile` | Returns current readiness score, streak, and per-pattern confidence breakdown | `{}` |

---

## 🚀 Quickstart

```bash
# Clone the repository
git clone https://github.com/vmlgtm/prep-cockpit.git
cd prep-cockpit

# Install dependencies
npm install

# Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo Mode (for Judges & Testing)
Add `?demo=true` to the URL:
```
http://localhost:3000/?demo=true
```
This pre-seeds IndexedDB with 47 solved problems, a 5-day active streak, and realistic skill confidence scores for instant evaluation in agent browsers.

---

## 📜 License
MIT License © 2026 Vaibhav Misra
