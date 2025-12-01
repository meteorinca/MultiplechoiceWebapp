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
import { CLOUD_SYNC_REQUIRED_MESSAGE } from '../config/cloud';
import { db, disableFirebase, isFirebaseConfigured } from '../lib/firebase';
import type { WhiteboardDocument } from '../types/whiteboard';

export type WhiteboardsListener = (
  boards: WhiteboardDocument[],
  metadata: { fromCache: boolean },
) => void;

export type WhiteboardsErrorListener = (error: FirestoreError) => void;

const USERS_COLLECTION = 'users';
const WHITEBOARDS_COLLECTION = 'whiteboards';

let firestoreHealthy = true;

const canUseFirestore = () => firestoreHealthy && isFirebaseConfigured() && Boolean(db);

const markFirestoreError = (error: unknown) => {
  firestoreHealthy = false;
  disableFirebase();
  // eslint-disable-next-line no-console
  console.warn('Firestore unavailable for whiteboards. Please check your Firebase configuration.', error);
};

const getUserWhiteboardsCollection = (userId: string) => {
  if (!db || !userId || !canUseFirestore()) {
    return null;
  }
  return collection(db, USERS_COLLECTION, userId, WHITEBOARDS_COLLECTION);
};

const requireUserWhiteboardsCollection = (userId: string) => {
  const boardsCollection = getUserWhiteboardsCollection(userId);
  if (!boardsCollection) {
    throw new Error(CLOUD_SYNC_REQUIRED_MESSAGE);
  }
  return boardsCollection;
};

const sanitizeWhiteboard = (board: WhiteboardDocument) => {
  const sanitized: Record<string, unknown> = { ...board };
  // Remove undefined optional fields so we don't overwrite existing data unintentionally
  if (typeof board.imageUrl === 'undefined') {
    delete sanitized.imageUrl;
  }
  return sanitized;
};

export const subscribeToWhiteboards = (
  userId: string,
  onChange: WhiteboardsListener,
  onError?: WhiteboardsErrorListener,
): Unsubscribe => {
  let boardsCollection;
  try {
    boardsCollection = requireUserWhiteboardsCollection(userId);
  } catch (error) {
    if (onError) {
      onError({
        code: 'unavailable',
        message: error instanceof Error ? error.message : CLOUD_SYNC_REQUIRED_MESSAGE,
        name: 'FirestoreError',
      } as FirestoreError);
    }
    return () => {};
  }

  return onSnapshot(
    boardsCollection,
    (snapshot) => {
      const boards = snapshot.docs
        .map((docSnapshot) => {
          const data = docSnapshot.data() as WhiteboardDocument;
          return {
            ...data,
            id: docSnapshot.id,
            userId,
          };
        })
        .sort((a, b) => b.updatedAt - a.updatedAt);
      onChange(boards, { fromCache: snapshot.metadata.fromCache });
    },
    (error) => {
      markFirestoreError(error);
      if (onError) {
        onError(error);
      }
    },
  );
};

export const upsertWhiteboard = async (
  userId: string,
  board: WhiteboardDocument,
): Promise<void> => {
  if (!userId || !board.id) {
    throw new Error('Invalid whiteboard data: userId and board.id are required.');
  }
  // Ensure the board's userId matches the provided userId
  if (board.userId !== userId) {
    throw new Error('Whiteboard userId must match the provided userId.');
  }
  const boardsCollection = requireUserWhiteboardsCollection(userId);
  try {
    await setDoc(doc(boardsCollection, board.id), sanitizeWhiteboard(board), { merge: true });
  } catch (error) {
    // Don't mark Firestore as unhealthy for permission errors - those are expected
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'permission-denied') {
      markFirestoreError(error);
    }
    throw error;
  }
};

export const deleteWhiteboard = async (
  userId: string,
  boardId: string,
): Promise<void> => {
  const boardsCollection = requireUserWhiteboardsCollection(userId);
  try {
    await deleteDoc(doc(boardsCollection, boardId));
  } catch (error) {
    markFirestoreError(error);
    throw error;
  }
};

export const fetchUserWhiteboardsSnapshot = async (
  userId: string,
): Promise<WhiteboardDocument[]> => {
  const boardsCollection = requireUserWhiteboardsCollection(userId);
  try {
    const snapshot = await getDocs(boardsCollection);
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as WhiteboardDocument;
      return {
        ...data,
        id: docSnapshot.id,
        userId,
      };
    });
  } catch (error) {
    markFirestoreError(error);
    throw error;
  }
};
