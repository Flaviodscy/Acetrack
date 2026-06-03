import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export async function getFirebaseApp() {
  if (!isFirebaseConfigured()) return undefined;
  const { initializeApp } = await import("firebase/app");
  app ??= initializeApp(firebaseConfig);
  return app;
}

export async function getFirebaseDb() {
  const firebaseApp = await getFirebaseApp();
  if (!firebaseApp) return undefined;
  const { getFirestore } = await import("firebase/firestore");
  db ??= getFirestore(firebaseApp);
  return db;
}

export async function getFirebaseAuth() {
  const firebaseApp = await getFirebaseApp();
  if (!firebaseApp) return undefined;
  const { getAuth } = await import("firebase/auth");
  auth ??= getAuth(firebaseApp);
  return auth;
}
