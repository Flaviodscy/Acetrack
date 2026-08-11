import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ShieldCheck, Trophy, Sparkles, Share2 } from "lucide-react-native";
import type { MatchState } from "../lib/tennisScoring";

interface Props {
  match: MatchState;
  onConfirmed: () => void;
}

export default function MatchValidateScreen({ match, onConfirmed }: Props) {
  const [player1Confirmed, setPlayer1Confirmed] = useState(false);
  const [player2Confirmed, setPlayer2Confirmed] = useState(false);

  const handleFinalize = () => {
    if (!player1Confirmed || !player2Confirmed) {
      Alert.alert("Confirmation Required", "Both players must tap below to sign off on the score.");
      return;
    }

    Alert.alert(
      "Official Match Confirmed! 🏆",
      "The result has been registered in the local ladder. +120 Ace XP awarded!",
      [{ text: "Complete", onPress: onConfirmed }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface p-5 justify-between">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center my-4">
          <View className="w-16 h-16 rounded-full bg-tennis-lime items-center justify-center mb-3 shadow-md">
            <Trophy size={32} color="#1e2b11" />
          </View>
          <Text className="text-2xl font-black text-tennis-dark">Dual Score Validation</Text>
          <Text className="text-tennis-sub text-xs mt-1 text-center font-medium">
            Post-Match Verification: Both players must confirm the official result before rankings update.
          </Text>
        </View>

        {/* Scorecard Preview */}
        <View className="bg-white p-5 rounded-3xl border border-tennis-border shadow-sm mb-6">
          <Text className="text-xs font-black text-tennis-sub mb-3 uppercase tracking-wider">Final Sets</Text>
          <View className="flex-row justify-between items-center py-2.5 border-b border-gray-100">
            <Text className="text-base font-bold text-tennis-dark">{match.players[0]}</Text>
            <Text className="text-xl font-black text-tennis-dark">{match.currentSet.games[0]} Games</Text>
          </View>
          <View className="flex-row justify-between items-center py-2.5">
            <Text className="text-base font-bold text-tennis-dark">{match.players[1]}</Text>
            <Text className="text-xl font-black text-tennis-dark">{match.currentSet.games[1]} Games</Text>
          </View>
        </View>

        {/* Dual Signature Buttons */}
        <View className="space-y-3 mb-6">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPlayer1Confirmed(!player1Confirmed)}
            className={`p-4 rounded-2xl border flex-row items-center justify-between shadow-sm ${
              player1Confirmed ? "bg-tennis-lime/25 border-tennis-lime" : "bg-white border-tennis-border"
            }`}
          >
            <View>
              <Text className="font-bold text-tennis-dark text-sm">{match.players[0]}</Text>
              <Text className="text-tennis-sub text-xs font-semibold">{player1Confirmed ? "Signed & Validated" : "Tap to sign score"}</Text>
            </View>
            <View className={`w-8 h-8 rounded-full items-center justify-center ${player1Confirmed ? "bg-tennis-lime" : "bg-gray-100"}`}>
              {player1Confirmed && <Check size={18} color="#1e2b11" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPlayer2Confirmed(!player2Confirmed)}
            className={`p-4 rounded-2xl border flex-row items-center justify-between shadow-sm ${
              player2Confirmed ? "bg-tennis-lime/25 border-tennis-lime" : "bg-white border-tennis-border"
            }`}
          >
            <View>
              <Text className="font-bold text-tennis-dark text-sm">{match.players[1]}</Text>
              <Text className="text-tennis-sub text-xs font-semibold">{player2Confirmed ? "Signed & Validated" : "Tap to sign score"}</Text>
            </View>
            <View className={`w-8 h-8 rounded-full items-center justify-center ${player2Confirmed ? "bg-tennis-lime" : "bg-gray-100"}`}>
              {player2Confirmed && <Check size={18} color="#1e2b11" />}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleFinalize}
        disabled={!player1Confirmed || !player2Confirmed}
        className={`py-4 rounded-2xl flex-row items-center justify-center space-x-2 shadow-sm ${
          player1Confirmed && player2Confirmed ? "bg-tennis-lime" : "bg-gray-200"
        }`}
      >
        <ShieldCheck size={20} color={player1Confirmed && player2Confirmed ? "#1e2b11" : "#999"} />
        <Text className={`font-black text-base ${player1Confirmed && player2Confirmed ? "text-tennis-dark" : "text-gray-400"}`}>
          Submit Official Match
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
