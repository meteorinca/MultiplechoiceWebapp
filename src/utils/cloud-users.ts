import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type FirestoreError,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { UserAccount, UserRole } from '../types/user';
import {
  getAllPersistentItems,
  getPersistentItem,
  removePersistentItem,
  requestPersistentStorageAccess,
  setPersistentItem,
} from './persistent-store';

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

const getUsersCollection = () => {
  if (!db) {
    return null;
  }
  return collection(db, USERS_COLLECTION);
};

const getUserDocRef = (login: string) => {
  const usersCollection = getUsersCollection();
  if (!usersCollection || !isFirebaseConfigured) {
    return null;
  }
  return doc(usersCollection, login);
};

const fetchAllFirestoreUsers = async (): Promise<Record<string, StoredUserRecord>> => {
  const usersCollection = getUsersCollection();
  if (!usersCollection || !isFirebaseConfigured) {
    return {};
  }
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
};

const readLocalUsers = async (): Promise<Record<string, StoredUserRecord>> => {
  const entries = await getAllPersistentItems<StoredUserRecord>('users');
  return entries.reduce<Record<string, StoredUserRecord>>((accumulator, entry) => {
    accumulator[entry.key] = entry.value;
    return accumulator;
  }, {});
};

const readUserRecord = async (
  login: string,
): Promise<StoredUserRecord | null> => {
  const normalized = normalizeLogin(login);
  const docRef = getUserDocRef(normalized);
  if (docRef) {
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data() as StoredUserRecord;
      return {
        ...data,
        id: normalized,
        login: normalized,
      };
    }
    return null;
  }

  const stored = await getPersistentItem<StoredUserRecord>('users', normalized);
  return stored
    ? {
        ...stored,
        id: normalized,
        login: normalized,
      }
    : null;
};

const persistUserRecord = async (
  record: StoredUserRecord,
): Promise<void> => {
  const docRef = getUserDocRef(record.login);
  if (docRef) {
    await setDoc(docRef, record, { merge: true });
    return;
  }

  await setPersistentItem('users', record.login, record);
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

export const authenticateUser = async (
  login: string,
  password: string,
): Promise<UserAccount> => {
  const normalizedLogin = normalizeLogin(login);
  if (!normalizedLogin) {
    throw new UserAuthError('Enter your login to continue.');
  }

  const record = await readUserRecord(normalizedLogin);
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
  if (isFirebaseConfigured) {
    const users = await fetchAllFirestoreUsers();
    return Object.values(users)
      .map((record) => stripSensitive(record))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  const localUsers = await readLocalUsers();
  return Object.values(localUsers)
    .map((record) => stripSensitive(record))
    .sort((a, b) => a.createdAt - b.createdAt);
};

export const deleteUserAccount = async (login: string): Promise<void> => {
  const normalizedLogin = normalizeLogin(login);
  assertAdminLogin(normalizedLogin);

  const docRef = getUserDocRef(normalizedLogin);
  if (docRef) {
    await deleteDoc(docRef);
    return;
  }

  await removePersistentItem('users', normalizedLogin);
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
  await requestPersistentStorageAccess();
  const existing = await readUserRecord(ADMIN_LOGIN);
  if (existing) {
    if (existing.role !== ADMIN_ROLE) {
      await persistUserRecord({
        ...existing,
        role: ADMIN_ROLE,
      });
    }
    return stripSensitive({
      ...existing,
      role: ADMIN_ROLE,
    });
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
  return stripSensitive(adminRecord);
};

export const getIsDatabaseEnabled = (): boolean => true;
