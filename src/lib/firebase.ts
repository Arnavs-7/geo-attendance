import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

if (typeof window !== 'undefined') {
  console.log("Firebase Env Debug:", {
    apiKeyLen: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.length || 0,
    authDomainLen: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.length || 0,
    projectIdLen: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.length || 0,
    storageBucketLen: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.length || 0,
    messagingSenderIdLen: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.length || 0,
    appIdLen: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.length || 0,
  });
}

// Initialize Firebase — safe for both client and server (build-time prerender)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  const errMsg = (error as Error).message;
  // During build-time prerender, Firebase may fail due to missing env vars.
  console.warn("Firebase initialization failed:", errMsg);

  // AGGRESSIVE DEBUG: Force a popup in the browser so the user can't miss it
  if (typeof window !== 'undefined') {
    window.alert(
      "🔴 FIREBASE INIT FAILED!\n\n" +
      "Error: " + errMsg + "\n\n" +
      "API Key length: " + (process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.length || 0) + "\n" +
      "Project ID length: " + (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.length || 0)
    );
  }

  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
}

export { auth, db };
