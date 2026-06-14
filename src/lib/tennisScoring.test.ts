import { describe, expect, it } from "vitest";
import { createMatch, getFinalScore, getPointDisplay, scorePoint, undoPoint, type MatchState } from "./tennisScoring";

function scoreGame(state = createMatch(), player: 0 | 1 = 0) {
  return Array.from({ length: 4 }).reduce<MatchState>((next) => scorePoint(next, player), state);
}

describe("tennis scoring", () => {
  it("moves through standard point labels", () => {
    let match = createMatch();
    match = scorePoint(match, 0);
    expect(getPointDisplay(match)).toEqual(["15", "0"]);
    match = scorePoint(match, 1);
    match = scorePoint(match, 0);
    expect(getPointDisplay(match)).toEqual(["30", "15"]);
  });

  it("preserves both scores when points alternate", () => {
    let match = createMatch(["Flavio", "Tania"]);
    match = scorePoint(match, 1);
    expect(getPointDisplay(match)).toEqual(["0", "15"]);

    match = scorePoint(match, 0);
    expect(getPointDisplay(match)).toEqual(["15", "15"]);

    match = scorePoint(match, 1);
    expect(getPointDisplay(match)).toEqual(["15", "30"]);
  });

  it("handles deuce and advantage", () => {
    let match = createMatch();
    [0, 0, 0, 1, 1, 1].forEach((player) => {
      match = scorePoint(match, player as 0 | 1);
    });
    expect(getPointDisplay(match)).toEqual(["DEUCE", "DEUCE"]);
    match = scorePoint(match, 0);
    expect(getPointDisplay(match)).toEqual(["AD", "40"]);
    match = scorePoint(match, 1);
    expect(getPointDisplay(match)).toEqual(["DEUCE", "DEUCE"]);
  });

  it("awards a set at 6 games with a two game margin", () => {
    let match = createMatch();
    for (let i = 0; i < 6; i += 1) match = scoreGame(match, 0);
    expect(match.sets).toHaveLength(1);
    expect(match.sets[0].games).toEqual([6, 0]);
    expect(match.winner).toBeUndefined();
  });

  it("keeps the selected server and alternates after each completed game", () => {
    let match = createMatch(["Player One", "Player Two"]);
    match.server = 1;

    match = scoreGame(match, 0);
    expect(match.server).toBe(0);

    match = scoreGame(match, 1);
    expect(match.server).toBe(1);
  });

  it("plays a tiebreak at 6-6 and records the tiebreak score", () => {
    let match = createMatch();
    for (let i = 0; i < 5; i += 1) match = scoreGame(match, 0);
    for (let i = 0; i < 6; i += 1) match = scoreGame(match, 1);
    match = scoreGame(match, 0);
    expect(match.tiebreak).toBe(true);

    for (let i = 0; i < 7; i += 1) match = scorePoint(match, 0);
    expect(match.sets[0].games).toEqual([7, 6]);
    expect(match.sets[0].tiebreak).toEqual([7, 0]);
  });

  it("wins a best of three match after two sets", () => {
    let match = createMatch(["Mia", "Leo"]);
    for (let set = 0; set < 2; set += 1) {
      for (let game = 0; game < 6; game += 1) match = scoreGame(match, 0);
    }
    expect(match.winner).toBe(0);
    expect(getFinalScore(match)).toBe("6-0, 6-0");
  });

  it("undoes the previous point", () => {
    let match = createMatch();
    match = scorePoint(match, 0);
    match = scorePoint(match, 0);
    match = undoPoint(match);
    expect(getPointDisplay(match)).toEqual(["15", "0"]);
  });

  it("records point-by-point history snapshots correctly", () => {
    let match = createMatch(["Flavio", "Tania"]);
    expect(match.history).toHaveLength(0);

    match = scorePoint(match, 0);
    expect(match.history).toHaveLength(1);
    expect(match.history[0].pointScore).toEqual([0, 0]);

    match = scorePoint(match, 1);
    expect(match.history).toHaveLength(2);
    expect(match.history[1].pointScore).toEqual([1, 0]);

    match = undoPoint(match);
    expect(match.history).toHaveLength(1);
    expect(match.pointScore).toEqual([1, 0]);
  });
});
