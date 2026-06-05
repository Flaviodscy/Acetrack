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

export type SocialMessage = {
  id: string;
  body: string;
  createdAt: string;
  friendshipId: string;
  fromProfile: SocialProfileSnapshot;
  fromUserId: string;
  kind: "challenge" | "message";
  toProfile: SocialProfileSnapshot;
  toUserId: string;
  updatedAt: string;
  userIds: [string, string];
};

const LOCAL_REQUESTS_KEY = "acetrack:social-requests";
const LOCAL_FRIENDS_KEY = "acetrack:friendships";
const LOCAL_ACTIONS_KEY = "acetrack:social-actions";
const LOCAL_MESSAGES_KEY = "acetrack:social-messages";

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

export async function listSentFriendRequests(userId: string) {
  const db = await getFirebaseDb();

  if (db) {
    const { collection, getDocs, query, where } = await import("firebase/firestore");
    const snapshot = await getDocs(query(collection(db, "socialRequests"), where("fromUserId", "==", userId)));
    return snapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }) as FriendRequest)
      .filter((request) => request.status === "pending");
  }

  return readLocalList<FriendRequest>(LOCAL_REQUESTS_KEY).filter((request) => request.fromUserId === userId && request.status === "pending");
}

export async function subscribeToFriendRequests(
  userId: string,
  direction: "incoming" | "sent",
  onRequests: (requests: FriendRequest[]) => void,
  onError?: (error: unknown) => void
) {
  const db = await getFirebaseDb();
  if (!db) {
    onRequests(direction === "incoming" ? await listFriendRequests(userId) : await listSentFriendRequests(userId));
    return () => undefined;
  }

  const { collection, onSnapshot, query, where } = await import("firebase/firestore");
  const field = direction === "incoming" ? "toUserId" : "fromUserId";
  return onSnapshot(query(collection(db, "socialRequests"), where(field, "==", userId)), (snapshot) => {
    onRequests(snapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }) as FriendRequest)
      .filter((request) => request.status === "pending"));
  }, (error) => onError?.(error));
}

export async function acceptFriendRequest(request: FriendRequest, currentProfile: UserProfile) {
  const now = new Date().toISOString();
  const acceptedRequest: FriendRequest = { ...request, status: "accepted", updatedAt: now };
  const friendship = createFriendshipFromRequest({
    ...acceptedRequest,
    toProfile: toSocialProfile(currentProfile)
  });
  const db = await getFirebaseDb();

  if (db) {
    const { doc, writeBatch } = await import("firebase/firestore");
    const batch = writeBatch(db);
    batch.set(doc(db, "friendships", friendship.id), friendship);
    batch.update(doc(db, "socialRequests", request.id), { status: "accepted", toProfile: friendship.profiles[request.toUserId], updatedAt: now });
    await batch.commit();
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
    const [friendshipSnapshot, incomingRequestSnapshot, sentRequestSnapshot] = await Promise.all([
      getDocs(query(collection(db, "friendships"), where("userIds", "array-contains", userId))),
      getDocs(query(collection(db, "socialRequests"), where("toUserId", "==", userId))),
      getDocs(query(collection(db, "socialRequests"), where("fromUserId", "==", userId)))
    ]);
    return mergeFriendships([
      ...friendshipSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Friendship),
      ...toAcceptedFriendships(incomingRequestSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as FriendRequest)),
      ...toAcceptedFriendships(sentRequestSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as FriendRequest))
    ]);
  }

  return mergeFriendships([
    ...readLocalList<Friendship>(LOCAL_FRIENDS_KEY).filter((friendship) => friendship.userIds.includes(userId)),
    ...toAcceptedFriendships(readLocalList<FriendRequest>(LOCAL_REQUESTS_KEY).filter((request) => request.fromUserId === userId || request.toUserId === userId))
  ]);
}

export async function subscribeToFriendships(userId: string, onFriendships: (friendships: Friendship[]) => void, onError?: (error: unknown) => void) {
  const db = await getFirebaseDb();
  if (!db) {
    onFriendships(await listFriendships(userId));
    return () => undefined;
  }

  const { collection, onSnapshot, query, where } = await import("firebase/firestore");
  let friendshipDocs: Friendship[] = [];
  let incomingAccepted: Friendship[] = [];
  let sentAccepted: Friendship[] = [];
  const emit = () => onFriendships(mergeFriendships([...friendshipDocs, ...incomingAccepted, ...sentAccepted]));

  const unsubscribeFriendships = onSnapshot(query(collection(db, "friendships"), where("userIds", "array-contains", userId)), (snapshot) => {
    friendshipDocs = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Friendship);
    emit();
  }, (error) => onError?.(error));

  const unsubscribeIncoming = onSnapshot(query(collection(db, "socialRequests"), where("toUserId", "==", userId)), (snapshot) => {
    incomingAccepted = toAcceptedFriendships(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as FriendRequest));
    emit();
  }, (error) => onError?.(error));

  const unsubscribeSent = onSnapshot(query(collection(db, "socialRequests"), where("fromUserId", "==", userId)), (snapshot) => {
    sentAccepted = toAcceptedFriendships(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as FriendRequest));
    emit();
  }, (error) => onError?.(error));

  return () => {
    unsubscribeFriendships();
    unsubscribeIncoming();
    unsubscribeSent();
  };
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

