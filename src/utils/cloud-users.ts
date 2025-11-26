import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type FirestoreError,
} from 'firebase/firestore';
import { db, disableFirebase, isFirebaseConfigured } from '../lib/firebase';
import type { UserAccount, UserRole } from '../types/user';
import { CLOUD_SYNC_REQUIRED_MESSAGE } from '../config/cloud';

type StoredUserRecord = UserAccount & {
  passwordHash: string;
};

const USERS_COLLECTION = 'users';
const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'chingon';
const ADMIN_DISPLAY_NAME = 'Administrator';
const ADMIN_ROLE: UserRole = 'admin';
const normalizeLogin = (rawLogin: string): string =>
  rawLogin.trim().toLowerCase();

const now = () => Date.now();

const textEncoder = (() => {
  try {
    return new TextEncoder();
  } catch {
    return null;
  }
})();

const hashPassword = async (password: string): Promise<string> => {
  const cryptoApi = globalThis?.crypto?.subtle;
  if (cryptoApi && textEncoder) {
    const encoded = textEncoder.encode(password);
    const digest = await cryptoApi.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  if (typeof btoa === 'function') {
    return btoa(password);
  }

  return password;
};

let firestoreHealthy = true;

const canUseFirestore = () => firestoreHealthy && isFirebaseConfigured() && Boolean(db);

const markFirestoreError = (error: unknown) => {
  firestoreHealthy = false;
  disableFirebase();
  // eslint-disable-next-line no-console
  console.warn('Firestore unavailable. Please check your Firebase configuration.', error);
};

const getUsersCollection = () => {
  if (!canUseFirestore() || !db) {
    return null;
  }
  return collection(db, USERS_COLLECTION);
};

const getUserDocRef = (login: string) => {
  const usersCollection = getUsersCollection();
  if (!usersCollection) {
    return null;
  }
  try {
    return doc(usersCollection, login);
  } catch (error) {
    markFirestoreError(error);
    return null;
  }
};

const fetchAllFirestoreUsers = async (): Promise<Record<string, StoredUserRecord>> => {
  const usersCollection = getUsersCollection();
  if (!usersCollection) {
    throw new UserAuthError(CLOUD_SYNC_REQUIRED_MESSAGE);
  }
  try {
    const snapshot = await getDocs(usersCollection);
    const result: Record<string, StoredUserRecord> = {};
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as StoredUserRecord;
      result[docSnapshot.id] = {
        ...data,
        id: docSnapshot.id,
        login: docSnapshot.id,
      };
    });
    return result;
  } catch (error) {
    markFirestoreError(error);
    throw new UserAuthError('Unable to list users from Firestore.', error as FirestoreError);
  }
};

const readUserRecord = async (
  login: string,
): Promise<StoredUserRecord | null> => {
  const normalized = normalizeLogin(login);
  const docRef = getUserDocRef(normalized);
  if (!docRef) {
    throw new UserAuthError(CLOUD_SYNC_REQUIRED_MESSAGE);
  }
  try {
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data() as StoredUserRecord;
      return {
        ...data,
        id: normalized,
        login: normalized,
      };
    }
  } catch (error) {
    markFirestoreError(error);
    throw new UserAuthError('Unable to read user from Firestore.', error as FirestoreError);
  }
  return null;
};

const persistUserRecord = async (
  record: StoredUserRecord,
): Promise<void> => {
  const docRef = getUserDocRef(record.login);
  if (!docRef) {
    throw new UserAuthError(CLOUD_SYNC_REQUIRED_MESSAGE);
  }
  try {
    await setDoc(docRef, record, { merge: true });
  } catch (error) {
    markFirestoreError(error);
    throw new UserAuthError('Unable to write user to Firestore.', error as FirestoreError);
  }
};

const stripSensitive = (record: StoredUserRecord): UserAccount => ({
  id: record.id,
  login: record.login,
  displayName: record.displayName,
  createdAt: record.createdAt,
  lastLoginAt: record.lastLoginAt,
  role: record.role,
});

const assertAdminLogin = (login: string) => {
  const normalized = normalizeLogin(login);
  if (normalized === ADMIN_LOGIN) {
    throw new UserAuthError('The admin account is managed internally.');
  }
};

