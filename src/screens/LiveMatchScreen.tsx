import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import { RotateCcw, Volume2, CheckCircle2 } from "lucide-react-native";
import { createMatch, scorePoint, getPointDisplay, type MatchState } from "../lib/tennisScoring";
import { getFirebaseDb } from "../backend/firebaseClient";
import { opponent } from "../data/starterData";
import { usePlayerProfile } from "../hooks/usePlayerProfile";
import { Storage } from "../lib/storage";
import MatchValidateScreen from "./MatchValidateScreen";

export default function LiveMatchScreen({ navigation }: any) {
  const { profile, loading } = usePlayerProfile();
  const player1Name = profile.name;
  const player2Name = opponent.name;
  const [match, setMatch] = useState<MatchState | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showValidation, setShowValidation] = useState(false);
  const [matchStats, setMatchStats] = useState({
    aces: [0, 0] as [number, number],
    winners: [0, 0] as [number, number],
  });

  useEffect(() => {
    if (!loading) {
      setMatch(createMatch([player1Name, player2Name]));
    }
  }, [loading, player1Name, player2Name]);

  const syncLiveMatchToFirestore = async (state: MatchState, currentStats = matchStats) => {
    try {
      const db = await getFirebaseDb();
      const currentUid = (await Storage.getItem<string>("acetrack:uid", "")) || "me";
      if (db) {
        const { doc, setDoc } = await import("firebase/firestore");
        const activeId = matchId || `live_${currentUid}_${Date.now()}`;
        if (!matchId) setMatchId(activeId);

        await setDoc(doc(db, "liveMatches", activeId), {
          id: activeId,
          creatorId: currentUid,
          players: state.players,
          pointScore: state.pointScore,
          currentSet: state.currentSet,
          sets: state.sets,
          winner: state.winner !== undefined ? state.players[state.winner] : null,
          stats: currentStats,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (err) {
      console.warn("Live match sync error:", err);
    }
  };

  const announceScore = (text: string) => {
    if (voiceEnabled) {
      Speech.speak(text, { language: "en-US", pitch: 0.95, rate: 0.95 });
    }
  };

  const handleScore = (playerIndex: 0 | 1) => {
    if (!match || match.winner !== undefined) return;

    const next = scorePoint(match, playerIndex);
    setMatch(next);
    syncLiveMatchToFirestore(next);

    const [p1, p2] = getPointDisplay(next);

    // Dynamic Voice Announcements
    if (next.winner !== undefined) {
      announceScore(`Game, set, and match: ${next.players[next.winner]}!`);
      setShowValidation(true);
    } else {
      if (p1 === "AD") announceScore(`Advantage ${next.players[0]}`);
      else if (p2 === "AD") announceScore(`Advantage ${next.players[1]}`);
      else if (p1 === "DEUCE" && p2 === "DEUCE") announceScore("Deuce");
      else if (p1 === "0" && p2 === "0") announceScore(`Game ${next.players[playerIndex]}`);
      else announceScore(`${p1}, ${p2}`);
    }
  };

  const recordStat = (type: "aces" | "winners", playerIndex: 0 | 1) => {
    if (!match) return;
    const updated = {
      ...matchStats,
      [type]: [
        playerIndex === 0 ? matchStats[type][0] + 1 : matchStats[type][0],
        playerIndex === 1 ? matchStats[type][1] + 1 : matchStats[type][1],
      ] as [number, number],
    };
    setMatchStats(updated);
    handleScore(playerIndex);
    announceScore(type === "aces" ? `Ace by ${match.players[playerIndex]}!` : `Winner by ${match.players[playerIndex]}!`);
  };

  const handleReset = () => {
    Alert.alert("Restart Match", "Are you sure you want to reset the live score?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          const fresh = createMatch([player1Name, player2Name]);
          setMatch(fresh);
          setMatchStats({ aces: [0, 0], winners: [0, 0] });
          syncLiveMatchToFirestore(fresh, { aces: [0, 0], winners: [0, 0] });
        },
      },
    ]);
  };

  if (!match) {
    return (
      <SafeAreaView className="flex-1 bg-tennis-surface items-center justify-center">
        <Text className="text-tennis-dark font-black">Loading match...</Text>
      </SafeAreaView>
    );
  }

  if (showValidation) {
    return (
      <MatchValidateScreen
        match={match}
        matchStats={matchStats}
        onConfirmed={() => {
          setShowValidation(false);
          const fresh = createMatch([player1Name, player2Name]);
          setMatch(fresh);
          setMatchStats({ aces: [0, 0], winners: [0, 0] });
        }}
      />
    );
  }

  const [p1Points, p2Points] = getPointDisplay(match);

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface p-5 justify-between">
      {/* Header controls */}
      <View className="flex-row justify-between items-center py-2">
        <View>
          <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider">OFFICIAL COURT 1</Text>
          <Text className="text-xl font-black text-tennis-dark">LIVE SCOREBOARD</Text>
        </View>
        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-3 rounded-full shadow-sm ${voiceEnabled ? "bg-tennis-lime" : "bg-gray-200"}`}
          >
            <Volume2 size={18} color="#1e2b11" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} className="p-3 bg-white rounded-full border border-tennis-border shadow-sm">
            <RotateCcw size={18} color="#1e2b11" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Set & Games Bar */}
      <View className="bg-white p-4 rounded-3xl border border-tennis-border flex-row justify-around shadow-sm">
        <View className="items-center">
          <Text className="text-tennis-sub text-xs font-bold">{match.players[0]}</Text>
          <Text className="text-3xl font-black text-tennis-dark mt-1">{match.currentSet.games[0]}</Text>
          <Text className="text-[10px] text-tennis-lime font-black bg-tennis-dark px-2 py-0.5 rounded-full mt-1">
            {matchStats.aces[0]} Aces · {matchStats.winners[0]} W
          </Text>
        </View>
        <View className="items-center justify-center">
          <View className="bg-tennis-surface px-3 py-1 rounded-full">
            <Text className="text-[10px] font-black text-tennis-sub uppercase tracking-widest">
              SET {match.sets.length + 1}
            </Text>
          </View>
        </View>
        <View className="items-center">
          <Text className="text-tennis-sub text-xs font-bold">{match.players[1]}</Text>
          <Text className="text-3xl font-black text-tennis-dark mt-1">{match.currentSet.games[1]}</Text>
          <Text className="text-[10px] text-tennis-sub font-black bg-gray-100 px-2 py-0.5 rounded-full mt-1">
            {matchStats.aces[1]} Aces · {matchStats.winners[1]} W
          </Text>
        </View>
      </View>

      {/* Big Touch Score Buttons */}
      <View className="flex-1 my-3 space-y-3 justify-center">
        {/* Player 1 (You) Pad */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => handleScore(0)}
          className="flex-1 bg-tennis-dark rounded-3xl p-5 justify-between items-center shadow-xl border-2 border-tennis-lime"
        >
          <View className="flex-row justify-between w-full items-center">
            <Text className="text-tennis-lime font-black text-base">{match.players[0]}</Text>
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={() => recordStat("aces", 0)}
                className="bg-tennis-lime/20 px-3 py-1 rounded-full border border-tennis-lime"
              >
                <Text className="text-tennis-lime font-black text-[10px]">+ ACE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => recordStat("winners", 0)}
                className="bg-tennis-lime/20 px-3 py-1 rounded-full border border-tennis-lime"
              >
                <Text className="text-tennis-lime font-black text-[10px]">+ WINNER</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text className="text-white font-black text-8xl">{p1Points}</Text>
          <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest">TAP TO SCORE POINT</Text>
        </TouchableOpacity>

        {/* Player 2 (Opponent) Pad */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => handleScore(1)}
          className="flex-1 bg-white rounded-3xl p-5 justify-between items-center shadow-md border border-tennis-border"
        >
          <View className="flex-row justify-between w-full items-center">
            <Text className="text-tennis-dark font-black text-base">{match.players[1]}</Text>
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={() => recordStat("aces", 1)}
                className="bg-gray-100 px-3 py-1 rounded-full border border-gray-300"
              >
                <Text className="text-tennis-dark font-black text-[10px]">+ ACE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => recordStat("winners", 1)}
                className="bg-gray-100 px-3 py-1 rounded-full border border-gray-300"
              >
                <Text className="text-tennis-dark font-black text-[10px]">+ WINNER</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text className="text-tennis-dark font-black text-8xl">{p2Points}</Text>
          <Text className="text-tennis-sub text-[10px] font-bold uppercase tracking-widest">TAP TO SCORE POINT</Text>
        </TouchableOpacity>
      </View>

      {/* Finish & Validate Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setShowValidation(true)}
        className="bg-tennis-lime py-4 rounded-2xl flex-row items-center justify-center space-x-2 shadow-sm"
      >
        <CheckCircle2 size={20} color="#1e2b11" />
        <Text className="text-tennis-dark font-black text-base">Validate Match Result</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
