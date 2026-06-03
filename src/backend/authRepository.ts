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

function getLocalUser(): AppUser {
  let id = window.localStorage.getItem(LOCAL_USER_KEY);
  if (!id) {
    id = `local-${crypto.randomUUID()}`;
    window.localStorage.setItem(LOCAL_USER_KEY, id);
  }

  return { id, isAnonymous: true, mode: "local" };
}
