import { openDB, type IDBPDatabase } from 'idb';
import type {
  Problem,
  Category,
  ProblemProgress,
  AttemptLog
} from './types';
import rawCategories from '../data/categories.json';
import rawProblems from '../data/problems.json';
import { generateDemoData } from '../data/demo-seed';

const DB_NAME = 'prep-cockpit-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('problems')) {
          db.createObjectStore('problems', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'slug' });
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'problemId' });
        }
        if (!db.objectStoreNames.contains('attempts')) {
          const attemptStore = db.createObjectStore('attempts', {
            keyPath: 'id',
            autoIncrement: true
          });
          attemptStore.createIndex('problemId', 'problemId', { unique: false });
          attemptStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      }
    });
  }
  return dbPromise;
}

// ----------------- Problems -----------------
export async function getAllProblems(): Promise<Problem[]> {
  const db = await getDB();
  const problems = await db.getAll('problems');
  if (!problems || problems.length === 0) {
    await saveProblems(rawProblems as unknown as Problem[]);
    return rawProblems as unknown as Problem[];
  }
  return problems;
}

export async function getProblem(id: string): Promise<Problem | undefined> {
  const db = await getDB();
  let problem = await db.get('problems', id);
  if (!problem) {
    // Check in raw problems fallback
    problem = (rawProblems as unknown as Problem[]).find(p => p.id === id || p.slug === id);
    if (problem) {
      await db.put('problems', problem);
    }
  }
  return problem;
}

export async function saveProblems(problems: Problem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('problems', 'readwrite');
  for (const prob of problems) {
    await tx.store.put(prob);
  }
  await tx.done;
}

// ----------------- Categories -----------------
export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB();
  const categories = await db.getAll('categories');
  if (!categories || categories.length === 0) {
    await saveCategories(rawCategories as unknown as Category[]);
    return rawCategories as unknown as Category[];
  }
  return categories;
}

export async function saveCategories(categories: Category[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('categories', 'readwrite');
  for (const cat of categories) {
    await tx.store.put(cat);
  }
  await tx.done;
}

// ----------------- Progress -----------------
export async function getProgress(problemId: string): Promise<ProblemProgress | undefined> {
  const db = await getDB();
  return db.get('progress', problemId);
}

export async function getAllProgress(): Promise<ProblemProgress[]> {
  const db = await getDB();
  return db.getAll('progress');
}

export async function saveProgress(progress: ProblemProgress): Promise<void> {
  const db = await getDB();
  await db.put('progress', progress);
}

// ----------------- Attempts -----------------
export async function addAttempt(attempt: AttemptLog): Promise<number> {
  const db = await getDB();
  const id = await db.add('attempts', attempt);
  return id as number;
}

export async function getAttempts(problemId?: string): Promise<AttemptLog[]> {
  const db = await getDB();
  if (problemId) {
    return db.getAllFromIndex('attempts', 'problemId', problemId);
  }
  return db.getAll('attempts');
}

export async function getAllAttempts(): Promise<AttemptLog[]> {
  const db = await getDB();
  return db.getAll('attempts');
}

// ----------------- Meta -----------------
export async function getMeta<T = any>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const item = await db.get('meta', key);
  return item ? (item.value as T) : undefined;
}

export async function setMeta<T = any>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('meta', { key, value });
}

// ----------------- Seeding & Reset -----------------
export async function seedInitialData(demo: boolean = false): Promise<void> {
  const db = await getDB();

  // Check if categories seeded
  const existingCategories = await db.count('categories');
  if (existingCategories === 0) {
    await saveCategories(rawCategories as unknown as Category[]);
  }

  // Check if problems seeded
  const existingProblems = await db.count('problems');
  if (existingProblems === 0) {
    await saveProblems(rawProblems as unknown as Problem[]);
  }

  // Seed demo data if demo requested or not seeded yet in demo query
  const demoSeeded = await getMeta<boolean>('demoSeeded');
  if (demo && !demoSeeded) {
    const { progressList, attempts } = generateDemoData();

    const txProg = db.transaction('progress', 'readwrite');
    for (const prog of progressList) {
      await txProg.store.put(prog);
    }
    await txProg.done;

    const txAtt = db.transaction('attempts', 'readwrite');
    for (const att of attempts) {
      await txAtt.store.put(att);
    }
    await txAtt.done;

    await setMeta('demoSeeded', true);
    await setMeta('demoSeedDate', new Date().toISOString());
  }
}

export async function resetDatabase(demo: boolean = false): Promise<void> {
  const db = await getDB();
  await db.clear('progress');
  await db.clear('attempts');
  await db.clear('meta');
  await seedInitialData(demo);
}
