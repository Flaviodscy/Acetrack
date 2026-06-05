import { getFirebaseDb } from "./firebaseClient";
import type { UserProfile } from "../types/domain";

export type PlayerDirectoryProfile = {
  avatar: string;
  id: string;
  level: number;
  location: string;
  name: string;
  points: number;
  portrait: string;
  rating: string;
  searchName: string;
  updatedAt: string;
};

export async function publishPlayerDirectoryProfile(userId: string, profile: UserProfile) {
  const db = await getFirebaseDb();
  if (!db) return { mode: "local" as const };

  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "publicProfiles", userId), createDirectoryProfile(userId, profile));
  return { mode: "firebase" as const };
}

export async function deletePlayerDirectoryProfile(userId: string) {
  const db = await getFirebaseDb();
  if (!db) return { mode: "local" as const };

  const { deleteDoc, doc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "publicProfiles", userId)).catch(() => undefined);
  return { mode: "firebase" as const };
}

export async function searchPlayerDirectoryProfiles(term: string, currentUserId?: string): Promise<PlayerDirectoryProfile[]> {
  const normalizedTerm = normalizeSearchTerm(term);
  if (normalizedTerm.length < 2) return [];

  const db = await getFirebaseDb();
  if (!db) return [];

  const { collection, getDocs } = await import("firebase/firestore");
  const snapshot = await getDocs(collection(db, "publicProfiles"));

  return snapshot.docs
    .flatMap((profileDoc) => {
      const profile = toDirectoryProfile(profileDoc.id, profileDoc.data());
      return profile ? [profile] : [];
    })
    .filter((profile) => profile.id !== currentUserId)
    .filter((profile) => profile.searchName.includes(normalizedTerm))
    .sort((a, b) => getSearchRank(a, normalizedTerm) - getSearchRank(b, normalizedTerm) || a.name.localeCompare(b.name))
    .slice(0, 8);
}

function createDirectoryProfile(userId: string, profile: UserProfile): PlayerDirectoryProfile {
  return {
    avatar: profile.avatar,
    id: userId,
    level: profile.level,
    location: getPublicLocationLabel(profile.location),
    name: profile.name,
    points: getPointsFromRating(profile.rating),
    portrait: profile.portrait,
    rating: profile.rating,
    searchName: normalizeSearchTerm(profile.name),
    updatedAt: new Date().toISOString()
  };
}

function toDirectoryProfile(id: string, data: Record<string, unknown>): PlayerDirectoryProfile | undefined {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const avatar = typeof data.avatar === "string" ? data.avatar : "";
  const portrait = typeof data.portrait === "string" ? data.portrait : "";
  if (!name || !avatar || !portrait) return undefined;

  return {
    avatar,
    id,
    level: typeof data.level === "number" ? data.level : 0,
    location: typeof data.location === "string" ? data.location : "",
    name,
    points: typeof data.points === "number" ? data.points : getPointsFromRating(typeof data.rating === "string" ? data.rating : ""),
    portrait,
    rating: typeof data.rating === "string" ? data.rating : "0 pts",
    searchName: typeof data.searchName === "string" ? data.searchName : normalizeSearchTerm(name),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : ""
  };
}

function normalizeSearchTerm(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPublicLocationLabel(location: string) {
  const trimmed = location.trim();
  if (!trimmed || /\d/.test(trimmed)) return "";
  return trimmed;
}

function getSearchRank(profile: PlayerDirectoryProfile, term: string) {
  if (profile.searchName === term) return 0;
  if (profile.searchName.startsWith(term)) return 1;
  return 2;
}

function getPointsFromRating(rating: string) {
  const points = Number.parseInt(rating.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(points) ? points : 0;
}
