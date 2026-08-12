import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trophy, TrendingUp, Award, Flame, UserPlus, Users, Search, ChevronRight } from "lucide-react-native";

interface RankedPlayer {
  rank: number;
  name: string;
  avatar: string;
  rating: string;
  points: number;
  streak: number;
  winRate: string;
  isCurrentUser?: boolean;
}

const LEADERBOARD_DATA: RankedPlayer[] = [
  { rank: 1, name: "Carlos Alcaraz", avatar: "CA", rating: "6.2 UTR", points: 3420, streak: 8, winRate: "92%" },
  { rank: 2, name: "Jannik Sinner", avatar: "JS", rating: "6.1 UTR", points: 3290, streak: 5, winRate: "89%" },
  { rank: 3, name: "Flavio Gorodscy", avatar: "FG", rating: "4.5 UTR", points: 2180, streak: 4, winRate: "78%", isCurrentUser: true },
  { rank: 4, name: "Elena Rybakina", avatar: "ER", rating: "4.2 UTR", points: 1950, streak: 2, winRate: "74%" },
  { rank: 5, name: "Marcus Turner", avatar: "MT", rating: "4.0 UTR", points: 1820, streak: 3, winRate: "70%" },
  { rank: 6, name: "Sophia Chen", avatar: "SC", rating: "3.8 UTR", points: 1640, streak: 1, winRate: "65%" },
];

export default function LadderRankingsScreen() {
  const [activeDivision, setActiveDivision] = useState<"Premier" | "Challenger" | "Local">("Premier");
  const [searchQuery, setSearchQuery] = useState("");

  const handleChallengeRank = (player: RankedPlayer) => {
    Alert.alert(
      `Challenge Rank #${player.rank}! ⚔️`,
      `Challenging ${player.name} (${player.points} pts). Winning this match will boost you up the division ladder!`,
      [{ text: "Send Challenge", onPress: () => Alert.alert("Invitation Sent!") }, { text: "Cancel", style: "cancel" }]
    );
  };

  const filtered = LEADERBOARD_DATA.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider">AceTrack Official</Text>
            <Text className="text-2xl font-black text-tennis-dark">Division Ladder</Text>
          </View>
          <View className="w-11 h-11 rounded-full bg-tennis-lime items-center justify-center shadow-md">
            <Trophy size={22} color="#1e2b11" />
          </View>
        </View>

        {/* Division Selector */}
        <View className="flex-row bg-white p-1.5 rounded-2xl border border-tennis-border mb-5 shadow-sm">
          {(["Premier", "Challenger", "Local"] as const).map((div) => (
            <TouchableOpacity
              key={div}
              onPress={() => setActiveDivision(div)}
              className={`flex-1 py-2.5 rounded-xl items-center ${
                activeDivision === div ? "bg-tennis-dark" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-black ${
                  activeDivision === div ? "text-tennis-lime" : "text-tennis-sub"
                }`}
              >
                {div}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Top 3 Podium Cards */}
        <View className="bg-tennis-dark p-5 rounded-3xl border-2 border-tennis-lime shadow-xl mb-6">
          <Text className="text-tennis-lime text-xs font-black uppercase tracking-widest mb-3 text-center">
            🏆 TOP PODIUM RANKINGS
          </Text>
          <View className="flex-row justify-around items-end pt-2">
            {/* Rank 2 */}
            <View className="items-center">
              <View className="w-12 h-12 rounded-full bg-slate-700 items-center justify-center border-2 border-slate-400">
                <Text className="text-white font-bold text-xs">{LEADERBOARD_DATA[1].avatar}</Text>
              </View>
              <Text className="text-white font-bold text-xs mt-1.5">{LEADERBOARD_DATA[1].name.split(" ")[0]}</Text>
              <Text className="text-slate-400 text-[10px] font-semibold">2nd · {LEADERBOARD_DATA[1].points} pts</Text>
            </View>

            {/* Rank 1 (Gold) */}
            <View className="items-center pb-2">
              <View className="w-16 h-16 rounded-full bg-amber-500 items-center justify-center border-4 border-amber-300 shadow-lg">
                <Text className="text-black font-black text-base">{LEADERBOARD_DATA[0].avatar}</Text>
              </View>
              <Text className="text-tennis-lime font-black text-sm mt-2">{LEADERBOARD_DATA[0].name.split(" ")[0]}</Text>
              <Text className="text-white text-[11px] font-bold">1st · {LEADERBOARD_DATA[0].points} pts</Text>
            </View>

            {/* Rank 3 (You) */}
            <View className="items-center">
              <View className="w-12 h-12 rounded-full bg-tennis-lime items-center justify-center border-2 border-white">
                <Text className="text-tennis-dark font-black text-xs">{LEADERBOARD_DATA[2].avatar}</Text>
              </View>
              <Text className="text-white font-bold text-xs mt-1.5">{LEADERBOARD_DATA[2].name.split(" ")[0]} (You)</Text>
              <Text className="text-tennis-lime text-[10px] font-semibold">3rd · {LEADERBOARD_DATA[2].points} pts</Text>
            </View>
          </View>
        </View>

        {/* Full Roster List */}
        <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider mb-3">Live Ladder Standings</Text>
        <View className="space-y-3 mb-10">
          {filtered.map((player) => (
            <TouchableOpacity
              key={player.rank}
              activeOpacity={0.8}
              onPress={() => !player.isCurrentUser && handleChallengeRank(player)}
              className={`p-4 rounded-3xl border flex-row items-center justify-between shadow-sm ${
                player.isCurrentUser
                  ? "bg-tennis-lime/20 border-tennis-lime"
                  : "bg-white border-tennis-border"
              }`}
            >
              <View className="flex-row items-center space-x-3">
                <View className="w-8 items-center justify-center">
                  <Text className="text-sm font-black text-tennis-dark">#{player.rank}</Text>
                </View>
                <View className="w-11 h-11 rounded-full bg-tennis-dark items-center justify-center border border-tennis-lime">
                  <Text className="text-white font-black text-xs">{player.avatar}</Text>
                </View>
                <View>
                  <Text className="text-sm font-black text-tennis-dark">
                    {player.name} {player.isCurrentUser ? "👑 (You)" : ""}
                  </Text>
                  <Text className="text-tennis-sub text-xs font-semibold">
                    {player.rating} · Win rate: {player.winRate}
                  </Text>
                </View>
              </View>

              <View className="items-end">
                <Text className="text-sm font-black text-tennis-dark">{player.points} PTS</Text>
                <View className="flex-row items-center space-x-1">
                  <Flame size={12} color="#f97316" />
                  <Text className="text-[10px] text-tennis-sub font-bold">{player.streak} streak</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
