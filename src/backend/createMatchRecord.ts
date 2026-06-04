import { getCompletedSets, getFinalScore, type MatchState } from "../lib/tennisScoring";
import type { MatchRecord } from "../types/domain";

export type MatchStatsInput = MatchRecord["stats"];
export type MatchFeedbackInput = NonNullable<MatchRecord["feedback"]>;

export function createMatchRecord(match: MatchState, userId: string, durationLabel: string, stats: MatchStatsInput, feedback?: MatchFeedbackInput): MatchRecord {
  const winner = match.winner === undefined ? undefined : match.players[match.winner];

  return {
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    players: match.players,
    winner,
    finalScore: getFinalScore(match) || "In progress",
    durationLabel,
    sets: getCompletedSets(match),
    scoringState: match,
    stats,
    feedback
  };
}
