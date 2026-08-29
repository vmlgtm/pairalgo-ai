import type {
  Category,
  Problem,
  ProblemProgress,
  RecommendationResult,
  AttemptLog
} from './types';
import { getDueForReview } from './spaced-repetition';
import { calculateCategoryConfidence } from './scoring';

export interface RecommendationFilter {
  set?: 'all' | 'core-75' | 'extended-150';
  categorySlug?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Deterministically recommends the next problem based on:
 * 1. Spaced repetition overdue reviews
 * 2. High-impact pattern gaps: GapScore = CategoryWeight * (1.0 - CategoryConfidence)
 * 3. Next high-frequency unsolved problem
 */
export function getRecommendation(
  categories: Category[],
  problems: Problem[],
  progressMap: Map<string, ProblemProgress>,
  attempts: AttemptLog[] = [],
  filter?: RecommendationFilter,
  now: Date = new Date()
): RecommendationResult | null {
  if (problems.length === 0) return null;

  // Filter candidate problems according to user filter
  let candidateProblems = problems;
  if (filter?.set && filter.set !== 'all') {
    candidateProblems = candidateProblems.filter(p => p.lists?.includes(filter.set!));
  }
  if (filter?.categorySlug) {
    candidateProblems = candidateProblems.filter(p => p.categorySlug === filter.categorySlug);
  }
  if (filter?.difficulty) {
    candidateProblems = candidateProblems.filter(p => p.difficulty === filter.difficulty);
  }

  if (candidateProblems.length === 0) {
    // Fallback to all problems if filter matches nothing
    candidateProblems = problems;
  }

  const candidateIds = new Set(candidateProblems.map(p => p.id));
  const candidateProgress = Array.from(progressMap.values()).filter(p => candidateIds.has(p.problemId));

  // 1. Check for urgent spaced repetition reviews
  const dueItems = getDueForReview(candidateProblems, candidateProgress, now);
  if (dueItems.length > 0) {
    const topDue = dueItems[0];
    const cat = categories.find(c => c.slug === topDue.problem.categorySlug);
    const catConf = cat
      ? calculateCategoryConfidence(
          cat,
          problems.filter(p => p.categorySlug === cat.slug),
          progressMap,
          attempts,
          now
        ).confidence
      : 0;

    const overdueStr = topDue.overdueDays >= 1
      ? `${Math.round(topDue.overdueDays)} days overdue`
      : `Due for spaced repetition review today`;

    return {
      problem: topDue.problem,
      reason: `Spaced repetition: ${overdueStr} (interval was ${topDue.progress.sm2IntervalDays}d). Strengthen long-term retention.`,
      priority: 'review',
      categoryConfidence: catConf,
      gapScore: Number((1.0 - catConf).toFixed(3))
    };
  }

  // 2. Identify high-impact category weak spots
  // GapImpact = Weight_c * (1.0 - Confidence_c)
  interface CategoryGap {
    category: Category;
    confidence: number;
    gapScore: number;
    unsolvedProblems: Problem[];
  }

  const categoryGaps: CategoryGap[] = [];

  for (const cat of categories) {
    if (filter?.categorySlug && cat.slug !== filter.categorySlug) {
      continue;
    }

    const catProblems = candidateProblems.filter(p => p.categorySlug === cat.slug);
    if (catProblems.length === 0) continue;

    const catConf = calculateCategoryConfidence(cat, problems.filter(p => p.categorySlug === cat.slug), progressMap, attempts, now);
    const weight = cat.weight || (1 / categories.length);
    const gapScore = weight * (1.0 - catConf.confidence);

    const unsolved = catProblems
      .filter(p => {
        const prog = progressMap.get(p.id);
        return !prog || prog.status === 'unattempted' || prog.solveCount === 0;
      })
      .sort((a, b) => (a.frequencyRank || 999) - (b.frequencyRank || 999));

    categoryGaps.push({
      category: cat,
      confidence: catConf.confidence,
      gapScore,
      unsolvedProblems: unsolved
    });
  }

  // Sort categories by highest gap impact
  categoryGaps.sort((a, b) => b.gapScore - a.gapScore);

  for (const gap of categoryGaps) {
    if (gap.unsolvedProblems.length > 0) {
      const topProblem = gap.unsolvedProblems[0];
      const confPercent = Math.round(gap.confidence * 100);
      const weightPercent = Math.round((gap.category.weight || 0.05) * 100);

      return {
        problem: topProblem,
        reason: `Highest impact weak spot: ${gap.category.name} has only ${confPercent}% confidence with a high ${weightPercent}% interview frequency weight.`,
        priority: 'weak_spot',
        categoryConfidence: gap.confidence,
        gapScore: Number(gap.gapScore.toFixed(4))
      };
    }
  }

  // 3. Fallback: If all problems in gaps are solved, pick the next highest frequency unsolved problem
  const allUnsolved = candidateProblems
    .filter(p => {
      const prog = progressMap.get(p.id);
      return !prog || prog.status === 'unattempted' || prog.solveCount === 0;
    })
    .sort((a, b) => (a.frequencyRank || 999) - (b.frequencyRank || 999));

  if (allUnsolved.length > 0) {
    const nextProb = allUnsolved[0];
    const cat = categories.find(c => c.slug === nextProb.categorySlug);
    const catConf = cat
      ? calculateCategoryConfidence(cat, problems.filter(p => p.categorySlug === cat.slug), progressMap, attempts, now).confidence
      : 0;

    return {
      problem: nextProb,
      reason: `Next high-frequency core challenge: Rank #${nextProb.frequencyRank} in ${nextProb.category}.`,
      priority: 'next_new',
      categoryConfidence: catConf,
      gapScore: Number((1.0 - catConf).toFixed(4))
    };
  }

  // 4. If all problems solved, recommend the least recently practiced problem
  const sortedByRecency = [...candidateProblems].sort((a, b) => {
    const progA = progressMap.get(a.id);
    const progB = progressMap.get(b.id);
    const timeA = progA?.lastAttemptDate ? new Date(progA.lastAttemptDate).getTime() : 0;
    const timeB = progB?.lastAttemptDate ? new Date(progB.lastAttemptDate).getTime() : 0;
    return timeA - timeB;
  });

  const leastRecent = sortedByRecency[0];
  const cat = categories.find(c => c.slug === leastRecent.categorySlug);
  const catConf = cat
    ? calculateCategoryConfidence(cat, problems.filter(p => p.categorySlug === cat.slug), progressMap, attempts, now).confidence
    : 1.0;

  return {
    problem: leastRecent,
    reason: `Review session: All problems solved! Refreshing ${leastRecent.title} (practiced least recently).`,
    priority: 'review',
    categoryConfidence: catConf,
    gapScore: 0.1
  };
}
