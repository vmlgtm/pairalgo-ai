import type {
  Category,
  Problem,
  ProblemProgress,
  PatternConfidence,
  SkillGraph,
  AttemptLog
} from './types';

/**
 * Calculates speed score for a single problem attempt.
 * Returns a value between 0.0 and 1.0.
 */
export function calculateSpeedScore(targetMinutes: number, actualSeconds: number): number {
  if (actualSeconds <= 0) return 1.0;
  const targetSeconds = targetMinutes * 60;
  const score = targetSeconds / Math.max(1, actualSeconds);
  return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Calculates independence score based on number of hints used.
 * 0 hints = 1.0, 1 hint = 0.75, 2 hints = 0.50, 3 hints = 0.25, 4+ hints = 0.0.
 */
export function calculateIndependenceScore(hintsUsed: number): number {
  const score = 1.0 - 0.25 * Math.max(0, hintsUsed);
  return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Calculates recency factor using exponential decay.
 * e^(-0.05 * daysSinceLastPracticed)
 */
export function calculateRecencyFactor(daysSinceLastPracticed: number | null): number {
  if (daysSinceLastPracticed === null || daysSinceLastPracticed < 0) return 0.0;
  return Math.min(1.0, Math.max(0.0, Math.exp(-0.05 * daysSinceLastPracticed)));
}

/**
 * Calculates retention score for a single progress item.
 */
export function calculateProblemRetention(progress: ProblemProgress, now: Date = new Date()): number {
  if (progress.status !== 'solved' && progress.solveCount === 0) return 0.0;
  if (!progress.nextReviewDate) return 1.0;

  const nextReview = new Date(progress.nextReviewDate).getTime();
  const currentTime = now.getTime();

  if (currentTime <= nextReview) {
    return 1.0;
  }

  const overdueDays = (currentTime - nextReview) / (1000 * 60 * 60 * 24);
  const decay = Math.max(0.0, 1.0 - (overdueDays / 14));
  return Math.min(1.0, decay);
}

/**
 * Calculates pattern confidence for a single category.
 */
export function calculateCategoryConfidence(
  category: Category,
  categoryProblems: Problem[],
  progressMap: Map<string, ProblemProgress>,
  attempts: AttemptLog[],
  now: Date = new Date()
): PatternConfidence {
  const totalProblems = categoryProblems.length;
  if (totalProblems === 0) {
    return {
      categorySlug: category.slug,
      categoryName: category.name,
      confidence: 0,
      problemsSolved: 0,
      totalProblems: 0,
      retentionScore: 0,
      speedScore: 0
    };
  }

  const problemIds = new Set(categoryProblems.map(p => p.id));
  const categoryProgress = Array.from(progressMap.values()).filter(p => problemIds.has(p.problemId));
  const solvedProgress = categoryProgress.filter(p => p.status === 'solved' || p.solveCount > 0);
  const attemptedProgress = categoryProgress.filter(p => p.solveCount > 0 || p.failCount > 0 || p.status !== 'unattempted');

  const problemsSolved = solvedProgress.length;
  const solveRate = Math.min(1.0, problemsSolved / totalProblems);
  const coverage = Math.min(1.0, attemptedProgress.length / totalProblems);

  // Calculate speed score across solved problems in category
  let totalSpeedScore = 0;
  let speedCount = 0;
  for (const prog of solvedProgress) {
    const prob = categoryProblems.find(p => p.id === prog.problemId);
    if (prob && prog.bestTimeSeconds !== undefined && prog.bestTimeSeconds > 0) {
      totalSpeedScore += calculateSpeedScore(prob.timeLimitMinutes, prog.bestTimeSeconds);
      speedCount++;
    }
  }
  const avgSpeedScore = speedCount > 0 ? totalSpeedScore / speedCount : 0;

  // Calculate retention score across solved problems in category
  let totalRetention = 0;
  for (const prog of solvedProgress) {
    totalRetention += calculateProblemRetention(prog, now);
  }
  const avgRetentionScore = solvedProgress.length > 0 ? totalRetention / solvedProgress.length : 0;

  // Find last practiced date in category
  const categoryAttempts = attempts.filter(a => problemIds.has(a.problemId));
  let lastPracticed: string | undefined = undefined;
  let daysSinceLastPracticed: number | null = null;

  if (categoryAttempts.length > 0) {
    const sortedAttempts = [...categoryAttempts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    lastPracticed = sortedAttempts[0].timestamp;
    const diffMs = now.getTime() - new Date(lastPracticed).getTime();
    daysSinceLastPracticed = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  } else if (categoryProgress.some(p => p.lastAttemptDate)) {
    const dates = categoryProgress
      .map(p => p.lastAttemptDate)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    if (dates.length > 0) {
      lastPracticed = dates[0];
      const diffMs = now.getTime() - new Date(lastPracticed).getTime();
      daysSinceLastPracticed = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
    }
  }

  const recencyFactor = calculateRecencyFactor(daysSinceLastPracticed);

  // Confidence formula:
  // 0.30 * SolveRate + 0.20 * SpeedScore + 0.20 * RetentionRate + 0.20 * Coverage + 0.10 * RecencyFactor
  const confidence = Math.min(
    1.0,
    Math.max(
      0.0,
      0.30 * solveRate +
      0.20 * avgSpeedScore +
      0.20 * avgRetentionScore +
      0.20 * coverage +
      0.10 * recencyFactor
    )
  );

  return {
    categorySlug: category.slug,
    categoryName: category.name,
    confidence: Number(confidence.toFixed(4)),
    problemsSolved,
    totalProblems,
    lastPracticed,
    retentionScore: Number(avgRetentionScore.toFixed(4)),
    speedScore: Number(avgSpeedScore.toFixed(4))
  };
}

/**
 * Calculates complete SkillGraph and overall readiness score across all categories.
 */
export function calculateSkillGraph(
  categories: Category[],
  problems: Problem[],
  progressMap: Map<string, ProblemProgress>,
  attempts: AttemptLog[],
  streakDays: number = 0,
  now: Date = new Date()
): SkillGraph {
  const problemsByCategory = new Map<string, Problem[]>();
  for (const cat of categories) {
    problemsByCategory.set(cat.slug, []);
  }
  for (const prob of problems) {
    const list = problemsByCategory.get(prob.categorySlug);
    if (list) {
      list.push(prob);
    }
  }

  const patterns: Record<string, PatternConfidence> = {};
  let weightedPatternSum = 0;
  let totalWeight = 0;
  let weightedRetentionSum = 0;

  for (const cat of categories) {
    const catProblems = problemsByCategory.get(cat.slug) || [];
    const patternConf = calculateCategoryConfidence(cat, catProblems, progressMap, attempts, now);
    patterns[cat.slug] = patternConf;

    const w = cat.weight || 1 / Math.max(1, categories.length);
    totalWeight += w;
    weightedPatternSum += w * patternConf.confidence;
    weightedRetentionSum += w * patternConf.retentionScore;
  }

  const patternStrength = totalWeight > 0 ? weightedPatternSum / totalWeight : 0;
  const overallRetention = totalWeight > 0 ? weightedRetentionSum / totalWeight : 0;

  // Calculate overall speed score across all solved problems
  const allSolvedProgress = Array.from(progressMap.values()).filter(p => p.status === 'solved' || p.solveCount > 0);
  let speedTotal = 0;
  let speedCount = 0;
  for (const prog of allSolvedProgress) {
    const prob = problems.find(p => p.id === prog.problemId);
    if (prob && prog.bestTimeSeconds !== undefined && prog.bestTimeSeconds > 0) {
      speedTotal += calculateSpeedScore(prob.timeLimitMinutes, prog.bestTimeSeconds);
      speedCount++;
    }
  }
  const overallSpeed = speedCount > 0 ? speedTotal / speedCount : 0;

  // Calculate overall independence across solved attempts
  let totalHintsUsed = 0;
  let hintsCount = 0;
  for (const prog of allSolvedProgress) {
    if (prog.lastHintsUsed !== undefined) {
      totalHintsUsed += prog.lastHintsUsed;
      hintsCount++;
    }
  }
  const avgHintsUsed = hintsCount > 0 ? totalHintsUsed / hintsCount : 0;
  const overallIndependence = allSolvedProgress.length > 0 ? calculateIndependenceScore(avgHintsUsed) : 0;

  // Overall Readiness formula:
  // 0.40 * PatternStrength + 0.25 * Retention + 0.20 * Speed + 0.15 * Independence
  const readiness = Math.min(
    1.0,
    Math.max(
      0.0,
      0.40 * patternStrength +
      0.25 * overallRetention +
      0.20 * overallSpeed +
      0.15 * overallIndependence
    )
  );

  let lastActiveDate = '';
  if (attempts.length > 0) {
    const sorted = [...attempts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    lastActiveDate = sorted[0].timestamp;
  }

  return {
    overallReadiness: Number(readiness.toFixed(4)),
    streakDays,
    lastActiveDate,
    totalSolved: allSolvedProgress.length,
    patterns
  };
}
