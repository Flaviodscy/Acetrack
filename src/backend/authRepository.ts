import { getFirebaseAuth, isFirebaseConfigured } from "./firebaseClient";
import type { User } from "firebase/auth";

const LOCAL_USER_KEY = "acetrack:local-user-id";
const AUTH_STATE_TIMEOUT_MS = 1600;

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
    const credential = await signInAnonymously(auth);
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
  const emailCredential = EmailAuthProvider.credential(email, password);
  const credential = auth.currentUser?.isAnonymous
    ? await linkWithCredential(auth.currentUser, emailCredential)
    : await createUserWithEmailAndPassword(auth, email, password);
  return mapFirebaseUser(credential.user);
}

export async function signInWithEmail(email: string, password: string): Promise<AppUser> {
  const auth = await getFirebaseAuth();
  if (!auth) return getLocalUser();

  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return mapFirebaseUser(credential.user);
}

export async function sendPasswordReset(email: string) {
  const auth = await getFirebaseAuth();
  if (!auth) return;

  const { sendPasswordResetEmail } = await import("firebase/auth");
  await sendPasswordResetEmail(auth, email);
}

export async function signOutAppUser() {
  const auth = await getFirebaseAuth();
  if (!auth) return;

  const { signOut } = await import("firebase/auth");
  await signOut(auth);
}

function getLocalUser(): AppUser {
  let id = window.localStorage.getItem(LOCAL_USER_KEY);
  if (!id) {
    id = `local-${crypto.randomUUID()}`;
    window.localStorage.setItem(LOCAL_USER_KEY, id);
  }

  return { id, isAnonymous: true, mode: "local" };
}
