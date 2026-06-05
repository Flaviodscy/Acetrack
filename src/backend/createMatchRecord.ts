import { getCompletedSets, getFinalScore, type MatchState } from "../lib/tennisScoring";
import type { MatchRecord } from "../types/domain";

export type MatchStatsInput = MatchRecord["stats"];
export type MatchFeedbackInput = NonNullable<MatchRecord["feedback"]>;

export function createMatchRecord(
  match: MatchState,
  userId: string,
  durationLabel: string,
  stats: MatchStatsInput,
  feedback?: MatchFeedbackInput,
  opponentFeedback?: MatchFeedbackInput,
  sideUserIds?: [string, string]
): MatchRecord {
  const winner = match.winner === undefined ? undefined : match.players[match.winner];
  const participantUserIds = Array.from(new Set((sideUserIds ?? [userId, ""]).filter(Boolean)));

  return {
    id: crypto.randomUUID(),
    userId,
    participantUserIds,
    sideUserIds,
    createdAt: new Date().toISOString(),
    players: match.players,
    winner,
    finalScore: getFinalScore(match) || "In progress",
    durationLabel,
    sets: getCompletedSets(match),
    scoringState: match,
    stats,
    feedback,
    opponentFeedback
  };
}
