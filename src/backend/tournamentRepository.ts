import { getFirebaseDb, isFirebaseConfigured } from "./firebaseClient";
import type {
  Tournament,
  TournamentParticipant,
  PlayerRanking,
  UserProfile,
} from "../types/domain";
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

import { uploadImageToTelegraph, getUserProfile as getSavedProfile, updateUserProfile } from "./profileImageRepository";

const TOURNAMENTS_COLLECTION = "tournaments";
const PARTICIPANTS_COLLECTION = "tournamentParticipants";
const RANKINGS_COLLECTION = "playerRankings";

// ---- Tournaments ---

export async function createTournament(
  data: Omit<Tournament, "id" | "createdAt">
) {
  const db = await getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  const batch = writeBatch(db);
  const tourneyDoc = doc(collection(db, TOURNAMENTS_COLLECTION));
  const tournamentData = {
    ...data,
    createdAt: Timestamp.now(),
  };
  batch.set(tourneyDoc, tournamentData as unknown as object);

  // Initialize participants document for the organizer
  const participantsDoc = doc(
    collection(db, PARTICIPANTS_COLLECTION),
    tourneyDoc.id
  );
  batch.set(participantsDoc, {
    [data.organizerUserId]: {
      userId: data.organizerUserId,
      position: 1,
      finalRating: "",
      matchesPlayed: 0,
      matchesWon: 0,
      tournamentWinner: true,
      earnedPoints: 0,
    },
  } as unknown as object);

  await batch.commit();
  return { id: tourneyDoc.id, mode: "firebase" as const };
}

export async function listTournaments(): Promise<Tournament[]> {
  const db = await getFirebaseDb();
  if (!db) return [];

  const snapshot = await getDocs(collection(db, TOURNAMENTS_COLLECTION));

  // Map each doc to Tournament type
  const results: Tournament[] = [];
  for (const doc of snapshot.docs as any[]) {
    results.push({
      id: doc.id,
      ...(doc.data() as Omit<Tournament, "id">),
    });
  }
  return results;
}

export async function getTournament(tourneyId: string): Promise<Tournament | null> {
  const db = await getFirebaseDb();
  if (!db) return null;

  const snapshot = await getDoc(doc(db, TOURNAMENTS_COLLECTION, tourneyId));

  if (!snapshot.exists()) return null;
  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<Tournament, "id">),
  } as Tournament;
}

// ---- Tournament Participants ---

export async function addTournamentParticipant(
  tourneyId: string,
  userId: string,
  userName: string
) {
  const db = await getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  // Add participant to tournament participants collection
  const participantDoc = doc(collection(db, PARTICIPANTS_COLLECTION), tourneyId);
  const participantsSnap = await getDoc(participantDoc);

  let data: Record<string, any> = {};
  if (participantsSnap.exists()) {
    data = { ...participantsSnap.data() } as Record<string, any>;
  }

  data[userId] = {
    userId,
    name: userName,
    position: data[userId]?.position ?? 0,
    finalRating: "",
    matchesPlayed: 0,
    matchesWon: 0,
    tournamentWinner: false,
    earnedPoints: 0,
  };

  await setDoc(participantDoc, data, { merge: true });

  // Also initialize or update player ranking
  await upsertPlayerRanking(userId);

  return data[userId];
}

export async function listTournamentParticipants(
  tourneyId: string
): Promise<TournamentParticipant[]> {
  const db = await getFirebaseDb();
  if (!db) return [];

  const snapshot = await getDocs(
    collection(db, PARTICIPANTS_COLLECTION, tourneyId)
  );

  // tournamentParticipants docs store a flat object {userId: {participantData}}
  if (snapshot.docs.length === 0) return [];

  // Get the first doc's data which contains all participants as key-value pairs
  const doc = snapshot.docs[0];
  const data = doc.data() as Record<string, any>;

  // Map each participant value to TournamentParticipant format
  return Object.values(data).map(
    (p: any) => ({
      userId: p.userId,
      position: p.position,
      finalRating: p.finalRating || "",
      matchesPlayed: p.matchesPlayed,
      matchesWon: p.matchesWon,
      tournamentWinner: p.tournamentWinner,
      earnedPoints: p.earnedPoints,
    })
  );
}

// ---- Player Rankings ---

