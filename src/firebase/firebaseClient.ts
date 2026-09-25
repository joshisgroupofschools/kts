import { initializeApp } from 'firebase/app';
import { getFirestore, disableNetwork } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

export function disableFirestoreNetwork() {
  try {
    disableNetwork(db).catch(() => {});
  } catch (e) {
    // Ignore error
  }
}

if (typeof window !== 'undefined' && localStorage.getItem('sfc_migration_skipped') === 'true') {
  disableFirestoreNetwork();
}

export const COLLECTION_ID = 'kakatiya_school_ledger_v2';
export const DOC_ID = 'main_data_state';
