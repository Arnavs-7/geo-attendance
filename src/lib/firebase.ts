import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { env } from "@/lib/env";

const firebaseConfig = {
  apiKey: env.firebase.apiKey,
  authDomain: env.firebase.authDomain,
  projectId: env.firebase.projectId,
  storageBucket: env.firebase.storageBucket,
  messagingSenderId: env.firebase.messagingSenderId,
  appId: env.firebase.appId,
  measurementId: env.firebase.measurementId,
};

// Initialize Firebase — safe for both client and server (build-time prerender)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  // During build-time prerender, Firebase may fail due to missing env vars.
  // This is expected — the app will re-initialize on the client at runtime.
  console.warn("Firebase initialization failed (expected during build):", (error as Error).message);
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
}

export { auth, db };
