import { getFirebaseDb, isFirebaseConfigured } from "./firebaseClient";
import type { BackendMode, MatchRecord } from "../types/domain";

const LOCAL_MATCHES_KEY = "acetrack:match-records";

export function getBackendMode(): BackendMode {
  return isFirebaseConfigured() ? "firebase" : "local";
}

export async function saveMatchRecord(record: MatchRecord) {
  const db = await getFirebaseDb();

  if (db) {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "users", record.userId, "matches", record.id), record);
      return { mode: "firebase" as const };
    } catch (error) {
      console.warn("Firebase save failed, falling back to local storage.", error);
    }
  }

  saveLocalMatch(record);
  return { mode: "local" as const };
}

export async function listRecentMatchRecords() {
  const db = await getFirebaseDb();
  const localRecords = readLocalMatches();

  if (db) {
    try {
      const { collectionGroup, getDocs, limit, orderBy, query } = await import("firebase/firestore");
      const snapshot = await getDocs(query(collectionGroup(db, "matches"), orderBy("createdAt", "desc"), limit(10)));
      return mergeMatchRecords(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })) as MatchRecord[], localRecords).slice(0, 10);
    } catch (error) {
      console.warn("Firebase match list failed, using local matches.", error);
    }
  }

  return localRecords;
}

export async function listUserMatchRecords(userId: string) {
  const db = await getFirebaseDb();
  const localRecords = readLocalMatches().filter((record) => record.userId === userId);

  if (db) {
    try {
      const { collection, getDocs, limit, orderBy, query } = await import("firebase/firestore");
      const snapshot = await getDocs(query(collection(db, "users", userId, "matches"), orderBy("createdAt", "desc"), limit(25)));
      return mergeMatchRecords(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })) as MatchRecord[], localRecords).slice(0, 25);
    } catch (error) {
      console.warn("Firebase user match list failed, using local matches.", error);
    }
  }

  return localRecords;
}

function mergeMatchRecords(primary: MatchRecord[], fallback: MatchRecord[]) {
  const records = new Map<string, MatchRecord>();
  [...fallback, ...primary].forEach((record) => records.set(record.id, record));
  return Array.from(records.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function readLocalMatches(): MatchRecord[] {
  const stored = window.localStorage.getItem(LOCAL_MATCHES_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as MatchRecord[];
  } catch {
    return [];
  }
}

function saveLocalMatch(record: MatchRecord) {
  const records = readLocalMatches();
  window.localStorage.setItem(LOCAL_MATCHES_KEY, JSON.stringify([record, ...records].slice(0, 25)));
}
