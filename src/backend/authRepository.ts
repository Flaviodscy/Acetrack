import { getFirebaseAuth, isFirebaseConfigured } from "./firebaseClient";
import type { User } from "firebase/auth";

const LOCAL_USER_KEY = "acetrack:local-user-id";
const AUTH_STATE_TIMEOUT_MS = 1600;
const FIREBASE_AUTH_TIMEOUT_MS = 12000;

export type AppUser = {
  email?: string | null;
  id: string;
  isAnonymous: boolean;
  mode: "firebase" | "local";
};

function mapFirebaseUser(user: User): AppUser {
  return { email: user.email, id: user.uid, isAnonymous: user.isAnonymous, mode: "firebase" };
}

export async function getSignedInAppUser(): Promise<AppUser | undefined> {
  if (!isFirebaseConfigured()) return undefined;

  const auth = await getFirebaseAuth();
  if (!auth) return undefined;
  if (auth.currentUser) {
    return mapFirebaseUser(auth.currentUser);
  }

  const { onAuthStateChanged } = await import("firebase/auth");
  return new Promise((resolve) => {
    let isResolved = false;
    let timeoutId: number;
    let unsubscribe = () => {};
    const finish = (user: User | null) => {
      if (isResolved) return;
      isResolved = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      unsubscribe();
      resolve(user ? mapFirebaseUser(user) : undefined);
    };

    unsubscribe = onAuthStateChanged(auth, (user) => {
      finish(user);
    });
    timeoutId = window.setTimeout(() => finish(auth.currentUser), AUTH_STATE_TIMEOUT_MS);
  });
}

export async function subscribeToAppAuthState(
  onChange: (appUser: AppUser | undefined) => void,
  onError?: (error: unknown) => void
) {
  if (!isFirebaseConfigured()) {
    onChange(undefined);
    return () => {};
  }

  const auth = await getFirebaseAuth();
  if (!auth) {
    onChange(undefined);
    return () => {};
  }

  const { onAuthStateChanged } = await import("firebase/auth");
  return onAuthStateChanged(
    auth,
    (user) => onChange(user ? mapFirebaseUser(user) : undefined),
    (error) => onError?.(error)
  );
}

export async function getCurrentAppUser(): Promise<AppUser> {
  if (!isFirebaseConfigured()) {
    return getLocalUser();
  }

  const auth = await getFirebaseAuth();
  if (!auth) return getLocalUser();

  if (auth.currentUser) {
    return mapFirebaseUser(auth.currentUser);
  }

  try {
    const { signInAnonymously } = await import("firebase/auth");
    const credential = await withAuthTimeout(signInAnonymously(auth), "Guest session");
    return mapFirebaseUser(credential.user);
  } catch (error) {
    console.warn("Firebase auth failed, falling back to local user.", error);
    return getLocalUser();
  }
}

export async function createEmailAccount(email: string, password: string): Promise<AppUser> {
  const auth = await getFirebaseAuth();
  if (!auth) return getLocalUser();

  const { createUserWithEmailAndPassword, EmailAuthProvider, linkWithCredential } = await import("firebase/auth");
  const normalizedEmail = normalizeEmail(email);
  const emailCredential = EmailAuthProvider.credential(normalizedEmail, password);
  const credential = auth.currentUser?.isAnonymous
    ? await withAuthTimeout(linkWithCredential(auth.currentUser, emailCredential), "Account creation")
    : await withAuthTimeout(createUserWithEmailAndPassword(auth, normalizedEmail, password), "Account creation");
  return mapFirebaseUser(credential.user);
}

export async function signInWithEmail(email: string, password: string): Promise<AppUser> {
  const auth = await getFirebaseAuth();
  if (!auth) return getLocalUser();

  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const credential = await withAuthTimeout(signInWithEmailAndPassword(auth, normalizeEmail(email), password), "Sign in");
  return mapFirebaseUser(credential.user);
}

export async function sendPasswordReset(email: string) {
  const auth = await getFirebaseAuth();
  if (!auth) return;

  const { sendPasswordResetEmail } = await import("firebase/auth");
  await withAuthTimeout(sendPasswordResetEmail(auth, normalizeEmail(email)), "Password reset");
}

export async function signOutAppUser() {
  const auth = await getFirebaseAuth();
  if (!auth) return;

  const { signOut } = await import("firebase/auth");
  await withAuthTimeout(signOut(auth), "Sign out");
}

function getLocalUser(): AppUser {
  let id = window.localStorage.getItem(LOCAL_USER_KEY);
  if (!id) {
    id = `local-${crypto.randomUUID()}`;
    window.localStorage.setItem(LOCAL_USER_KEY, id);
  }

  return { id, isAnonymous: true, mode: "local" };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function withAuthTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      const error = new Error(`${label} is taking too long. Check your connection and try again.`);
      (error as Error & { code?: string }).code = "auth/timeout";
      reject(error);
    }, FIREBASE_AUTH_TIMEOUT_MS);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}
