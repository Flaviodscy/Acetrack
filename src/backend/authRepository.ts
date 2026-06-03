import { getFirebaseAuth, isFirebaseConfigured } from "./firebaseClient";

const LOCAL_USER_KEY = "acetrack:local-user-id";

export type AppUser = {
  id: string;
  isAnonymous: boolean;
  mode: "firebase" | "local";
};

export async function getCurrentAppUser(): Promise<AppUser> {
  if (!isFirebaseConfigured()) {
    return getLocalUser();
  }

  const auth = await getFirebaseAuth();
  if (!auth) return getLocalUser();

  if (auth.currentUser) {
    return { id: auth.currentUser.uid, isAnonymous: auth.currentUser.isAnonymous, mode: "firebase" };
  }

  try {
    const { signInAnonymously } = await import("firebase/auth");
    const credential = await signInAnonymously(auth);
    return { id: credential.user.uid, isAnonymous: credential.user.isAnonymous, mode: "firebase" };
  } catch (error) {
    console.warn("Firebase auth failed, falling back to local user.", error);
    return getLocalUser();
  }
}

export async function createEmailAccount(email: string, password: string): Promise<AppUser> {
  const auth = await getFirebaseAuth();
  if (!auth) return getLocalUser();

  const { createUserWithEmailAndPassword } = await import("firebase/auth");
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return { id: credential.user.uid, isAnonymous: credential.user.isAnonymous, mode: "firebase" };
}

export async function signInWithEmail(email: string, password: string): Promise<AppUser> {
  const auth = await getFirebaseAuth();
  if (!auth) return getLocalUser();

  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return { id: credential.user.uid, isAnonymous: credential.user.isAnonymous, mode: "firebase" };
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
