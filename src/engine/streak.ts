import type { AttemptLog } from './types';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  isActiveToday: boolean;
  activeDates: string[];
}

/**
 * Formats a Date or timestamp string into YYYY-MM-DD in local time.
 */
export function formatDateKey(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates current and longest streak from attempt timestamps.
 */
export function calculateStreak(
  attempts: (AttemptLog | string)[],
  now: Date = new Date()
): StreakInfo {
  if (!attempts || attempts.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
      isActiveToday: false,
      activeDates: []
    };
  }

  // Extract unique active date strings in YYYY-MM-DD
  const dateSet = new Set<string>();
  for (const item of attempts) {
    const ts = typeof item === 'string' ? item : item.timestamp;
    const dateKey = formatDateKey(ts);
    if (dateKey) {
      dateSet.add(dateKey);
    }
  }

  const sortedDates = Array.from(dateSet).sort().reverse(); // newest first
  if (sortedDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
      isActiveToday: false,
      activeDates: []
    };
  }

  const todayKey = formatDateKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterdayDate);

  const isActiveToday = dateSet.has(todayKey);
  const lastActiveDate = sortedDates[0];

  // Calculate current streak
  let currentStreak = 0;
  // If active today, start checking from today; if not active today but active yesterday, start from yesterday
  let checkDate = new Date(now);
  if (!isActiveToday && dateSet.has(yesterdayKey)) {
    checkDate = yesterdayDate;
  } else if (!isActiveToday && !dateSet.has(yesterdayKey)) {
    currentStreak = 0;
  }

  if (isActiveToday || dateSet.has(yesterdayKey)) {
    let loopGuard = 0;
    while (loopGuard < 1000) {
      loopGuard++;
      const key = formatDateKey(checkDate);
      if (dateSet.has(key)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak across all history
  // Sort ascending for consecutive day counting
  const ascDates = Array.from(dateSet).sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let prevDateObj: Date | null = null;

  for (const dateStr of ascDates) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    if (!prevDateObj) {
      runningStreak = 1;
    } else {
      const diffMs = dateObj.getTime() - prevDateObj.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    }

    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    prevDateObj = dateObj;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastActiveDate,
    isActiveToday,
    activeDates: Array.from(dateSet).sort()
  };
}
