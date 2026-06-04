import { getFirebaseDb } from "./firebaseClient";
import type { AdminUserProfile, BackendMode, UserProfile } from "../types/domain";

const LOCAL_PROFILE_KEY = "acetrack:profile";

export async function loadUserProfile(userId: string): Promise<{ mode: BackendMode; profile?: UserProfile }> {
  const db = await getFirebaseDb();

  if (db) {
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const snapshot = await getDoc(doc(db, "users", userId, "profile", "main"));
      if (snapshot.exists()) {
        return { mode: "firebase", profile: deserializeProfile(snapshot.data()) };
      }
      return { mode: "firebase" };
    } catch (error) {
      console.warn("Firebase profile load failed, using local profile.", error);
    }
  }

  return { mode: "local", profile: readLocalProfile() };
}

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<{ mode: BackendMode }> {
  const db = await getFirebaseDb();

  saveLocalProfile(profile);

  if (db) {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "users", userId, "profile", "main"), {
        ...serializeProfile(profile),
        updatedAt: new Date().toISOString()
      });
      return { mode: "firebase" };
    } catch (error) {
      console.warn("Firebase profile save failed, saved locally.", error);
    }
  }

  return { mode: "local" };
}

export async function createManagedUserProfile(profile: UserProfile, email?: string): Promise<{ mode: BackendMode; userId: string }> {
  const userId = `managed-${crypto.randomUUID()}`;
  const db = await getFirebaseDb();

  if (db) {
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "users", userId, "profile", "main"), {
      ...serializeProfile(profile),
      accountType: "managed",
      email: email?.trim().toLowerCase() || "",
      updatedAt: new Date().toISOString()
    });
    return { mode: "firebase", userId };
  }

  return { mode: "local", userId };
}

export async function deleteUserProfile(userId: string): Promise<{ mode: BackendMode }> {
  const db = await getFirebaseDb();

  if (!db) return { mode: "local" };

  const { deleteDoc, doc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "users", userId, "profile", "main"));
  await deleteDoc(doc(db, "publicLocations", userId)).catch(() => undefined);
  return { mode: "firebase" };
}

export async function listUserProfiles(): Promise<AdminUserProfile[]> {
  const db = await getFirebaseDb();

  if (!db) return [];

  const { collectionGroup, getDocs } = await import("firebase/firestore");
  const snapshots = await getDocs(collectionGroup(db, "profile"));

  return snapshots.docs.map((profileDoc) => {
    const data = profileDoc.data();
    return {
      ...deserializeProfile(data),
      accountType: data.accountType === "managed" ? "managed" : "registered",
      email: typeof data.email === "string" ? data.email : undefined,
      userId: profileDoc.ref.parent.parent?.id ?? profileDoc.id,
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined
    };
  });
}

function serializeProfile(profile: UserProfile) {
  return {
    ...profile,
    skills: profile.skills.map(([label, value]) => ({ label, value }))
  };
}

function deserializeProfile(data: Record<string, unknown>): UserProfile {
  const profile = data as Omit<UserProfile, "skills"> & {
    skills?: Array<{ label: string; value: number }> | UserProfile["skills"];
  };

  return {
    ...profile,
    engagement: profile.engagement ?? { rewards: {} },
    skills: Array.isArray(profile.skills)
      ? profile.skills.map((skill) => Array.isArray(skill) ? skill : [skill.label, skill.value])
      : []
  };
}

function readLocalProfile() {
  const stored = window.localStorage.getItem(LOCAL_PROFILE_KEY);
  if (!stored) return undefined;

  try {
    return JSON.parse(stored) as UserProfile;
  } catch {
    return undefined;
  }
}

function saveLocalProfile(profile: UserProfile) {
  window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
}
