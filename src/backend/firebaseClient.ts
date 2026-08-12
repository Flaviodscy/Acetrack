import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

// Fallback configuration for React Native and Web
const firebaseConfig = {
  apiKey: typeof process !== "undefined" && process.env?.EXPO_PUBLIC_FIREBASE_API_KEY
    ? process.env.EXPO_PUBLIC_FIREBASE_API_KEY
    : "AIzaSyDQKCo2qfYPdPIzt0_LeRwTX3mkR4wzBS4",
  authDomain: typeof process !== "undefined" && process.env?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
    ? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
    : "acetrack-flavio.firebaseapp.com",
  projectId: typeof process !== "undefined" && process.env?.EXPO_PUBLIC_FIREBASE_PROJECT_ID
    ? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
    : "acetrack-flavio",
  storageBucket: typeof process !== "undefined" && process.env?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
    ? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
    : "acetrack-flavio.firebasestorage.app",
  messagingSenderId: typeof process !== "undefined" && process.env?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ? process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    : "374577491758",
  appId: typeof process !== "undefined" && process.env?.EXPO_PUBLIC_FIREBASE_APP_ID
    ? process.env.EXPO_PUBLIC_FIREBASE_APP_ID
    : "1:374577491758:web:5e254a6402e9d1d1c594bf"
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export async function getFirebaseApp() {
  if (!isFirebaseConfigured()) return undefined;
  const { initializeApp, getApps, getApp } = await import("firebase/app");
  if (getApps().length > 0) {
    app = getApp();
  } else {
    app = initializeApp(firebaseConfig);
  }
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

