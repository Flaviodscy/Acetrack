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
      const { addDoc, collection } = await import("firebase/firestore");
      await addDoc(collection(db, "matches"), record);
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

  if (db) {
    const { collection, getDocs, limit, orderBy, query } = await import("firebase/firestore");
    const snapshot = await getDocs(query(collection(db, "matches"), orderBy("createdAt", "desc"), limit(10)));
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })) as MatchRecord[];
  }

  return readLocalMatches();
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
