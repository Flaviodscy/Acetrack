import type { MatchState, SetScore } from "../lib/tennisScoring";

export type HighlightTag = "Ace" | "Rally" | "Winner" | "Match Point";

export type PlayerProfile = {
  id: string;
  name: string;
  shortName: string;
  avatar: string;
  photoDataUrl?: string;
  portrait: string;
  location?: string;
  rating: string;
  level: number;
  xp?: number;
  xpText?: string;
};

export type UserProfile = {
  name: string;
  shortName: string;
  avatar: string;
  photoDataUrl?: string;
  portrait: string;
  location: string;
  rating: string;
  level: number;
  xp: number;
  xpText: string;
  hand: string;
  favoritePro: string;
  skills: Array<[string, number]>;
  skillVotes?: Record<string, {
    negative: number;
    neutral: number;
    positive: number;
    score: number;
    total: number;
  }>;
  equipment: {
    racket: string;
    headSize: string;
    strings: string;
    tension: string;
    grip: string;
  };
};

export type AdminUserProfile = UserProfile & {
  accountType?: "managed" | "registered";
  email?: string;
  userId: string;
  updatedAt?: string;
};

export type NearbyPlayer = {
  avatar: string;
  distance: string;
  distanceKm: number;
  distanceMiles: number;
  id: string;
  isLive?: boolean;
  lat?: number;
  lng?: number;
  level: number;
  locationLabel?: string;
  name: string;
  points: number;
  portrait: string;
  rank: number;
  rating?: string;
  streak: number;
  updatedAt?: string;
};

export type MatchRecord = {
  id: string;
  userId: string;
  createdAt: string;
  players: [string, string];
  winner?: string;
  finalScore: string;
  durationLabel: string;
  sets: SetScore[];
  scoringState: MatchState;
  stats: {
    aces: [number, number];
    winners: [number, number];
    unforcedErrors: [number, number];
  };
  feedback?: {
    adjustments: Record<string, -1 | 0 | 1>;
    bonusPercent: number;
    tokensUsed: number;
  };
  opponentFeedback?: {
    adjustments: Record<string, -1 | 0 | 1>;
    bonusPercent: number;
    tokensUsed: number;
  };
};

export type BackendMode = "local" | "firebase";
