declare global {
  interface Window {
    __firebaseConfigReady__?: Promise<unknown>;
  }
}

const startApp = async () => {
  try {
    if (window.__firebaseConfigReady__) {
      await window.__firebaseConfigReady__;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Firebase config did not load from hosting defaults.', error);
  }
  await import('./main');
};

void startApp();

export {};