function rankingSortKey(ratingStr: string): number {
  // Parse rating like "1500 Ace XP" or "2000" -> return numeric part
  const points = Number.parseInt(ratingStr.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(points) ? points : 0;
}

export async function updatePlayerRankingFromMatch(
  userId: string,
  ratingBefore: string,
  ratingAfter: string,
  tournamentId?: string,
  won: boolean = false
) {
  const db = await getFirebaseDb();
  if (!db) return;

  const rankingRef = doc(db, RANKINGS_COLLECTION, userId);
  const snap = await getDoc(rankingRef);

  const pointsBefore = rankingSortKey(ratingBefore);
  const pointsAfter = rankingSortKey(ratingAfter);
  const pointsGained = pointsAfter - pointsBefore;
  const isTournamentEvent = !!tournamentId;

  if (snap.exists()) {
    const data = snap.data() as PlayerRanking;
    const newTotalPoints = (data.totalPoints || 0) + pointsGained;
    const newTournamentsPlayed = (data.tournamentsPlayed || 0) + (isTournamentEvent ? 1 : 0);
    const newTournamentsWon = isTournamentEvent && won
      ? (data.tournamentsWon || 0) + 1
      : data.tournamentsWon;

    // Determine trend based on rating change
    const trend: "up" | "down" | "stable" =
      pointsGained > 0 ? "up" : pointsGained < 0 ? "down" : "stable";

    await updateDoc(rankingRef, {
      totalPoints: newTotalPoints,
      tournamentsPlayed: newTournamentsPlayed,
      tournamentsWon: newTournamentsWon,
      ratingTrend: trend,
      lastUpdated: Timestamp.now(),
    });
  } else {
    const newTrend: "up" | "down" | "stable" = pointsGained > 0 ? "up" : pointsGained < 0 ? "down" : "stable";
    await setDoc(rankingRef, {
      userId,
      totalPoints: pointsGained,
      tournamentsPlayed: isTournamentEvent ? 1 : 0,
      tournamentsWon: isTournamentEvent && won ? 1 : 0,
      ratingTrend: newTrend,
      lastUpdated: Timestamp.now(),
    });
  }
}

export async function getPlayerRanking(userId: string): Promise<PlayerRanking | null> {
  const db = await getFirebaseDb();
  if (!db) return null;

  const snapshot = await getDoc(doc(db, RANKINGS_COLLECTION, userId));

  if (!snapshot.exists()) return null;
  const data = snapshot.data() as PlayerRanking;
  // Data from Firestore already includes all fields including userId and currentRank
  return data as PlayerRanking;
}

export async function listPlayerRankings(
  limitNum: number = 10
): Promise<PlayerRanking[]> {
  const db = await getFirebaseDb();
  if (!db) return [];

  const snapshot = await getDocs(
    query(collection(db, RANKINGS_COLLECTION), orderBy("totalPoints", "desc"), limit(limitNum))
  );

  // Build ranking objects explicitly without spreading to avoid type conflicts
  const results: PlayerRanking[] = [];
  for (const doc of snapshot.docs as any[]) {
    const data = doc.data() as PlayerRanking;
    results.push({
      userId: doc.id,
      currentRank: 0, // Will be computed/assigned later based on overall ranking
      totalPoints: data.totalPoints,
      tournamentsPlayed: data.tournamentsPlayed,
      tournamentsWon: data.tournamentsWon,
      ratingTrend: data.ratingTrend,
      lastUpdated: data.lastUpdated,
    } as PlayerRanking);
  }
  return results;
}

export async function upsertPlayerRanking(userId: string): Promise<PlayerRanking> {
  const db = await getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  const rankingRef = doc(db, RANKINGS_COLLECTION, userId);
  const snap = await getDoc(rankingRef);

  // Get user's current rating from their profile
  const profileRef = doc(db, "users", userId, "profile", "main");
  const profileSnap = await getDoc(profileRef);
  let initialPoints = 0;

  if (profileSnap.exists()) {
    const profileData = profileSnap.data() as Record<string, any>;
    const rating =
      typeof profileData?.rating === "string"
        ? profileData.rating
        : "0 Ace XP";
    const m = String(rating).replace(/[^\d]/g, "");
    initialPoints = Number.parseInt(m, 10) || 0;
  }

  if (snap.exists()) {
    // Update existing ranking
    await updateDoc(rankingRef, {
      totalPoints: initialPoints,
      tournamentsPlayed: 1,
      tournamentsWon: 0,
      ratingTrend: "stable",
      lastUpdated: Timestamp.now(),
    });
  } else {
    // Create new ranking
    await setDoc(rankingRef, {
      userId,
      totalPoints: initialPoints,
      tournamentsPlayed: 1,
      tournamentsWon: 0,
      ratingTrend: "stable",
      lastUpdated: Timestamp.now(),
    });
  }

  return {
    userId,
    currentRank: 0, // Will be assigned when listed with others
    totalPoints: initialPoints,
    tournamentsPlayed: 1,
    tournamentsWon: 0,
    ratingTrend: "stable",
    lastUpdated: Timestamp.now(),
  } as PlayerRanking;
}

// ---- Helper: get current rank position ----

export async function getUserRankPosition(userId: string): Promise<number> {
  const db = await getFirebaseDb();
  if (!db) return 0;

  const snapshot = await getDocs(
    query(collection(db, RANKINGS_COLLECTION), orderBy("totalPoints", "desc"))
  );
  const docs = snapshot.docs;
  let rank = 1;
  for (const doc of docs) {
    if (doc.id === userId) return rank;
    rank++;
  }
  // User not found in rankings
  return docs.length + 1;
}