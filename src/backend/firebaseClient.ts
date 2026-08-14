import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { getFirebaseEnvConfig, isFirebaseEnvConfigured } from "../config/firebaseEnv";

const firebaseConfig = getFirebaseEnvConfig();

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

export function isFirebaseConfigured() {
  return isFirebaseEnvConfigured(firebaseConfig);
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

