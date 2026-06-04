import { getFirebaseDb } from "./firebaseClient";
import type { UserProfile } from "../types/domain";

export type SocialProfileSnapshot = {
  avatar: string;
  level: number;
  name: string;
  points: number;
  portrait: string;
  rating: string;
};

export type FriendRequest = {
  id: string;
  createdAt: string;
  fromProfile: SocialProfileSnapshot;
  fromUserId: string;
  status: "accepted" | "declined" | "pending";
  toProfile: SocialProfileSnapshot;
  toUserId: string;
  updatedAt: string;
};

export type Friendship = {
  id: string;
  createdAt: string;
  profiles: Record<string, SocialProfileSnapshot>;
  updatedAt: string;
  userIds: [string, string];
};

export type SocialAction = {
  id: string;
  createdAt: string;
  fromProfile: SocialProfileSnapshot;
  fromUserId: string;
  status: "accepted" | "dismissed" | "pending";
  toProfile: SocialProfileSnapshot;
  toUserId: string;
  type: "challenge" | "poke";
  updatedAt: string;
};

const LOCAL_REQUESTS_KEY = "acetrack:social-requests";
const LOCAL_FRIENDS_KEY = "acetrack:friendships";
const LOCAL_ACTIONS_KEY = "acetrack:social-actions";

export function toSocialProfile(profile: UserProfile): SocialProfileSnapshot {
  return {
    avatar: profile.avatar,
    level: profile.level,
    name: profile.name,
    points: getPointsFromRating(profile.rating),
    portrait: profile.portrait,
    rating: profile.rating
  };
}

export async function sendFriendRequest(fromUserId: string, fromProfile: UserProfile, toUserId: string, toProfile: SocialProfileSnapshot) {
  if (fromUserId === toUserId) throw new Error("You cannot add yourself.");
  const request = createFriendRequest(fromUserId, toUserId, toSocialProfile(fromProfile), toProfile);
  const db = await getFirebaseDb();

  if (db) {
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "socialRequests", request.id), request);
    return { mode: "firebase" as const, request };
  }

  writeLocalList(LOCAL_REQUESTS_KEY, upsertById(readLocalList<FriendRequest>(LOCAL_REQUESTS_KEY), request));
  return { mode: "local" as const, request };
}

export async function listFriendRequests(userId: string) {
  const db = await getFirebaseDb();

  if (db) {
    const { collection, getDocs, query, where } = await import("firebase/firestore");
    const snapshot = await getDocs(query(collection(db, "socialRequests"), where("toUserId", "==", userId)));
    return snapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }) as FriendRequest)
      .filter((request) => request.status === "pending");
  }

  return readLocalList<FriendRequest>(LOCAL_REQUESTS_KEY).filter((request) => request.toUserId === userId && request.status === "pending");
}

export async function acceptFriendRequest(request: FriendRequest, currentProfile: UserProfile) {
  const now = new Date().toISOString();
  const acceptedRequest: FriendRequest = { ...request, status: "accepted", updatedAt: now };
  const friendship = createFriendship(request.fromUserId, request.toUserId, {
    [request.fromUserId]: request.fromProfile,
    [request.toUserId]: toSocialProfile(currentProfile)
  });
  const db = await getFirebaseDb();

  if (db) {
    const { doc, setDoc, updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "socialRequests", request.id), { status: "accepted", updatedAt: now });
    await setDoc(doc(db, "friendships", friendship.id), friendship);
    return { friendship, mode: "firebase" as const };
  }

  writeLocalList(LOCAL_REQUESTS_KEY, upsertById(readLocalList<FriendRequest>(LOCAL_REQUESTS_KEY), acceptedRequest));
  writeLocalList(LOCAL_FRIENDS_KEY, upsertById(readLocalList<Friendship>(LOCAL_FRIENDS_KEY), friendship));
  return { friendship, mode: "local" as const };
}

export async function declineFriendRequest(request: FriendRequest) {
  const now = new Date().toISOString();
  const db = await getFirebaseDb();

  if (db) {
    const { doc, updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "socialRequests", request.id), { status: "declined", updatedAt: now });
    return { mode: "firebase" as const };
  }

  writeLocalList(LOCAL_REQUESTS_KEY, upsertById(readLocalList<FriendRequest>(LOCAL_REQUESTS_KEY), { ...request, status: "declined", updatedAt: now }));
  return { mode: "local" as const };
}

