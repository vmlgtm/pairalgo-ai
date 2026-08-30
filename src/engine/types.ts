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

export interface ProblemReference {
  title: string;
  type: string;
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
  references?: ProblemReference[];
}

export interface Category {
  id?: string;
  name: string;
  slug: string;
  weight: number;
  description?: string;
  problemCount?: number;
  keyConcepts?: string[];
}

export type AttemptMode = 'practice' | 'review' | 'mock';

export interface AttemptLog {
  id?: number;
  problemId: string;
  timestamp: string; // ISO string
  passed: boolean;
  timeSpentSeconds: number;
  hintsUsed: number;
  code: string;
  mode: AttemptMode;
}

export type ProblemStatus = 'unattempted' | 'practicing' | 'solved' | 'review_due';

export interface ProblemProgress {
  problemId: string;
  status: ProblemStatus;
  lastAttemptDate?: string;
  solveCount: number;
  failCount: number;
  bestTimeSeconds?: number;
  lastTimeSeconds?: number;
  lastHintsUsed?: number;
  sm2IntervalDays: number;
  sm2Repetitions: number;
  sm2EaseFactor: number;
  nextReviewDate?: string; // ISO string
  savedCode?: string;
  savedNotes?: string;
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

export interface TestResult {
  testIndex: number;
  passed: boolean;
  input: Record<string, any>;
  expected: any;
  actual: any;
  executionTimeMs: number;
  error?: string;
  logs?: string[];
}

export interface ExecutionResult {
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
  results: TestResult[];
  totalTimeMs: number;
  error?: string;
}

export interface ClientState {
  view: 'dashboard' | 'workspace';
  activeProblemId?: string;
  timeRemainingSeconds?: number;
  testsPassed?: number;
  testsTotal?: number;
  hintsRevealed?: number;
  userReadiness: number;
  streakDays: number;
  targetFilter?: 'all' | 'core-75' | 'extended-150';
  editorDirty?: boolean;
  lastTestSummary?: {
    passedCount: number;
    totalCount: number;
    allPassed: boolean;
    totalTimeMs: number;
    error?: string;
  };
}

export interface RecommendationResult {
  problem: Problem;
  reason: string;
  priority: 'review' | 'weak_spot' | 'next_new';
  categoryConfidence: number;
  gapScore: number;
}
