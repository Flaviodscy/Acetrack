import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import { RotateCcw, Volume2, CheckCircle2, Award } from "lucide-react-native";
import { createMatch, scorePoint, getPointLabel, type MatchState } from "../lib/tennisScoring";
import MatchValidateScreen from "./MatchValidateScreen";

export default function LiveMatchScreen() {
  const [match, setMatch] = useState<MatchState>(() => createMatch("Flavio", "Opponent", 2));
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showValidation, setShowValidation] = useState(false);

  const announce = (text: string) => {
    if (voiceEnabled) {
      Speech.speak(text, { language: "en-US", pitch: 0.95, rate: 0.95 });
    }
  };

  const handleScore = (playerIndex: 0 | 1) => {
    if (match.isComplete) return;

    const next = scorePoint(match, playerIndex);
    setMatch(next);

    // Live Voice Umpire Call
    if (next.isComplete) {
      announce(`Game, set, and match: ${next.winner}!`);
      setShowValidation(true);
    } else {
      const p1 = getPointLabel(next.currentGame.points, 0, 1, next.currentGame.isTiebreak);
      const p2 = getPointLabel(next.currentGame.points, 1, 0, next.currentGame.isTiebreak);
      if (p1 === "AD") announce("Advantage Flavio");
      else if (p2 === "AD") announce("Advantage Opponent");
      else if (p1 === "40" && p2 === "40") announce("Deuce");
      else announce(`${p1}, ${p2}`);
    }
  };

  const handleReset = () => {
    Alert.alert("Restart Match", "Are you sure you want to reset the current match?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => setMatch(createMatch("Flavio", "Opponent", 2)) },
    ]);
  };

  if (showValidation) {
    return (
      <MatchValidateScreen
        match={match}
        onConfirmed={() => {
          setShowValidation(false);
          setMatch(createMatch("Flavio", "Opponent", 2));
        }}
      />
    );
  }

  const p1Points = getPointLabel(match.currentGame.points, 0, 1, match.currentGame.isTiebreak);
  const p2Points = getPointLabel(match.currentGame.points, 1, 0, match.currentGame.isTiebreak);

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface p-5 justify-between">
      {/* Header controls */}
      <View className="flex-row justify-between items-center py-2">
        <Text className="text-xl font-black text-tennis-dark tracking-wider">ACETRACK LIVE</Text>
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

      {/* Set Scores Bar */}
      <View className="bg-white p-4 rounded-3xl border border-tennis-border flex-row justify-around shadow-sm">
        <View className="items-center">
          <Text className="text-tennis-sub text-xs font-bold">{match.players[0]}</Text>
          <Text className="text-3xl font-black text-tennis-dark mt-1">{match.currentSet.games[0]}</Text>
        </View>
        <View className="items-center justify-center">
          <View className="bg-tennis-surface px-3 py-1 rounded-full">
            <Text className="text-[10px] font-black text-tennis-sub uppercase">GAMES</Text>
          </View>
        </View>
        <View className="items-center">
          <Text className="text-tennis-sub text-xs font-bold">{match.players[1]}</Text>
          <Text className="text-3xl font-black text-tennis-dark mt-1">{match.currentSet.games[1]}</Text>
        </View>
      </View>

      {/* Big Touch Score Buttons */}
      <View className="flex-1 my-4 space-y-4 justify-center">
        {/* Player 1 (You) Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => handleScore(0)}
          className="flex-1 bg-tennis-dark rounded-3xl p-6 justify-between items-center shadow-xl border-2 border-tennis-lime"
        >
          <Text className="text-tennis-lime font-extrabold text-base">{match.players[0]} (Tap to Score)</Text>
          <Text className="text-white font-black text-8xl">{p1Points}</Text>
          <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest">POINTS</Text>
        </TouchableOpacity>

        {/* Player 2 (Opponent) Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => handleScore(1)}
          className="flex-1 bg-white rounded-3xl p-6 justify-between items-center shadow-md border border-tennis-border"
        >
          <Text className="text-tennis-dark font-extrabold text-base">{match.players[1]}</Text>
          <Text className="text-tennis-dark font-black text-8xl">{p2Points}</Text>
          <Text className="text-tennis-sub text-[10px] font-bold uppercase tracking-widest">POINTS</Text>
        </TouchableOpacity>
      </View>

      {/* Finish / Validate trigger */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setShowValidation(true)}
        className="bg-tennis-lime py-4 rounded-2xl flex-row items-center justify-center space-x-2 shadow-sm"
      >
        <CheckCircle2 size={20} color="#1e2b11" />
        <Text className="text-tennis-dark font-black text-base">Validate Match & Save</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