export async function listFriendships(userId: string) {
  const db = await getFirebaseDb();

  if (db) {
    const { collection, getDocs, query, where } = await import("firebase/firestore");
    const snapshot = await getDocs(query(collection(db, "friendships"), where("userIds", "array-contains", userId)));
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Friendship);
  }

  return readLocalList<Friendship>(LOCAL_FRIENDS_KEY).filter((friendship) => friendship.userIds.includes(userId));
}

export async function sendSocialAction(type: SocialAction["type"], fromUserId: string, fromProfile: UserProfile, toUserId: string, toProfile: SocialProfileSnapshot) {
  if (fromUserId === toUserId) throw new Error("Choose another player.");
  const action = createSocialAction(type, fromUserId, toUserId, toSocialProfile(fromProfile), toProfile);
  const db = await getFirebaseDb();

  if (db) {
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "socialActions", action.id), action);
    return { action, mode: "firebase" as const };
  }

  writeLocalList(LOCAL_ACTIONS_KEY, [action, ...readLocalList<SocialAction>(LOCAL_ACTIONS_KEY)]);
  return { action, mode: "local" as const };
}

export async function listIncomingSocialActions(userId: string) {
  const db = await getFirebaseDb();

  if (db) {
    const { collection, getDocs, query, where } = await import("firebase/firestore");
    const snapshot = await getDocs(query(collection(db, "socialActions"), where("toUserId", "==", userId)));
    return snapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }) as SocialAction)
      .filter((action) => action.status === "pending");
  }

  return readLocalList<SocialAction>(LOCAL_ACTIONS_KEY).filter((action) => action.toUserId === userId && action.status === "pending");
}

export async function updateSocialActionStatus(action: SocialAction, status: SocialAction["status"]) {
  const now = new Date().toISOString();
  const db = await getFirebaseDb();

  if (db) {
    const { doc, updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "socialActions", action.id), { status, updatedAt: now });
    return { mode: "firebase" as const };
  }

  writeLocalList(LOCAL_ACTIONS_KEY, upsertById(readLocalList<SocialAction>(LOCAL_ACTIONS_KEY), { ...action, status, updatedAt: now }));
  return { mode: "local" as const };
}

function createFriendRequest(fromUserId: string, toUserId: string, fromProfile: SocialProfileSnapshot, toProfile: SocialProfileSnapshot): FriendRequest {
  const now = new Date().toISOString();
  return {
    id: getPairId(fromUserId, toUserId),
    createdAt: now,
    fromProfile,
    fromUserId,
    status: "pending",
    toProfile,
    toUserId,
    updatedAt: now
  };
}

function createFriendship(firstUserId: string, secondUserId: string, profiles: Record<string, SocialProfileSnapshot>): Friendship {
  const userIds = [firstUserId, secondUserId].sort() as [string, string];
  const now = new Date().toISOString();
  return {
    id: getPairId(firstUserId, secondUserId),
    createdAt: now,
    profiles,
    updatedAt: now,
    userIds
  };
}

function createSocialAction(type: SocialAction["type"], fromUserId: string, toUserId: string, fromProfile: SocialProfileSnapshot, toProfile: SocialProfileSnapshot): SocialAction {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    fromProfile,
    fromUserId,
    status: "pending",
    toProfile,
    toUserId,
    type,
    updatedAt: now
  };
}

function getPairId(firstUserId: string, secondUserId: string) {
  return [firstUserId, secondUserId].sort().join("__");
}

function getPointsFromRating(rating: string) {
  const points = Number.parseInt(rating.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(points) ? points : 0;
}

function readLocalList<T>(key: string): T[] {
  const stored = window.localStorage.getItem(key);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as T[];
  } catch {
    return [];
  }
}

function writeLocalList<T>(key: string, items: T[]) {
  window.localStorage.setItem(key, JSON.stringify(items));
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  return [item, ...items.filter((current) => current.id !== item.id)];
}
