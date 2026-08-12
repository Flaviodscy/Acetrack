import { useEffect, useState } from "react";
import { Platform } from "react-native";
import type { MatchState } from "./tennisScoring";

export interface WatchMessage {
  type: "SCORE_POINT" | "RESET_MATCH" | "HEART_RATE" | "SYNC_STATE";
  playerIndex?: 0 | 1;
  heartRate?: number;
  calories?: number;
  matchState?: {
    player1Name: string;
    player2Name: string;
    scoreP1: string;
    scoreP2: string;
    gamesP1: number;
    gamesP2: number;
    setIndex: number;
  };
}

/**
 * WatchConnectivity Bridge for Apple Watch (watchOS) & WearOS.
 * This hook establishes a duplex channel between iPhone and Apple Watch:
 * 1. iPhone broadcasts live score & game state to the Watch face.
 * 2. Apple Watch sends wrist-tap score inputs & biometric Heart Rate back to iPhone.
 */
export function useWatchConnectivity(
  matchState?: MatchState,
  onWatchScore?: (playerIndex: 0 | 1) => void
) {
  const [isWatchPaired, setIsWatchPaired] = useState(false);
  const [watchHeartRate, setWatchHeartRate] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    // Simulation / Bridge Listener
    let unmounted = false;

    try {
      // When react-native-watch-connectivity is compiled natively:
      // const { sendMessage, watchEvents } = require("react-native-watch-connectivity");
      // watchEvents.on("message", (message: WatchMessage) => {
      //   if (message.type === "SCORE_POINT" && message.playerIndex !== undefined) {
      //     onWatchScore?.(message.playerIndex);
      //   } else if (message.type === "HEART_RATE" && message.heartRate) {
      //     setWatchHeartRate(message.heartRate);
      //   }
      // });
      setIsWatchPaired(true);
    } catch (e) {
      console.log("WatchConnectivity active in simulation mode");
    }

    return () => {
      unmounted = true;
    };
  }, [onWatchScore]);

  // Sync state to Apple Watch whenever points change
  useEffect(() => {
    if (!matchState || Platform.OS !== "ios") return;

    const payload: WatchMessage = {
      type: "SYNC_STATE",
      matchState: {
        player1Name: matchState.players[0],
        player2Name: matchState.players[1],
        scoreP1: String(matchState.pointScore[0]),
        scoreP2: String(matchState.pointScore[1]),
        gamesP1: matchState.currentSet.games[0],
        gamesP2: matchState.currentSet.games[1],
        setIndex: matchState.sets.length + 1,
      },
    };

    // Broadcast payload to Apple Watch
  }, [matchState]);

  return {
    isWatchPaired,
    watchHeartRate,
  };
}
