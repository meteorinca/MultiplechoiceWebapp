import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

type HostingDefaults = {
  config?: FirebaseOptions;
};

declare global {
  // Provided automatically when hosting on Firebase
  // eslint-disable-next-line no-var
  var __FIREBASE_DEFAULTS__: HostingDefaults | undefined;
  // eslint-disable-next-line no-var
  var __FIREBASE_CONFIG__: FirebaseOptions | undefined;
}

const envConfig = (() => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    return null;
  }
  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  } as FirebaseOptions;
})();

const hostingConfig = (() => {
  if (typeof globalThis === 'undefined') {
    return null;
  }
  const defaults = globalThis.__FIREBASE_DEFAULTS__?.config;
  if (defaults?.projectId) {
    return defaults;
  }
  const compatConfig = globalThis.__FIREBASE_CONFIG__;
  if (compatConfig?.projectId) {
    return compatConfig;
  }
  return null;
})();

const firebaseConfig = envConfig ?? hostingConfig ?? null;

export let app: FirebaseApp | undefined;
export let db: Firestore | null = null;
let firebaseReady = false;

if (firebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    firebaseReady = true;
  } catch (error) {
    firebaseReady = false;
    db = null;
    // eslint-disable-next-line no-console
    console.warn('Failed to initialize Firebase. Falling back to local data.', error);
  }
}

export const isFirebaseConfigured = (): boolean => firebaseReady && Boolean(db);
export const disableFirebase = (): void => {
  firebaseReady = false;
  db = null;
};
export const firebaseConfigSource = envConfig
  ? 'env'
  : hostingConfig
    ? 'hosting'
    : 'none';
