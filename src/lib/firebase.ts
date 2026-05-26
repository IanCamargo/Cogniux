import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getFirebaseConfig } from "@/lib/env";

const { firestoreDatabaseId, ...firebaseConfig } = getFirebaseConfig();

const app = initializeApp(firebaseConfig);

const firestoreSettings = {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
};

function createFirestore() {
  try {
    return firestoreDatabaseId === "(default)"
      ? initializeFirestore(app, firestoreSettings)
      : initializeFirestore(app, firestoreSettings, firestoreDatabaseId);
  } catch {
    return firestoreDatabaseId === "(default)"
      ? getFirestore(app)
      : getFirestore(app, firestoreDatabaseId);
  }
}

export const db = createFirestore();
export const auth = getAuth(app);
