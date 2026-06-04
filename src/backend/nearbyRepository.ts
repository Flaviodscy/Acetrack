import { getFirebaseDb } from "./firebaseClient";
import type { NearbyPlayer, UserProfile } from "../types/domain";

export type PlayerLocation = {
  id: string;
  accuracy?: number;
  lat: number;
  lng: number;
  profile: Pick<UserProfile, "avatar" | "level" | "name" | "portrait" | "rating">;
  source?: "aceTrackGps";
  updatedAt?: string;
};

export async function savePlayerLocation(userId: string, profile: UserProfile, coords: GeolocationCoordinates) {
  const db = await getFirebaseDb();
  if (!db) return { mode: "local" as const };

  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "publicLocations", userId), {
    accuracy: Math.round(coords.accuracy),
    lat: roundCoordinate(coords.latitude),
    lng: roundCoordinate(coords.longitude),
    profile: {
      avatar: profile.avatar,
      level: profile.level,
      name: profile.name,
      portrait: profile.portrait,
      rating: profile.rating
    },
    source: "aceTrackGps",
    updatedAt: new Date().toISOString()
  });

  return { mode: "firebase" as const };
}

export async function listPlayerLocations(): Promise<PlayerLocation[]> {
  const db = await getFirebaseDb();
  if (!db) return [];

  const { collection, getDocs } = await import("firebase/firestore");
  const snapshot = await getDocs(collection(db, "publicLocations"));

  return snapshot.docs.flatMap((locationDoc) => {
    const data = locationDoc.data();
    if (typeof data.lat !== "number" || typeof data.lng !== "number") return [];
    if (data.source !== "aceTrackGps") return [];
    if (typeof data.updatedAt === "string" && isStaleLocation(data.updatedAt)) return [];

    const profile = data.profile as Partial<PlayerLocation["profile"]> | undefined;
    if (!profile?.name || !profile.avatar || !profile.portrait || typeof profile.level !== "number") return [];
    if (isKnownDemoProfile(profile.name)) return [];

    return [{
      accuracy: typeof data.accuracy === "number" ? data.accuracy : undefined,
      id: locationDoc.id,
      lat: data.lat,
      lng: data.lng,
      profile: {
        avatar: profile.avatar,
        level: profile.level,
        name: profile.name,
        portrait: profile.portrait,
        rating: profile.rating ?? "0 Ace XP"
      },
      source: "aceTrackGps",
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined
    }];
  });
}

function roundCoordinate(value: number) {
  return Math.round(value * 100000) / 100000;
}

function isStaleLocation(updatedAt: string) {
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp > 24 * 60 * 60 * 1000;
}

function isKnownDemoProfile(name: string) {
  return new Set([
    "alex morgan",
    "jamie carter",
    "ethan brooks",
    "olivia martinez",
    "lucas green",
    "maya patel",
    "noah kim",
    "nora kim",
    "carlos alcaraz",
    "serena",
    "venus"
  ]).has(name.trim().toLowerCase());
}

export function toNearbyPlayers(locations: PlayerLocation[], origin: GeolocationCoordinates, currentUserId?: string): NearbyPlayer[] {
  return locations
    .filter((location) => location.id !== currentUserId)
    .map((location, index) => {
      const distanceKm = getDistanceKm(origin.latitude, origin.longitude, location.lat, location.lng);
      return {
        avatar: location.profile.avatar,
        distance: `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`,
        distanceKm,
        distanceMiles: distanceKm / 1.609344,
        id: location.id,
        isLive: true,
        lat: location.lat,
        lng: location.lng,
        level: location.profile.level,
        name: location.profile.name,
        points: Math.max(0, location.profile.level * 100),
        portrait: location.profile.portrait,
        rank: index + 1,
        rating: location.profile.rating,
        streak: Math.max(0, Math.round(location.profile.level / 4)),
        updatedAt: location.updatedAt
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map((player, index) => ({ ...player, rank: index + 1 }));
}

function getDistanceKm(latA: number, lngA: number, latB: number, lngB: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(latB - latA);
  const dLng = toRadians(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}
