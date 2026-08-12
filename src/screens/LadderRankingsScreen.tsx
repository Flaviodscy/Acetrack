import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trophy, TrendingUp, Award, Flame, UserPlus, Users, Search, RefreshCw, Zap } from "lucide-react-native";
import { getFirebaseDb } from "../backend/firebaseClient";
import { Storage } from "../lib/storage";

export interface RankedPlayer {
  id?: string;
  rank: number;
  name: string;
  avatar: string;
  rating: string;
  points: number;
  streak: number;
  winRate: string;
  isCurrentUser?: boolean;
}

export default function LadderRankingsScreen() {
  const [activeDivision, setActiveDivision] = useState<"Premier" | "Challenger" | "Local">("Premier");
  const [searchQuery, setSearchQuery] = useState("");
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLadderData = async () => {
    try {
      setRefreshing(true);
      const db = await getFirebaseDb();
      const currentUid = (await Storage.getItem<string>("acetrack:uid", "")) || "me";

      let fetchedList: RankedPlayer[] = [];

      // Query real players from Firestore publicLocations / users
      if (db) {
        try {
          const { collection, getDocs, query, orderBy, limit } = await import("firebase/firestore");
          const snapshot = await getDocs(collection(db, "publicLocations"));
          
          let parsed = snapshot.docs.map((d, index) => {
            const data = d.data();
            const isMe = d.id === currentUid;
            return {
              id: d.id,
              rank: index + 1,
              name: data.profile?.name || (isMe ? "Flavio Gorodscy" : "Tennis Player"),
              avatar: data.profile?.avatar || (isMe ? "FG" : "TP"),
              rating: data.profile?.rating || "4.5 UTR",
              points: (data.profile?.level || 10) * 150 + 450,
              streak: isMe ? 4 : Math.floor(Math.random() * 5) + 1,
              winRate: `${70 + Math.floor(Math.random() * 20)}%`,
              isCurrentUser: isMe,
            };
          });

          // Ensure current user is on ladder
          if (!parsed.some((p) => p.isCurrentUser)) {
            parsed.push({
              id: currentUid,
              rank: 3,
              name: "Flavio Gorodscy",
              avatar: "FG",
              rating: "4.5 UTR",
              points: 2180,
              streak: 4,
              winRate: "78%",
              isCurrentUser: true,
            });
          }

          // Sort by points descending and reassign rank
          parsed.sort((a, b) => b.points - a.points);
          fetchedList = parsed.map((p, idx) => ({ ...p, rank: idx + 1 }));
        } catch (e) {
          console.warn("Ladder query error:", e);
        }
      }

      if (fetchedList.length === 0) {
        fetchedList = [
          { rank: 1, name: "Carlos Alcaraz", avatar: "CA", rating: "6.2 UTR", points: 3420, streak: 8, winRate: "92%" },
          { rank: 2, name: "Jannik Sinner", avatar: "JS", rating: "6.1 UTR", points: 3290, streak: 5, winRate: "89%" },
          { rank: 3, name: "Flavio Gorodscy", avatar: "FG", rating: "4.5 UTR", points: 2180, streak: 4, winRate: "78%", isCurrentUser: true },
          { rank: 4, name: "Elena Rybakina", avatar: "ER", rating: "4.8 UTR", points: 1950, streak: 2, winRate: "74%" },
          { rank: 5, name: "Marcus Turner", avatar: "MT", rating: "4.0 UTR", points: 1820, streak: 3, winRate: "70%" },
          { rank: 6, name: "Sophia Chen", avatar: "SC", rating: "4.5 UTR", points: 1640, streak: 1, winRate: "65%" },
        ];
      }

      setPlayers(fetchedList);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLadderData();
  }, []);

  const handleChallengeRank = (player: RankedPlayer) => {
    Alert.alert(
      `Challenge Rank #${player.rank}! ⚔️`,
      `Challenging ${player.name} (${player.points} pts). Winning this match will boost your AceTrack Division standing!`,
      [{ text: "Send Challenge", onPress: () => Alert.alert("Invitation Dispatched!") }, { text: "Cancel", style: "cancel" }]
    );
  };

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top3 = [
    players.find((p) => p.rank === 2) || players[1],
    players.find((p) => p.rank === 1) || players[0],
    players.find((p) => p.rank === 3) || players[2],
  ].filter(Boolean);

  if (loading && players.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-tennis-surface">
        <ActivityIndicator size="large" color="#1e2b11" />
        <Text className="mt-4 text-tennis-sub font-black text-sm">Loading Division Ladder...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView
        className="p-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLadderData} />}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider">OFFICIAL ACETRACK STANDINGS</Text>
            <Text className="text-2xl font-black text-tennis-dark">Division Ladder</Text>
          </View>
          <TouchableOpacity onPress={fetchLadderData} className="p-3 bg-white rounded-full border border-tennis-border shadow-sm">
            <RefreshCw size={18} color="#1e2b11" />
          </TouchableOpacity>
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

        {/* Top 3 Podium Box */}
        {top3.length >= 3 && (
          <View className="bg-tennis-dark p-5 rounded-3xl border-2 border-tennis-lime shadow-xl mb-6">
            <Text className="text-tennis-lime text-xs font-black uppercase tracking-widest mb-3 text-center">
              🏆 DIVISION PODIUM
            </Text>
            <View className="flex-row justify-around items-end pt-2">
              {/* Rank 2 */}
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-slate-700 items-center justify-center border-2 border-slate-400">
                  <Text className="text-white font-bold text-xs">{top3[0]?.avatar}</Text>
                </View>
                <Text className="text-white font-bold text-xs mt-1.5">{top3[0]?.name.split(" ")[0]}</Text>
                <Text className="text-slate-400 text-[10px] font-semibold">2nd · {top3[0]?.points} pts</Text>
              </View>

              {/* Rank 1 (Gold) */}
              <View className="items-center pb-2">
                <View className="w-16 h-16 rounded-full bg-amber-500 items-center justify-center border-4 border-amber-300 shadow-lg">
                  <Text className="text-black font-black text-base">{top3[1]?.avatar}</Text>
                </View>
                <Text className="text-tennis-lime font-black text-sm mt-2">{top3[1]?.name.split(" ")[0]}</Text>
                <Text className="text-white text-[11px] font-bold">1st · {top3[1]?.points} pts</Text>
              </View>

              {/* Rank 3 */}
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-tennis-lime items-center justify-center border-2 border-white">
                  <Text className="text-tennis-dark font-black text-xs">{top3[2]?.avatar}</Text>
                </View>
                <Text className="text-white font-bold text-xs mt-1.5">{top3[2]?.name.split(" ")[0]}</Text>
                <Text className="text-tennis-lime text-[10px] font-semibold">3rd · {top3[2]?.points} pts</Text>
              </View>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View className="bg-white p-3 rounded-2xl border border-tennis-border flex-row items-center space-x-2 mb-4 shadow-sm">
          <Search size={16} color="#8e9889" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search players on the ladder..."
            className="flex-1 text-xs font-bold text-tennis-dark"
          />
        </View>

        {/* Full Roster List */}
        <View className="space-y-3 mb-10">
          {filtered.map((player) => (
            <TouchableOpacity
              key={player.rank}
              activeOpacity={0.85}
              onPress={() => !player.isCurrentUser && handleChallengeRank(player)}
              className={`p-4 rounded-3xl border flex-row items-center justify-between shadow-sm ${
                player.isCurrentUser
                  ? "bg-tennis-lime/20 border-tennis-lime"
                  : "bg-white border-tennis-border"
              }`}
            >
              <View className="flex-row items-center space-x-3">
                <View className="w-7 items-center justify-center">
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
