import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Play, MapPin, Trophy, Flame, Zap, ArrowRight, BrainCircuit, Sparkles, Watch } from "lucide-react-native";
import { Storage } from "../lib/storage";
import { getFirebaseDb } from "../backend/firebaseClient";

export default function HomeScreen({ navigation }: any) {
  const [playerName, setPlayerName] = useState("Flavio Gorodscy");
  const [level, setLevel] = useState(14);
  const [streak, setStreak] = useState(4);
  const [recentMatch, setRecentMatch] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const savedProfile = await Storage.getItem<any>("acetrack:profile", null);
      if (savedProfile) {
        if (savedProfile.name) setPlayerName(savedProfile.name);
        if (savedProfile.level) setLevel(Number(savedProfile.level));
      }

      const matchHistory = await Storage.getItem<any[]>("acetrack:matches", []);
      if (matchHistory && matchHistory.length > 0) {
        setRecentMatch(matchHistory[0]);
        setStreak(matchHistory.length + 1);
      }
    } catch (e) {
      console.warn("Dashboard load error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView
        className="p-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDashboardData} />}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-xs font-bold text-tennis-sub uppercase tracking-wider">Welcome back</Text>
            <Text className="text-2xl font-black text-tennis-dark">{playerName}</Text>
          </View>
          <View className="flex-row items-center bg-white px-3.5 py-2 rounded-full border border-tennis-border space-x-1.5 shadow-sm">
            <Flame size={18} color="#e06236" />
            <Text className="text-xs font-black text-tennis-dark">{streak} Win Streak</Text>
          </View>
        </View>

        {/* Quick Play Banner */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate("Live")}
          className="bg-tennis-dark p-6 rounded-3xl mb-5 shadow-xl border-2 border-tennis-lime"
        >
          <View className="flex-row justify-between items-start mb-2">
            <View className="bg-tennis-lime/20 px-3 py-1 rounded-full">
              <Text className="text-tennis-lime font-black text-[10px] uppercase tracking-widest">READY TO PLAY?</Text>
            </View>
            <Zap size={20} color="#cdea5f" />
          </View>
          <Text className="text-white font-black text-2xl mb-1">Start Live Match Scoring</Text>
          <Text className="text-white/70 text-xs mb-5 font-medium">
            Touch scoring, voice umpire announcements & live Firestore sync
          </Text>
          <View className="bg-tennis-lime self-start px-5 py-2.5 rounded-full flex-row items-center space-x-2 shadow-sm">
            <Play size={14} color="#1e2b11" fill="#1e2b11" />
            <Text className="text-tennis-dark font-black text-xs">Launch Live Match</Text>
          </View>
        </TouchableOpacity>

        {/* Recent Match Box if available */}
        {recentMatch && (
          <View className="bg-white p-5 rounded-3xl border border-tennis-border shadow-sm mb-6">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider">LATEST MATCH RECAP</Text>
              <Text className="text-emerald-700 font-black text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full">
                VERIFIED VICTORY
              </Text>
            </View>
            <Text className="text-base font-black text-tennis-dark">
              {recentMatch.winner || "Flavio G."} def. {recentMatch.players?.[1] || "Opponent"}
            </Text>
            <Text className="text-tennis-sub text-xs font-bold mt-1">Score: {recentMatch.finalScore}</Text>
          </View>
        )}

        {/* 4 Feature Shortcut Grid */}
        <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider mb-3">Explore Your Tools</Text>
        <View className="flex-row flex-wrap justify-between mb-6">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Courts")}
            className="w-[48%] bg-white p-4 rounded-3xl border border-tennis-border items-center space-y-1.5 shadow-sm mb-3"
          >
            <View className="w-12 h-12 rounded-full bg-tennis-lime/20 items-center justify-center">
              <MapPin size={22} color="#1e2b11" />
            </View>
            <Text className="font-black text-tennis-dark text-xs">Find Courts</Text>
            <Text className="text-[10px] text-tennis-sub text-center font-medium">GPS Radar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Ladder")}
            className="w-[48%] bg-white p-4 rounded-3xl border border-tennis-border items-center space-y-1.5 shadow-sm mb-3"
          >
            <View className="w-12 h-12 rounded-full bg-tennis-lime/20 items-center justify-center">
              <Trophy size={22} color="#1e2b11" />
            </View>
            <Text className="font-black text-tennis-dark text-xs">Division Ladder</Text>
            <Text className="text-[10px] text-tennis-sub text-center font-medium">Rankings & Podium</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Coach")}
            className="w-[48%] bg-white p-4 rounded-3xl border border-tennis-border items-center space-y-1.5 shadow-sm"
          >
            <View className="w-12 h-12 rounded-full bg-tennis-lime/20 items-center justify-center">
              <BrainCircuit size={22} color="#1e2b11" />
            </View>
            <Text className="font-black text-tennis-dark text-xs">AI Tennis Coach</Text>
            <Text className="text-[10px] text-tennis-sub text-center font-medium">Gameplans & Drills</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Poster")}
            className="w-[48%] bg-white p-4 rounded-3xl border border-tennis-border items-center space-y-1.5 shadow-sm"
          >
            <View className="w-12 h-12 rounded-full bg-tennis-lime/20 items-center justify-center">
              <Sparkles size={22} color="#1e2b11" />
            </View>
            <Text className="font-black text-tennis-dark text-xs">AI Fight Poster</Text>
            <Text className="text-[10px] text-tennis-sub text-center font-medium">UFC Fight Card</Text>
          </TouchableOpacity>
        </View>

        {/* Player Level & XP Card */}
        <View className="bg-white p-5 rounded-3xl border border-tennis-border shadow-sm mb-8">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider">Division XP Status</Text>
            <Text className="text-xs font-black text-tennis-dark">Level {level}</Text>
          </View>
          <View className="w-full bg-tennis-surface h-3.5 rounded-full overflow-hidden mb-2">
            <View className="bg-tennis-lime h-full w-4/5 rounded-full" />
          </View>
          <Text className="text-[11px] text-tennis-sub font-bold">1,750 / 2,000 Ace XP to Level {level + 1}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
