type StoreName = 'users' | 'exams';

const DB_NAME = 'omniExamStudio.db';
const DB_VERSION = 1;
const LOCAL_PREFIX = 'omniExamStudio.persist';

type StorageMode = 'indexedDB' | 'localStorage' | 'memory';

let dbPromise: Promise<IDBDatabase> | null = null;
let storageMode: StorageMode | null = null;
const memoryStore: Record<StoreName, Record<string, unknown>> = {
  users: {},
  exams: {},
};

const isIndexedDBAvailable = (): boolean =>
  typeof indexedDB !== 'undefined' && typeof indexedDB.open === 'function';

const isLocalStorageAvailable = (): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const testKey = `${LOCAL_PREFIX}:test`;
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users');
      }
      if (!db.objectStoreNames.contains('exams')) {
        db.createObjectStore('exams');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB error'));
  });

const ensureStorageMode = async (): Promise<StorageMode> => {
  if (storageMode) {
    return storageMode;
  }

  if (isIndexedDBAvailable()) {
    try {
      if (!dbPromise) {
        dbPromise = openDatabase();
      }
      await dbPromise;
      storageMode = 'indexedDB';
      return storageMode;
    } catch {
      dbPromise = null;
    }
  }

  if (isLocalStorageAvailable()) {
    storageMode = 'localStorage';
    return storageMode;
  }

  storageMode = 'memory';
  return storageMode;
};

const wrapRequest = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request error'));
  });

const withIndexedDBStore = async <T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T>,
): Promise<T> => {
  if (!dbPromise) {
    dbPromise = openDatabase();
  }
  const db = await dbPromise;
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    transaction.oncomplete = () => {
      // noop
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    };
    const store = transaction.objectStore(storeName);
    fn(store)
      .then((result) => resolve(result))
      .catch((error) => reject(error));
  });
};

const getLocalStorageKey = (store: StoreName) => `${LOCAL_PREFIX}:${store}`;

const readLocalStorageStore = <T>(store: StoreName): Record<string, T> => {
  try {
    const payload = window.localStorage.getItem(getLocalStorageKey(store));
    if (!payload) {
      return {};
    }
    return JSON.parse(payload) as Record<string, T>;
  } catch {
    return {};
  }
};

const writeLocalStorageStore = <T>(store: StoreName, data: Record<string, T>) => {
  try {
    window.localStorage.setItem(getLocalStorageKey(store), JSON.stringify(data));
  } catch {
    // noop
  }
};

export const requestPersistentStorageAccess = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) {
    return false;
  }
  try {
    const alreadyPersisted = await navigator.storage.persisted();
    if (alreadyPersisted) {
      return true;
    }
    return navigator.storage.persist();
  } catch {
    return false;
  }
};

export const getPersistentItem = async <T>(
  store: StoreName,
  key: string,
): Promise<T | undefined> => {
  const mode = await ensureStorageMode();
  if (mode === 'indexedDB') {
    return withIndexedDBStore(store, 'readonly', async (objectStore) => {
      const request = objectStore.get(key);
      const result = await wrapRequest<T | undefined>(request);
      return result ?? undefined;
    });
  }
  if (mode === 'localStorage') {
    const storeData = readLocalStorageStore<T>(store);
    return storeData[key];
  }
  return memoryStore[store][key] as T | undefined;
};

export const setPersistentItem = async <T>(
  store: StoreName,
  key: string,
  value: T,
): Promise<void> => {
  const mode = await ensureStorageMode();
  if (mode === 'indexedDB') {
    await withIndexedDBStore(store, 'readwrite', async (objectStore) => {
      const request = objectStore.put(value, key);
      await wrapRequest(request);
      return undefined;
    });
    return;
  }
  if (mode === 'localStorage') {
    const storeData = readLocalStorageStore<T>(store);
    storeData[key] = value;
    writeLocalStorageStore(store, storeData);
    return;
  }
  memoryStore[store][key] = value as unknown;
};

export const removePersistentItem = async (store: StoreName, key: string): Promise<void> => {
  const mode = await ensureStorageMode();
  if (mode === 'indexedDB') {
    await withIndexedDBStore(store, 'readwrite', async (objectStore) => {
      const request = objectStore.delete(key);
      await wrapRequest(request);
      return undefined;
    });
    return;
  }
  if (mode === 'localStorage') {
    const storeData = readLocalStorageStore(store);
    delete storeData[key];
    writeLocalStorageStore(store, storeData);
    return;
  }
  delete memoryStore[store][key];
};

export const getAllPersistentItems = async <T>(
  store: StoreName,
): Promise<Array<{ key: string; value: T }>> => {
  const mode = await ensureStorageMode();
  if (mode === 'indexedDB') {
    return withIndexedDBStore(store, 'readonly', async (objectStore) => {
      const records: Array<{ key: string; value: T }> = [];
      const request = objectStore.openCursor();
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            records.push({
              key: String(cursor.key),
              value: cursor.value as T,
            });
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error ?? new Error('IndexedDB cursor error'));
      });
      return records;
    });
  }
  if (mode === 'localStorage') {
    const storeData = readLocalStorageStore<T>(store);
    return Object.entries(storeData).map(([key, value]) => ({
      key,
      value,
    }));
  }
  return Object.entries(memoryStore[store]).map(([key, value]) => ({
    key,
    value: value as T,
  }));
};

export const clearPersistentStore = async (store: StoreName): Promise<void> => {
  const mode = await ensureStorageMode();
  if (mode === 'indexedDB') {
    await withIndexedDBStore(store, 'readwrite', async (objectStore) => {
      const request = objectStore.clear();
      await wrapRequest(request);
      return undefined;
    });
    return;
  }
  if (mode === 'localStorage') {
    writeLocalStorageStore(store, {});
    return;
  }
  memoryStore[store] = {};
};

export type { StoreName as PersistentStoreName };
