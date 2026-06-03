import { getCompletedSets, getFinalScore, type MatchState } from "../lib/tennisScoring";
import type { MatchRecord } from "../types/domain";

export function createMatchRecord(match: MatchState, userId: string): MatchRecord {
  const winner = match.winner === undefined ? undefined : match.players[match.winner];

  return {
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    players: match.players,
    winner,
    finalScore: getFinalScore(match) || "In progress",
    durationLabel: "00:36",
    sets: getCompletedSets(match),
    scoringState: match,
    stats: {
      aces: [7, 5],
      winners: [34, 28],
      unforcedErrors: [18, 24]
    }
  };
}
