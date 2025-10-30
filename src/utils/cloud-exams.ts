import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Exam } from '../types/question';
import { db, isFirebaseConfigured } from '../lib/firebase';

export type ExamsListener = (
  exams: Exam[],
  metadata: { fromCache: boolean },
) => void;

export type ExamsErrorListener = (error: FirestoreError) => void;

const COLLECTION_NAME = 'exams';

const getExamsCollection = () => {
  if (!db) {
    return null;
  }
  return collection(db, COLLECTION_NAME);
};

export const subscribeToCloudExams = (
  onChange: ExamsListener,
  onError?: ExamsErrorListener,
): Unsubscribe => {
  const examsCollection = getExamsCollection();
  if (!examsCollection || !isFirebaseConfigured) {
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

export const upsertCloudExam = async (exam: Exam): Promise<void> => {
  const examsCollection = getExamsCollection();
  if (!examsCollection || !isFirebaseConfigured) {
    return;
  }
  await setDoc(doc(examsCollection, exam.id), exam, { merge: true });
};

export const deleteCloudExam = async (examId: string): Promise<void> => {
  const examsCollection = getExamsCollection();
  if (!examsCollection || !isFirebaseConfigured) {
    return;
  }
  await deleteDoc(doc(examsCollection, examId));
};
