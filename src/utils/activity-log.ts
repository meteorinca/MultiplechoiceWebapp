import type { UserAccount } from '../types/user';
import type { Exam } from '../types/question';
import {
  getAllPersistentItems,
  getPersistentItem,
  removePersistentItem,
  setPersistentItem,
} from './persistent-store';

export type SessionLog = {
  id: string;
  userId: string;
  userLogin: string;
  userName: string;
  loginAt: number;
  logoutAt?: number;
  durationMs?: number;
};

export type ExamAttemptLog = {
  id: string;
  sessionId?: string | null;
  userId: string;
  userLogin: string;
  userName: string;
  examId: string;
  examTitle: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  score: number;
  total: number;
};

const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const startSessionLog = async (user: UserAccount): Promise<SessionLog> => {
  const log: SessionLog = {
    id: createId('session'),
    userId: user.id,
    userLogin: user.login,
    userName: user.displayName,
    loginAt: Date.now(),
  };
  await setPersistentItem('sessions', log.id, log);
  return log;
};

export const endSessionLog = async (sessionId: string): Promise<void> => {
  const existing = await getPersistentItem<SessionLog>('sessions', sessionId);
  if (!existing) {
    return;
  }
  if (existing.logoutAt) {
    return;
  }
  const finishedAt = Date.now();
  await setPersistentItem('sessions', sessionId, {
    ...existing,
    logoutAt: finishedAt,
    durationMs: Math.max(finishedAt - existing.loginAt, 0),
  });
};

export const recordExamAttempt = async (options: {
  sessionId?: string | null;
  user: UserAccount;
  exam: Pick<Exam, 'id' | 'title'>;
  startedAt: number;
  finishedAt: number;
  score: number;
  total: number;
}): Promise<ExamAttemptLog> => {
  const durationMs = Math.max(options.finishedAt - options.startedAt, 0);
  const log: ExamAttemptLog = {
    id: createId('attempt'),
    sessionId: options.sessionId ?? null,
    userId: options.user.id,
    userLogin: options.user.login,
    userName: options.user.displayName,
    examId: options.exam.id,
    examTitle: options.exam.title,
    startedAt: options.startedAt,
    finishedAt: options.finishedAt,
    durationMs,
    score: Math.max(options.score, 0),
    total: Math.max(options.total, 0),
  };
  await setPersistentItem('attempts', log.id, log);
  return log;
};

export const getSessionLogs = async (): Promise<SessionLog[]> => {
  const entries = await getAllPersistentItems<SessionLog>('sessions');
  return entries
    .map((entry) => entry.value)
    .sort((a, b) => b.loginAt - a.loginAt);
};

export const getExamAttemptLogs = async (): Promise<ExamAttemptLog[]> => {
  const entries = await getAllPersistentItems<ExamAttemptLog>('attempts');
  return entries
    .map((entry) => entry.value)
    .sort((a, b) => b.finishedAt - a.finishedAt);
};

export const clearActivityLogs = async (): Promise<void> => {
  const sessionEntries = await getAllPersistentItems<SessionLog>('sessions');
  await Promise.all(
    sessionEntries.map((entry) => removePersistentItem('sessions', entry.key)),
  );
  const attemptEntries = await getAllPersistentItems<ExamAttemptLog>('attempts');
  await Promise.all(
    attemptEntries.map((entry) => removePersistentItem('attempts', entry.key)),
  );
};
