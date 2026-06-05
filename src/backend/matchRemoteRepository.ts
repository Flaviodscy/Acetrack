import { getFirebaseDb } from "./firebaseClient";

export type MatchRemoteCommandType = "aceA" | "aceB" | "end" | "pointA" | "pointB" | "undo";

export type MatchRemoteSession = {
  active: boolean;
  createdAt: string;
  id: string;
  ownerUserId: string;
  players: [string, string];
  token: string;
  updatedAt: string;
};

export type MatchRemoteCommand = {
  createdAt: string;
  handled?: boolean;
  id: string;
  sessionId: string;
  token: string;
  type: MatchRemoteCommandType;
};

export async function createMatchRemoteSession(ownerUserId: string, players: [string, string]) {
  const db = await getFirebaseDb();
  if (!db) return undefined;

  const { doc, setDoc } = await import("firebase/firestore");
  const now = new Date().toISOString();
  const session: MatchRemoteSession = {
    active: true,
    createdAt: now,
    id: crypto.randomUUID(),
    ownerUserId,
    players,
    token: crypto.randomUUID(),
    updatedAt: now
  };

  await setDoc(doc(db, "matchRemotes", session.id), session);
  return session;
}

export async function sendMatchRemoteCommand(sessionId: string, token: string, type: MatchRemoteCommandType) {
  const db = await getFirebaseDb();
  if (!db) throw new Error("Remote scoring needs Firebase.");

  const { collection, addDoc } = await import("firebase/firestore");
  const command = {
    createdAt: new Date().toISOString(),
    handled: false,
    sessionId,
    token,
    type
  };
  await addDoc(collection(db, "matchRemotes", sessionId, "commands"), command);
}

export async function markMatchRemoteCommandHandled(sessionId: string, commandId: string) {
  const db = await getFirebaseDb();
  if (!db) return;

  const { doc, updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, "matchRemotes", sessionId, "commands", commandId), {
    handled: true,
    handledAt: new Date().toISOString()
  });
}

export async function subscribeToMatchRemoteCommands(
  sessionId: string,
  onCommand: (command: MatchRemoteCommand) => void | Promise<void>
) {
  const db = await getFirebaseDb();
  if (!db) return () => undefined;

  const { collection, onSnapshot } = await import("firebase/firestore");
  return onSnapshot(collection(db, "matchRemotes", sessionId, "commands"), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added") return;
      const command = { ...change.doc.data(), id: change.doc.id } as MatchRemoteCommand;
      if (!command.handled) void onCommand(command);
    });
  });
}
