// Firebase Functions v1 (compat) API endpoints for AceTrack tournaments & rankings
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin app
admin.initializeApp();

// Get Firestore instance - admin.firestore() works in this version
export const db = admin.firestore();

// Helper to get collection reference
function col(path: string) {
  return db.collection(path);
}

// ===== TOURNAMENT APIs =====

// GET /api/tournaments - List all tournaments
export const listTournaments = functions.https.onRequest(async (req, res) => {
  try {
    const snapshot = await col("tournaments").orderBy("createdAt", "desc").get();
    const tournaments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as Record<string, any>);
    res.json({ success: true, data: tournaments });
  } catch (error) {
    console.error("listTournaments error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch tournaments" });
  }
});

// GET /api/tournaments/:tourneyId - Get specific tournament
export const getTournament = functions.https.onRequest(async (req, res) => {
  try {
    const tourneyId = (req as any).params.tourneyId;
    if (!tourneyId) return res.status(400).json({ success: false, error: "Missing tournament ID" });

    const doc = await col("tournaments").doc(tourneyId).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: "Tournament not found" });

    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("getTournament error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch tournament" });
  }
});

// POST /api/tournaments - Create a new tournament
export const createTournament = functions.https.onRequest(async (req, res) => {
  try {
    const body = (req as any).body;
    const { name, location, format, organizerUserId } = body;

    if (!name || !organizerUserId) {
      return res.status(400).json({ success: false, error: "Name and organizer User ID are required" });
    }

    const tourneyData = {
      name,
      location: location || "",
      format: format || "round_robin",
      status: "upcoming" as const,
      organizerUserId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await col("tournaments").add(tourneyData);

    // Initialize participants with the organizer as position 1 (winner)
    await col("tournamentParticipants").doc(docRef.id).set({
      [organizerUserId]: {
        userId: organizerUserId,
        position: 1,
        finalRating: "",
        matchesPlayed: 0,
        matchesWon: 0,
        tournamentWinner: true,
        earnedPoints: 0
      }
    });

    res.json({ success: true, data: { id: docRef.id, ...tourneyData } });
  } catch (error) {
    console.error("createTournament error:", error);
    res.status(500).json({ success: false, error: "Failed to create tournament" });
  }
});

// POST /api/tournaments/:tourneyId/participants - Add a participant to tournament
export const addParticipant = functions.https.onRequest(async (req, res) => {
  try {
    const tourneyId = (req as any).params.tourneyId;
    const { userId, userName } = (req as any).body;

    if (!userId || !tourneyId) {
      return res.status(400).json({ success: false, error: "Missing required fields: userId, tourneyId" });
    }

    // Add participant to tournament participants
    await col("tournamentParticipants").doc(tourneyId).set(
      { [userId]: { userId, name: userName, position: 0, matchesPlayed: 0, matchesWon: 0, tournamentWinner: false, earnedPoints: 0 } },
      { merge: true }
    );

    // Update or create player ranking
    await upsertPlayerRanking(userId);

    res.json({ success: true });
  } catch (error) {
    console.error("addParticipant error:", error);
    res.status(500).json({ success: false, error: "Failed to add participant" });
  }
});

// GET /api/tournaments/:tourneyId/participants - List tournament participants
export const listParticipants = functions.https.onRequest(async (req, res) => {
  try {
    const tourneyId = (req as any).params.tourneyId;
    const snapshot = await col("tournamentParticipants").doc(tourneyId).get();

    if (!snapshot.exists) return res.json({ success: true, data: {} });

    const participants: Record<string, any> = {};
    Object.keys(snapshot.data() as Record<string, any>).forEach(key => {
      participants[key] = snapshot.data()[key];
    });

    res.json({ success: true, data: participants });
  } catch (error) {
    console.error("listParticipants error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch participants" });
  }
});

// ===== PLAYER RANKING APIs =====

