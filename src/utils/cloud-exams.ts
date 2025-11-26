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
import type { Exam, Question } from '../types/question';
import { db, disableFirebase, isFirebaseConfigured } from '../lib/firebase';
import { CLOUD_SYNC_REQUIRED_MESSAGE } from '../config/cloud';

export type ExamsListener = (
  exams: Exam[],
  metadata: { fromCache: boolean },
) => void;

export type ExamsErrorListener = (error: FirestoreError) => void;

const USERS_COLLECTION = 'users';
const EXAMS_COLLECTION = 'exams';

let firestoreHealthy = true;

const sanitizeQuestionForFirestore = (question: Question): Question => {
  const sanitizedQuestion: Question = { ...question };
  if (typeof sanitizedQuestion.imageUrl === 'undefined') {
    delete sanitizedQuestion.imageUrl;
  }
  return sanitizedQuestion;
};

const prepareExamForFirestore = (exam: Exam): Exam => ({
  ...exam,
  questions: exam.questions.map((question) => sanitizeQuestionForFirestore(question)),
});

const canUseFirestore = () =>
  firestoreHealthy && isFirebaseConfigured() && Boolean(db);

const markFirestoreError = (error: unknown) => {
  firestoreHealthy = false;
  disableFirebase();
  // eslint-disable-next-line no-console
  console.warn('Firestore unavailable. Please check your Firebase configuration.', error);
};

const getUserExamsCollection = (userId: string) => {
  if (!db || !userId || !canUseFirestore()) {
    return null;
  }
  return collection(db, USERS_COLLECTION, userId, EXAMS_COLLECTION);
};

const requireUserExamsCollection = (userId: string) => {
  const examsCollection = getUserExamsCollection(userId);
  if (!examsCollection) {
    throw new Error(CLOUD_SYNC_REQUIRED_MESSAGE);
  }
  return examsCollection;
};

export const subscribeToCloudExams = (
  userId: string,
  onChange: ExamsListener,
  onError?: ExamsErrorListener,
): Unsubscribe => {
  let examsCollection;
  try {
    examsCollection = requireUserExamsCollection(userId);
  } catch (error) {
    if (onError) {
      onError(
        {
          code: 'unavailable',
          message:
            error instanceof Error ? error.message : CLOUD_SYNC_REQUIRED_MESSAGE,
          name: 'FirestoreError',
        } as FirestoreError,
      );
    }
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
    },
  );
};

export const upsertCloudExam = async (
  userId: string,
  exam: Exam,
): Promise<void> => {
  const examsCollection = requireUserExamsCollection(userId);
  try {
    const payload = prepareExamForFirestore(exam);
    await setDoc(
      doc(examsCollection, exam.id),
      { ...payload, ownerId: userId },
      { merge: true },
    );
  } catch (error) {
    markFirestoreError(error);
    throw error;
  }
};

export const deleteCloudExam = async (
  userId: string,
  examId: string,
): Promise<void> => {
  const examsCollection = requireUserExamsCollection(userId);
  try {
    await deleteDoc(doc(examsCollection, examId));
  } catch (error) {
    markFirestoreError(error);
    throw error;
  }
};

export const fetchUserExamsSnapshot = async (userId: string): Promise<Exam[]> => {
  const examsCollection = requireUserExamsCollection(userId);
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
    throw error;
  }
};

export const deleteAllUserExams = async (userId: string): Promise<void> => {
  const examsCollection = requireUserExamsCollection(userId);
  try {
    const snapshot = await getDocs(examsCollection);
    await Promise.all(snapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)));
  } catch (error) {
    markFirestoreError(error);
    throw error;
  }
};
