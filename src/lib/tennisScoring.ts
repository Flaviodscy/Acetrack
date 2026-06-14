export type PlayerIndex = 0 | 1;

export type SetScore = {
  games: [number, number];
  tiebreak?: [number, number];
  winner?: PlayerIndex;
};

export type MatchState = {
  players: [string, string];
  pointScore: [number, number];
  sets: SetScore[];
  currentSet: SetScore;
  server: PlayerIndex;
  tiebreak: boolean;
  winner?: PlayerIndex;
  history: MatchSnapshot[];
};

export type MatchSnapshot = Omit<MatchState, "history">;

const POINT_LABELS = ["0", "15", "30", "40"];

export function createMatch(players: [string, string] = ["You", "Opponent"]): MatchState {
  return {
    players,
    pointScore: [0, 0],
    sets: [],
    currentSet: { games: [0, 0] },
    server: 0,
    tiebreak: false,
    history: []
  };
}

export function scorePoint(state: MatchState, player: PlayerIndex): MatchState {
  if (state.winner !== undefined) return state;

  const next = cloneWithHistory(state);

  if (next.tiebreak) {
    next.pointScore[player] += 1;
    next.currentSet.tiebreak = [...next.pointScore] as [number, number];

    if (hasWonTiebreak(next.pointScore, player)) {
      completeGame(next, player, true);
    }

    return next;
  }

  next.pointScore[player] += 1;

  if (hasWonGame(next.pointScore, player)) {
    completeGame(next, player, false);
  }

  return next;
}

export function undoPoint(state: MatchState): MatchState {
  const previous = state.history.at(-1);
  if (!previous) return state;

  return {
    ...cloneSnapshot(previous),
    history: state.history.slice(0, -1)
  };
}

export function getPointDisplay(state: MatchState): [string, string] {
  if (state.tiebreak) {
    return [String(state.pointScore[0]), String(state.pointScore[1])];
  }

  const [a, b] = state.pointScore;

  if (a >= 3 && b >= 3) {
    if (a === b) return ["DEUCE", "DEUCE"];
    return a > b ? ["AD", "40"] : ["40", "AD"];
  }

  return [POINT_LABELS[a] ?? "40", POINT_LABELS[b] ?? "40"];
}

export function getCompletedSets(state: MatchState): SetScore[] {
  return [...state.sets, state.currentSet];
}

export function getFinalScore(state: MatchState): string {
  return getCompletedSets(state)
    .filter((set) => set.winner !== undefined || set.games[0] > 0 || set.games[1] > 0)
    .map((set) => {
      const base = `${set.games[0]}-${set.games[1]}`;
      return set.tiebreak ? `${base} (${set.tiebreak[0]}-${set.tiebreak[1]})` : base;
    })
    .join(", ");
}

function cloneWithHistory(state: MatchState): MatchState {
  return {
    ...cloneSnapshot(state),
    history: [...state.history, cloneSnapshot(state)]
  };
}

function cloneSnapshot(state: Omit<MatchState, "history">): MatchSnapshot {
  return {
    players: [...state.players] as [string, string],
    pointScore: [...state.pointScore] as [number, number],
    sets: state.sets.map(cloneSet),
    currentSet: cloneSet(state.currentSet),
    server: state.server,
    tiebreak: state.tiebreak,
    winner: state.winner
  };
}

function cloneSet(set: SetScore): SetScore {
  return {
    games: [...set.games] as [number, number],
    tiebreak: set.tiebreak ? ([...set.tiebreak] as [number, number]) : undefined,
    winner: set.winner
  };
}

function hasWonGame(points: [number, number], player: PlayerIndex): boolean {
  const opponent = other(player);
  return points[player] >= 4 && points[player] - points[opponent] >= 2;
}

function hasWonTiebreak(points: [number, number], player: PlayerIndex): boolean {
  const opponent = other(player);
  return points[player] >= 7 && points[player] - points[opponent] >= 2;
}

function completeGame(state: MatchState, player: PlayerIndex, fromTiebreak: boolean) {
  state.currentSet.games[player] += 1;
  state.currentSet.winner = getSetWinner(state.currentSet.games, player, fromTiebreak);
  state.pointScore = [0, 0];
  state.server = other(state.server);

  if (state.currentSet.winner !== undefined) {
    state.sets.push(cloneSet(state.currentSet));
    if (state.sets.filter((set) => set.winner === player).length === 2) {
      state.winner = player;
      state.currentSet = cloneSet(state.sets.at(-1)!);
      state.sets = state.sets.slice(0, -1);
      state.tiebreak = false;
      return;
    }

    state.currentSet = { games: [0, 0] };
  }

  state.tiebreak = state.currentSet.games[0] === 6 && state.currentSet.games[1] === 6;
  if (state.tiebreak) {
    state.currentSet.tiebreak = [0, 0];
  }
}

function getSetWinner(games: [number, number], player: PlayerIndex, fromTiebreak: boolean): PlayerIndex | undefined {
  const opponent = other(player);
  if (fromTiebreak && games[player] === 7 && games[opponent] === 6) return player;
  if (games[player] >= 6 && games[player] - games[opponent] >= 2) return player;
  return undefined;
}

function other(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}
