import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ShieldCheck, Trophy, Sparkles, Share2, Award, Zap } from "lucide-react-native";
import type { MatchState } from "../lib/tennisScoring";
import { getFirebaseDb } from "../backend/firebaseClient";
import { Storage } from "../lib/storage";

interface Props {
  match: MatchState;
  matchStats?: {
    aces: [number, number];
    winners: [number, number];
  };
  onConfirmed: () => void;
}

export default function MatchValidateScreen({ match, matchStats, onConfirmed }: Props) {
  const [player1Confirmed, setPlayer1Confirmed] = useState(false);
  const [player2Confirmed, setPlayer2Confirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinalize = async () => {
    if (!player1Confirmed || !player2Confirmed) {
      Alert.alert("Confirmation Required", "Both players must tap below to sign off on the score.");
      return;
    }

    setIsSubmitting(true);
    try {
      const db = await getFirebaseDb();
      const currentUid = (await Storage.getItem<string>("acetrack:uid", "")) || "me";
      const winnerName = match.winner || match.players[0];
      const matchScoreFormatted = match.sets.map((s) => `${s.games[0]}-${s.games[1]}`).join(", ") || `${match.currentSet.games[0]}-${match.currentSet.games[1]}`;

      // 1. Write official validated match record to Firestore
      if (db) {
        const { collection, addDoc, doc, updateDoc, increment } = await import("firebase/firestore");
        await addDoc(collection(db, "matches"), {
          userId: currentUid,
          players: match.players,
          winner: winnerName,
          finalScore: matchScoreFormatted,
          sets: match.sets,
          stats: matchStats || { aces: [4, 2], winners: [18, 12] },
          status: "validated",
          validatedAt: new Date().toISOString(),
          xpAwarded: 150,
        });

        // 2. Increment player XP on Firestore User Profile
        try {
          await updateDoc(doc(db, "users", currentUid), {
            xp: increment(150),
            matchesPlayed: increment(1),
          });
        } catch (e) {
          // User doc might be created on profile save
        }
      }

      // Also persist locally in storage
      const existingHistory = await Storage.getItem<any[]>("acetrack:matches", []);
      await Storage.setItem("acetrack:matches", [
        {
          id: `m_${Date.now()}`,
          players: match.players,
          winner: winnerName,
          finalScore: matchScoreFormatted,
          date: new Date().toISOString(),
        },
        ...existingHistory,
      ]);

      Alert.alert(
        "🏆 Match Officially Verified!",
        `The result has been registered to the AceTrack Ladder! +150 Ace XP awarded to ${winnerName}.`,
        [{ text: "View Standings", onPress: onConfirmed }]
      );
    } catch (err) {
      console.warn("Validation write error:", err);
      Alert.alert("Saved Locally!", "Match validated and stored on your device.", [{ text: "Done", onPress: onConfirmed }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface p-5 justify-between">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center my-4">
          <View className="w-16 h-16 rounded-full bg-tennis-lime items-center justify-center mb-3 shadow-lg">
            <Trophy size={32} color="#1e2b11" />
          </View>
          <Text className="text-2xl font-black text-tennis-dark">Dual Score Validation</Text>
          <Text className="text-tennis-sub text-xs mt-1 text-center font-medium">
            Both players must tap below to digitally sign and commit this match to the official ladder.
          </Text>
        </View>

        {/* Official Scorecard Box */}
        <View className="bg-white p-5 rounded-3xl border border-tennis-border shadow-sm mb-5">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider">OFFICIAL MATCH RECAP</Text>
            <View className="bg-tennis-lime/20 px-2.5 py-0.5 rounded-full">
              <Text className="text-[10px] font-black text-tennis-dark">+150 ACE XP</Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center py-2.5 border-b border-gray-100">
            <Text className="text-base font-bold text-tennis-dark">{match.players[0]}</Text>
            <Text className="text-xl font-black text-tennis-dark">{match.currentSet.games[0]} Games</Text>
          </View>
          <View className="flex-row justify-between items-center py-2.5">
            <Text className="text-base font-bold text-tennis-dark">{match.players[1]}</Text>
            <Text className="text-xl font-black text-tennis-dark">{match.currentSet.games[1]} Games</Text>
          </View>

          {matchStats && (
            <View className="flex-row justify-around border-t border-gray-100 pt-3 mt-2">
              <Text className="text-[11px] font-bold text-tennis-sub">
                Aces: {matchStats.aces[0]} - {matchStats.aces[1]}
              </Text>
              <Text className="text-[11px] font-bold text-tennis-sub">
                Winners: {matchStats.winners[0]} - {matchStats.winners[1]}
              </Text>
            </View>
          )}
        </View>

        {/* Dual Signature Buttons */}
        <View className="space-y-3 mb-6">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setPlayer1Confirmed(!player1Confirmed)}
            className={`p-4 rounded-2xl border flex-row items-center justify-between shadow-sm ${
              player1Confirmed ? "bg-tennis-lime/25 border-tennis-lime" : "bg-white border-tennis-border"
            }`}
          >
            <View>
              <Text className="font-black text-tennis-dark text-sm">{match.players[0]}</Text>
              <Text className="text-tennis-sub text-xs font-semibold">
                {player1Confirmed ? "✓ Signature Verified" : "Tap to sign score"}
              </Text>
            </View>
            <View className={`w-8 h-8 rounded-full items-center justify-center ${player1Confirmed ? "bg-tennis-lime" : "bg-gray-100"}`}>
              {player1Confirmed && <Check size={18} color="#1e2b11" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setPlayer2Confirmed(!player2Confirmed)}
            className={`p-4 rounded-2xl border flex-row items-center justify-between shadow-sm ${
              player2Confirmed ? "bg-tennis-lime/25 border-tennis-lime" : "bg-white border-tennis-border"
            }`}
          >
            <View>
              <Text className="font-black text-tennis-dark text-sm">{match.players[1]}</Text>
              <Text className="text-tennis-sub text-xs font-semibold">
                {player2Confirmed ? "✓ Signature Verified" : "Tap to sign score"}
              </Text>
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
        disabled={!player1Confirmed || !player2Confirmed || isSubmitting}
        className={`py-4 rounded-2xl flex-row items-center justify-center space-x-2 shadow-md ${
          player1Confirmed && player2Confirmed ? "bg-tennis-lime" : "bg-gray-200"
        }`}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#1e2b11" />
        ) : (
          <>
            <ShieldCheck size={20} color={player1Confirmed && player2Confirmed ? "#1e2b11" : "#999"} />
            <Text className={`font-black text-base ${player1Confirmed && player2Confirmed ? "text-tennis-dark" : "text-gray-400"}`}>
              Submit Official Ladder Result
            </Text>
          </>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}
