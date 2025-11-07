import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Exam } from '../types/question';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  getPersistentItem,
  removePersistentItem,
  setPersistentItem,
} from './persistent-store';

export type ExamsListener = (
  exams: Exam[],
  metadata: { fromCache: boolean },
) => void;

export type ExamsErrorListener = (error: FirestoreError) => void;

const USERS_COLLECTION = 'users';
const EXAMS_COLLECTION = 'exams';

const getUserExamsCollection = (userId: string) => {
  if (!db || !userId) {
    return null;
  }
  return collection(db, USERS_COLLECTION, userId, EXAMS_COLLECTION);
};

const readLocalExams = async (userId: string): Promise<Exam[]> => {
  const stored = await getPersistentItem<Exam[]>('exams', userId);
  if (!stored) {
    return [];
  }
  return stored.map((exam) => ({
    ...exam,
    ownerId: userId,
  }));
};

const writeLocalExams = async (userId: string, exams: Exam[]): Promise<void> => {
  await setPersistentItem(
    'exams',
    userId,
    exams.map((exam) => ({
      ...exam,
      ownerId: userId,
    })),
  );
};

export const subscribeToCloudExams = (
  userId: string,
  onChange: ExamsListener,
  onError?: ExamsErrorListener,
): Unsubscribe => {
  const examsCollection = getUserExamsCollection(userId);
  if (!examsCollection || !isFirebaseConfigured) {
    void (async () => {
      const exams = await readLocalExams(userId);
      onChange(exams, { fromCache: false });
    })();
    return () => {};
  }

  return onSnapshot(
    examsCollection,
    (snapshot) => {
      const exams = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() as Exam;
        return {
          ...data,
          id: docSnapshot.id,
          ownerId: userId,
        };
      });
      onChange(exams, { fromCache: snapshot.metadata.fromCache });
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
};

export const upsertCloudExam = async (
  userId: string,
  exam: Exam,
): Promise<void> => {
  const examsCollection = getUserExamsCollection(userId);
  if (examsCollection && isFirebaseConfigured) {
    await setDoc(
      doc(examsCollection, exam.id),
      { ...exam, ownerId: userId },
      { merge: true },
    );
    return;
  }

  const current = await readLocalExams(userId);
  const next = (() => {
    const index = current.findIndex((item) => item.id === exam.id);
    if (index >= 0) {
      const copy = [...current];
      copy[index] = {
        ...exam,
        ownerId: userId,
      };
      return copy;
    }
    return [
      ...current,
      {
        ...exam,
        ownerId: userId,
      },
    ];
  })();
  await writeLocalExams(userId, next);
};

export const deleteCloudExam = async (
  userId: string,
  examId: string,
): Promise<void> => {
  const examsCollection = getUserExamsCollection(userId);
  if (examsCollection && isFirebaseConfigured) {
    await deleteDoc(doc(examsCollection, examId));
    return;
  }

  const current = await readLocalExams(userId);
  const next = current.filter((exam) => exam.id !== examId);
  await writeLocalExams(userId, next);
};

export const fetchUserExamsSnapshot = async (userId: string): Promise<Exam[]> => {
  const examsCollection = getUserExamsCollection(userId);
  if (!examsCollection || !isFirebaseConfigured) {
    return readLocalExams(userId);
  }
  const snapshot = await getDocs(examsCollection);
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as Exam;
    return {
      ...data,
      id: docSnapshot.id,
      ownerId: userId,
    };
  });
};

export const deleteAllUserExams = async (userId: string): Promise<void> => {
  const examsCollection = getUserExamsCollection(userId);
  if (examsCollection && isFirebaseConfigured) {
    const snapshot = await getDocs(examsCollection);
    await Promise.all(
      snapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)),
    );
    return;
  }
  await removePersistentItem('exams', userId);
};

export const saveUserExamsLocally = async (
  userId: string,
  exams: Exam[],
): Promise<void> => {
  await writeLocalExams(userId, exams);
};