export async function subscribeToIncomingSocialActions(userId: string, onActions: (actions: SocialAction[]) => void, onError?: (error: unknown) => void) {
  const db = await getFirebaseDb();
  if (!db) {
    onActions(await listIncomingSocialActions(userId));
    return () => undefined;
  }

  const { collection, onSnapshot, query, where } = await import("firebase/firestore");
  return onSnapshot(query(collection(db, "socialActions"), where("toUserId", "==", userId)), (snapshot) => {
    onActions(snapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }) as SocialAction)
      .filter((action) => action.status === "pending"));
  }, (error) => onError?.(error));
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

export async function sendSocialMessage(
  friendship: Friendship,
  fromUserId: string,
  fromProfile: UserProfile,
  toUserId: string,
  toProfile: SocialProfileSnapshot,
  body: string,
  kind: SocialMessage["kind"] = "message"
) {
  const message = createSocialMessage(friendship, fromUserId, toUserId, toSocialProfile(fromProfile), toProfile, body, kind);
  const db = await getFirebaseDb();

  if (db) {
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "socialMessages", message.id), message);
    return { message, mode: "firebase" as const };
  }

  writeLocalList(LOCAL_MESSAGES_KEY, [message, ...readLocalList<SocialMessage>(LOCAL_MESSAGES_KEY)]);
  return { message, mode: "local" as const };
}

export async function listFriendMessages(friendshipId: string, userId: string) {
  const db = await getFirebaseDb();

  if (db) {
    const { collection, getDocs, query, where } = await import("firebase/firestore");
    const snapshot = await getDocs(query(collection(db, "socialMessages"), where("userIds", "array-contains", userId)));
    return snapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }) as SocialMessage)
      .filter((message) => message.friendshipId === friendshipId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }

  return readLocalList<SocialMessage>(LOCAL_MESSAGES_KEY)
    .filter((message) => message.friendshipId === friendshipId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export async function subscribeToFriendMessages(
  friendshipId: string,
  userId: string,
  onMessages: (messages: SocialMessage[]) => void,
  onError?: (error: unknown) => void
) {
  const db = await getFirebaseDb();
  if (!db) {
    onMessages(await listFriendMessages(friendshipId, userId));
    return () => undefined;
  }

  const { collection, onSnapshot, query, where } = await import("firebase/firestore");
  return onSnapshot(query(collection(db, "socialMessages"), where("userIds", "array-contains", userId)), (snapshot) => {
    onMessages(snapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }) as SocialMessage)
      .filter((message) => message.friendshipId === friendshipId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)));
  }, (error) => onError?.(error));
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

function createFriendshipFromRequest(request: FriendRequest): Friendship {
  return createFriendship(request.fromUserId, request.toUserId, {
    [request.fromUserId]: request.fromProfile,
    [request.toUserId]: request.toProfile
  });
}

function toAcceptedFriendships(requests: FriendRequest[]) {
  return requests
    .filter((request) => request.status === "accepted")
    .map(createFriendshipFromRequest);
}

function mergeFriendships(friendships: Friendship[]) {
  const byId = new Map<string, Friendship>();
  friendships.forEach((friendship) => {
    const current = byId.get(friendship.id);
    byId.set(friendship.id, current ? mergeFriendship(current, friendship) : friendship);
  });

  return Array.from(byId.values()).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function mergeFriendship(current: Friendship, next: Friendship): Friendship {
  return {
    ...current,
    ...next,
    profiles: { ...current.profiles, ...next.profiles },
    updatedAt: Date.parse(next.updatedAt) >= Date.parse(current.updatedAt) ? next.updatedAt : current.updatedAt
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

function createSocialMessage(
  friendship: Friendship,
  fromUserId: string,
  toUserId: string,
  fromProfile: SocialProfileSnapshot,
  toProfile: SocialProfileSnapshot,
  body: string,
  kind: SocialMessage["kind"]
): SocialMessage {
  if (!friendship.userIds.includes(fromUserId) || !friendship.userIds.includes(toUserId)) {
    throw new Error("Messages can only be sent to friends.");
  }

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    body: body.trim(),
    createdAt: now,
    friendshipId: friendship.id,
    fromProfile,
    fromUserId,
    kind,
    toProfile,
    toUserId,
    updatedAt: now,
    userIds: friendship.userIds
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