export class UserAuthError extends Error {
  constructor(message: string, public readonly cause?: FirestoreError) {
    super(message);
    this.name = 'UserAuthError';
  }
}

export type RegistrationPayload = {
  login: string;
  password: string;
  displayName: string;
};

export const registerUser = async ({
  login,
  password,
  displayName,
}: RegistrationPayload): Promise<UserAccount> => {
  const normalizedLogin = normalizeLogin(login);
  if (!normalizedLogin) {
    throw new UserAuthError('Login is required.');
  }
  if (normalizedLogin === ADMIN_LOGIN) {
    throw new UserAuthError('That login is reserved.');
  }
  const trimmedDisplayName = displayName.trim();
  if (!trimmedDisplayName) {
    throw new UserAuthError('Display name is required.');
  }
  const passwordHash = await hashPassword(password);
  const existingRecord = await readUserRecord(normalizedLogin);
  if (existingRecord) {
    throw new UserAuthError('That login is already in use.');
  }

  const timestamp = now();
  const record: StoredUserRecord = {
    id: normalizedLogin,
    login: normalizedLogin,
    displayName: trimmedDisplayName,
    passwordHash,
    createdAt: timestamp,
    lastLoginAt: timestamp,
    role: 'user',
  };

  await persistUserRecord(record);
  return stripSensitive(record);
};

const ensureAdminRecord = async (): Promise<StoredUserRecord> => {
  const existing = await readUserRecord(ADMIN_LOGIN);
  if (existing) {
    if (existing.role !== ADMIN_ROLE) {
      const updated: StoredUserRecord = {
        ...existing,
        role: ADMIN_ROLE,
      };
      await persistUserRecord(updated);
      return updated;
    }
    return existing;
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const timestamp = now();
  const adminRecord: StoredUserRecord = {
    id: ADMIN_LOGIN,
    login: ADMIN_LOGIN,
    displayName: ADMIN_DISPLAY_NAME,
    role: ADMIN_ROLE,
    createdAt: timestamp,
    lastLoginAt: timestamp,
    passwordHash,
  };
  await persistUserRecord(adminRecord);
  return adminRecord;
};

export const authenticateUser = async (
  login: string,
  password: string,
): Promise<UserAccount> => {
  const normalizedLogin = normalizeLogin(login);
  if (!normalizedLogin) {
    throw new UserAuthError('Enter your login to continue.');
  }

  let record = await readUserRecord(normalizedLogin);
  if (!record && normalizedLogin === ADMIN_LOGIN) {
    record = await ensureAdminRecord();
  }
  if (!record) {
    throw new UserAuthError('We could not find that login.');
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== record.passwordHash) {
    throw new UserAuthError('Incorrect password.');
  }

  const updated: StoredUserRecord = {
    ...record,
    lastLoginAt: now(),
  };

  await persistUserRecord(updated);
  return stripSensitive(updated);
};

export const listUsers = async (): Promise<UserAccount[]> => {
  const users = await fetchAllFirestoreUsers();
  return Object.values(users)
    .map((record) => stripSensitive(record))
    .sort((a, b) => a.createdAt - b.createdAt);
};

export const deleteUserAccount = async (login: string): Promise<void> => {
  const normalizedLogin = normalizeLogin(login);
  assertAdminLogin(normalizedLogin);

  const docRef = getUserDocRef(normalizedLogin);
  if (!docRef) {
    throw new UserAuthError(CLOUD_SYNC_REQUIRED_MESSAGE);
  }
  try {
    await deleteDoc(docRef);
  } catch (error) {
    markFirestoreError(error);
    throw new UserAuthError('Unable to delete user in Firestore.', error as FirestoreError);
  }
};

export const resetUserPassword = async (
  login: string,
  newPassword: string,
): Promise<void> => {
  const normalizedLogin = normalizeLogin(login);
  const record = await readUserRecord(normalizedLogin);
  if (!record) {
    throw new UserAuthError('User not found.');
  }
  const passwordHash = await hashPassword(newPassword);
  await persistUserRecord({
    ...record,
    passwordHash,
  });
};

export const ensureAdminAccount = async (): Promise<UserAccount> => {
  const record = await ensureAdminRecord();
  return stripSensitive(record);
};

export const getIsDatabaseEnabled = (): boolean => canUseFirestore();