// Helper: upsert player ranking based on their profile rating
async function upsertPlayerRanking(userId: string) {
  const Ref = admin.firestore.Ref;
  const DocRef = admin.firestore.DocRef;
  const setDoc = admin.firestore.setDoc;
  const getDoc = admin.firestore.getDoc;
  const FieldValue = admin.firestore.FieldValue;

  const ref = new DocRef(col("playerRankings"), userId);
  const snap = await getDoc(ref);

  // Get user's current rating from their profile
  const profileRef = col(`users/${userId}/profile/main`);
  const profileSnap = await getDoc(profileRef);
  let points = 0;

  if (profileSnap.exists) {
    const rating = typeof profileSnap.data()?.rating === "string" ? profileSnap.data().rating : "0 Ace XP";
    const m = String(rating).replace(/[^\d]/g, "");
    points = parseInt(m, 10) || 0;
  }

  if (snap.exists) {
    // Update existing ranking
    await ref.update({
      totalPoints: FieldValue.increment(points),
      tournamentsPlayed: FieldValue.increment(1),
      tournamentsWon: FieldValue.increment(0),
      ratingTrend: "stable",
      lastUpdated: FieldValue.serverTimestamp()
    });
  } else {
    // Create new ranking
    await setDoc(ref, {
      userId,
      totalPoints: points,
      tournamentsPlayed: 1,
      tournamentsWon: 0,
      ratingTrend: "stable",
      lastUpdated: FieldValue.serverTimestamp()
    });
  }
}

// GET /api/rankings - List all player rankings (ordered by totalPoints desc)
export const listRankings = functions.https.onRequest(async (req, res) => {
  try {
    const snapshot = await col("playerRankings").orderBy("totalPoints", "desc").get();
    const rankings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as Record<string, any>);
    res.json({ success: true, data: rankings });
  } catch (error) {
    console.error("listRankings error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch player rankings" });
  }
});

// GET /api/rankings/:userId - Get specific player ranking
export const getRanking = functions.https.onRequest(async (req, res) => {
  try {
    const userId = (req as any).params.userId;
    if (!userId) return res.status(400).json({ success: false, error: "Missing user ID" });

    const doc = await col("playerRankings").doc(userId).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: "Player ranking not found" });

    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("getRanking error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch player ranking" });
  }
});

// POST /api/rankings/:userId/update - Update player rating after match/tournament
export const updateRating = functions.https.onRequest(async (req, res) => {
  try {
    const userId = (req as any).params.userId;
    const body = (req as any).body;
    const { ratingBefore, ratingAfter, tournamentId, won } = body;

    if (!userId || !ratingBefore || !ratingAfter) {
      return res.status(400).json({ success: false, error: "Missing required fields: userId, ratingBefore, ratingAfter" });
    }

    // Parse rating points (strip non-numeric like "Ace XP", "XP", etc.)
    const parseRating = (r: string) => parseInt(String(r).replace(/[^\d]/g), 10) || 0;
    const pointsBefore = parseRating(ratingBefore);
    const pointsAfter = parseRating(ratingAfter);
    const pointsGained = pointsAfter - pointsBefore;

    const isTournamentEvent = !!tournamentId;

    const ref = col("playerRankings").doc(userId);
    const snap = await ref.get();

    let updateData: Record<string, any> = {
      totalPoints: admin.firestore.FieldValue.increment(pointsGained),
      tournamentsPlayed: isTournamentEvent ? admin.firestore.FieldValue.increment(1) : admin.firestore.FieldValue.increment(0),
      ratingTrend: pointsGained > 0 ? "up" : pointsGained < 0 ? "down" : "stable",
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };

    if (isTournamentEvent) {
      updateData.tournamentsWon = won
        ? admin.firestore.FieldValue.increment(1)
        : admin.firestore.FieldValue.increment(0);
    }

    await ref.update(updateData);

    res.json({ success: true });
  } catch (error) {
    console.error("updateRating error:", error);
    res.status(500).json({ success: false, error: "Failed to update player ranking" });
  }
});

// GET /api/rankings/position/:userId - Get user's rank position (1 = highest points)
export const getUserPosition = functions.https.onRequest(async (req, res) => {
  try {
    const userId = (req as any).params.userId;
    if (!userId) return res.status(400).json({ success: false, error: "Missing user ID" });

    const snapshot = await col("playerRankings").orderBy("totalPoints", "desc").get();

    let rank = 1;
    for (const doc of snapshot.docs) {
      if (doc.id === userId) return res.json({ success: true, data: { position: rank } });
      rank++;
    }

    // User not found in rankings
    res.json({ success: true, data: { position: snapshot.docs.length + 1 } });
  } catch (error) {
    console.error("getUserPosition error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch user rank position" });
  }
});