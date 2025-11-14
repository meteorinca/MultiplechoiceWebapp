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
import { db, disableFirebase, isFirebaseConfigured } from '../lib/firebase';
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

let firestoreHealthy = true;

const canUseFirestore = () =>
  firestoreHealthy && isFirebaseConfigured() && Boolean(db);

const markFirestoreError = (error: unknown) => {
  firestoreHealthy = false;
  disableFirebase();
  // eslint-disable-next-line no-console
  console.warn('Firestore unavailable. Falling back to local exams.', error);
};

const getUserExamsCollection = (userId: string) => {
  if (!db || !userId || !canUseFirestore()) {
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
  if (!examsCollection) {
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
      markFirestoreError(error);
      if (onError) {
        onError(error);
      }
      void (async () => {
        const exams = await readLocalExams(userId);
        onChange(exams, { fromCache: false });
      })();
    },
  );
};

export const upsertCloudExam = async (
  userId: string,
  exam: Exam,
): Promise<void> => {
  const examsCollection = getUserExamsCollection(userId);
  if (examsCollection) {
    try {
      await setDoc(
        doc(examsCollection, exam.id),
        { ...exam, ownerId: userId },
        { merge: true },
      );
      return;
    } catch (error) {
      markFirestoreError(error);
    }
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
  if (examsCollection) {
    try {
      await deleteDoc(doc(examsCollection, examId));
      return;
    } catch (error) {
      markFirestoreError(error);
    }
  }

  const current = await readLocalExams(userId);
  const next = current.filter((exam) => exam.id !== examId);
  await writeLocalExams(userId, next);
};

export const fetchUserExamsSnapshot = async (userId: string): Promise<Exam[]> => {
  const examsCollection = getUserExamsCollection(userId);
  if (!examsCollection) {
    return readLocalExams(userId);
  }
  try {
    const snapshot = await getDocs(examsCollection);
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as Exam;
      return {
        ...data,
        id: docSnapshot.id,
        ownerId: userId,
      };
    });
  } catch (error) {
    markFirestoreError(error);
    return readLocalExams(userId);
  }
};

export const deleteAllUserExams = async (userId: string): Promise<void> => {
  const examsCollection = getUserExamsCollection(userId);
  if (examsCollection) {
    try {
      const snapshot = await getDocs(examsCollection);
      await Promise.all(
        snapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)),
      );
      return;
    } catch (error) {
      markFirestoreError(error);
    }
  }
  await removePersistentItem('exams', userId);
};

export const saveUserExamsLocally = async (
  userId: string,
  exams: Exam[],
): Promise<void> => {
  await writeLocalExams(userId, exams);
};
