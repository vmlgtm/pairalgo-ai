# 🎬 PairAlgo.ai — Demo Video Script & Storyboard

> **Target Duration**: ~2 minutes 15 seconds (Under the 3-minute hard ceiling)  
> **Key Rule**: Hook judges in the first 15 seconds with working live code execution and WebMCP agent tools.  
> **Demo URL**: `https://pairalgo-ai.vercel.app/?demo=true` (Pre-seeded with 52 solved problems, 84% readiness score, active SM-2 review queue)

---

## ⏱️ Video Structure Overview

| Clip | Timestamp | Screen Visual | Core Message |
|---|---|---|---|
| **Clip 1** | `0:00 - 0:15` | Split Monaco editor + WebMCP tool call running tests in Web Worker | **The Hook**: Working live in 15s — typed WebMCP execution without DOM scraping |
| **Clip 2** | `0:15 - 0:45` | Problem recommendation & Ambient Client State sync | Intelligent next problem recommendation based on SM-2 gaps |
| **Clip 3** | `0:45 - 1:15` | Socratic coaching & Progressive Hints in action | 3-tier hints guide intuition without dumping solutions |
| **Clip 4** | `1:15 - 1:45` | Real-time code execution in sandboxed Web Worker | Sub-10ms test execution, `ListNode`/`TreeNode` BFS serialization |
| **Clip 5** | `1:45 - 2:10` | Submission, Spaced Repetition & Deterministic Readiness | Mathematical scoring engine & SM-2 review updates in IndexedDB |
| **Clip 6** | `2:10 - 2:25` | Evals suite & Architecture summary | Offline-first, zero-backend, validated by evals suite |

---

## 🎥 Clip-by-Clip Recording Script

### 🎬 Clip 1: The 15-Second Hook (0:00 – 0:15)
* **Visual**: Screen opens already loaded at `https://pairalgo-ai.vercel.app/?demo=true` in dark monochrome UI. Monaco editor is open with code. We hit `Cmd+S` / test runner — all 5 test cases instantly turn green in 8ms. The WebMCP agent log drawer slides open showing `run_tests` returning structured JSON.
* **Narration**:
  > *"When practicing coding interview problems, asking an AI for help usually means broken hallucinations or spoiled solutions. This is **PairAlgo.ai** — an open-source, client-side algorithm cockpit built on the WebMCP protocol that turns browser AI agents into deterministic, pair-programming coaches."*

---

### 🎬 Clip 2: Ambient State & Intelligent Recommendation (0:15 – 0:45)
* **Visual**: Switch to Dashboard. Hover over the Skill Radar showing pattern gaps (e.g. Graph Algorithms at 45%, Dynamic Programming at 80%). In the browser console / agent interface, run `get_recommendation({ set: 'core-75' })`. The agent returns `course-schedule` with mathematical justification based on category weight and SM-2 retention. Click **Start Problem** or trigger `start_problem({ problemId: 'course-schedule' })`. Monaco editor immediately loads starter code.
* **Narration**:
  > *"PairAlgo.ai continuously broadcasts live ambient state to the agent via `navigator.tools.setClientState()` — including active category, test counts, and timer.*
  > 
  > *When you ask what to practice next, the agent calls `get_recommendation`. Instead of guessing, it mathematically analyzes your weakest patterns, interview frequency weights, and SM-2 spaced repetition intervals to recommend the highest-ROI challenge."*

---

### 🎬 Clip 3: Socratic Coaching & 3-Tier Progressive Hints (0:45 – 1:15)
* **Visual**: Write a partial topological sort BFS solution in Monaco. Intentionally introduce a bug (e.g. forgetting to decrement in-degree count). Agent calls `run_tests` — fails test case 2. User asks for a hint. The agent invokes `get_hint({ level: 1 })` and `get_hint({ level: 2 })`.
* **Narration**:
  > *"When your code fails, the agent doesn't dump the full solution. It calls `run_tests` to receive exact assertion diffs from our in-browser sandbox, and fetches progressive Socratic hints — Level 1 for intuition, Level 2 for data structure guidance, and Level 3 for implementation steps — helping you build problem-solving muscle memory."*

---

### 🎬 Clip 4: Web Worker Execution & Complex Data Structures (1:15 – 1:45)
* **Visual**: Fix the bug. Quick jump cut to running a Tree/LinkedList problem (e.g. `invert-binary-tree` or `reverse-linked-list`). Show the Web Worker sandbox executing code with custom BFS `TreeNode` serializers and a 2500ms timeout guard protecting against infinite loops. All tests pass with console output captured.
* **Narration**:
  > *"Under the hood, all code executes 100% client-side inside an isolated Web Worker. We built custom BFS serializers that seamlessly transfer binary trees and linked lists across worker boundaries, with sub-10 millisecond execution and zero server latency or privacy leaks."*

---

### 🎬 Clip 5: Submission & Mathematical Readiness Engine (1:45 – 2:10)
* **Visual**: Hit **Submit Solution** or call `submit_solution()`. The modal shows success. The app calculates new SuperMemo SM-2 repetition intervals and updates the user's Skill Profile in IndexedDB. Show the readiness equation score jumping to 86%.
* **Narration**:
  > *"Upon submission, your attempt is deterministically logged into IndexedDB. PairAlgo.ai calculates your interview readiness using a transparent mathematical model combining pattern strength, retention, speed, and independence — no LLM hallucinations in progress tracking."*

---

### 🎬 Clip 6: Evals Suite & Wrap-Up (2:10 – 2:25)
* **Visual**: Terminal showing `npm test` running 31 unit tests and 6 WebMCP tool evals passing in 950ms. End card showing GitHub URL and Live Vercel Demo link.
* **Narration**:
  > *"We validated our WebMCP tool contracts with a dedicated evals test suite. PairAlgo.ai is completely open-source, zero-backend, and live right now at pairalgo-ai.vercel.app. Thank you!"*

---

## 🎙️ Recording Tips for Maximum Impact

1. **Pre-load the Demo URL**: Open `https://pairalgo-ai.vercel.app/?demo=true` before hitting record. This skips cold-start empty state and shows full charts immediately.
2. **Use Keyboard Shortcuts**: `Cmd+Enter` or `Cmd+S` to run tests instantly.
3. **Keep Audio Crisp**: Use a clean microphone or record high-quality AI narration (e.g. ElevenLabs or Google TTS).
4. **Jump Cuts**: Trim all typing pauses. Keep every transition snappy.
