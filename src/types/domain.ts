import type { MatchState, SetScore } from "../lib/tennisScoring";

export type HighlightTag = "Ace" | "Rally" | "Winner" | "Match Point";

export type PlayerProfile = {
  id: string;
  name: string;
  shortName: string;
  avatar: string;
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
  portrait: string;
  location: string;
  rating: string;
  level: number;
  xp: number;
  xpText: string;
  hand: string;
  favoritePro: string;
  skills: Array<[string, number]>;
  equipment: {
    racket: string;
    headSize: string;
    strings: string;
    tension: string;
    grip: string;
  };
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
};

export type BackendMode = "local" | "firebase";
