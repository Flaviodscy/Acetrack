import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart3, TrendingUp, Zap, Flame, Award, Target, Trophy, Clock, ArrowUpRight, Share2, Activity } from "lucide-react-native";
import { Storage } from "../lib/storage";

export default function MatchAnalyticsScreen() {
  const [selectedTab, setSelectedTab] = useState<"Overview" | "Serve" | "Rallies">("Overview");
  const [stats, setStats] = useState({
    matchesPlayed: 16,
    winRate: "75%",
    firstServePct: "68%",
    acesPerMatch: 6.4,
    avgServeSpeed: "114 MPH",
    breakPointsConverted: "72%",
    totalPointsWon: 1420,
    forehandWinners: 64,
    backhandWinners: 38,
    unforcedErrors: 19,
    longestRally: "26 Shots",
  });

  useEffect(() => {
    (async () => {
      const history = await Storage.getItem<any[]>("acetrack:matches", []);
      if (history && history.length > 0) {
        setStats((prev) => ({
          ...prev,
          matchesPlayed: 16 + history.length,
        }));
      }
    })();
  }, []);

  const handleExportTelemetry = async () => {
    await Share.share({
      message: `📊 ACETRACK TELEMETRY PRO REPORT:\nMatches: ${stats.matchesPlayed} | Win Rate: ${stats.winRate}\n1st Serve: ${stats.firstServePct} | Max Serve: 118 MPH\nBreak Pts: ${stats.breakPointsConverted} | Total Pts: ${stats.totalPointsWon}`,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider">DEEP TELEMETRY</Text>
            <Text className="text-2xl font-black text-tennis-dark">Match Analytics</Text>
          </View>
          <TouchableOpacity
            onPress={handleExportTelemetry}
            className="p-3 bg-white rounded-full border border-tennis-border shadow-sm"
          >
            <Share2 size={18} color="#1e2b11" />
          </TouchableOpacity>
        </View>

        {/* Top Metric Cards */}
        <View className="flex-row space-x-3 mb-5">
          <View className="flex-1 bg-tennis-dark p-5 rounded-3xl border-2 border-tennis-lime shadow-xl">
            <View className="flex-row justify-between items-center mb-1">
              <Trophy size={18} color="#cdea5f" />
              <View className="bg-tennis-lime/20 px-2 py-0.5 rounded-full">
                <Text className="text-tennis-lime font-black text-[9px]">CAREER</Text>
              </View>
            </View>
            <Text className="text-3xl font-black text-white mt-1">{stats.winRate}</Text>
            <Text className="text-white/70 text-xs font-bold mt-0.5">{stats.matchesPlayed} Matches Won</Text>
          </View>

          <View className="flex-1 bg-white p-5 rounded-3xl border border-tennis-border shadow-sm">
            <View className="flex-row justify-between items-center mb-1">
              <Zap size={18} color="#1e2b11" />
              <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                <Text className="text-amber-800 font-black text-[9px]">RADAR</Text>
              </View>
            </View>
            <Text className="text-3xl font-black text-tennis-dark mt-1">{stats.avgServeSpeed}</Text>
            <Text className="text-tennis-sub text-xs font-bold mt-0.5">Average 1st Serve</Text>
          </View>
        </View>

        {/* Tab Controls */}
        <View className="flex-row bg-white p-1.5 rounded-2xl border border-tennis-border mb-5 shadow-sm">
          {(["Overview", "Serve", "Rallies"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              className={`flex-1 py-2.5 rounded-xl items-center ${
                selectedTab === tab ? "bg-tennis-dark" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-black ${
                  selectedTab === tab ? "text-tennis-lime" : "text-tennis-sub"
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Detailed Stats Breakdown */}
        {selectedTab === "Overview" && (
          <View className="bg-white p-5 rounded-3xl border border-tennis-border shadow-sm mb-6 space-y-4">
            <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
              <Text className="text-xs font-bold text-tennis-sub uppercase">1st Serve Percentage</Text>
              <Text className="text-base font-black text-tennis-dark">{stats.firstServePct}</Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
              <Text className="text-xs font-bold text-tennis-sub uppercase">Break Points Converted</Text>
              <Text className="text-base font-black text-tennis-dark">{stats.breakPointsConverted}</Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
              <Text className="text-xs font-bold text-tennis-sub uppercase">Aces per Match (Avg)</Text>
              <Text className="text-base font-black text-tennis-dark">{stats.acesPerMatch}</Text>
            </View>
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-xs font-bold text-tennis-sub uppercase">Longest Groundstroke Rally</Text>
              <Text className="text-base font-black text-tennis-dark">{stats.longestRally}</Text>
            </View>
          </View>
        )}

        {selectedTab === "Serve" && (
          <View className="bg-white p-5 rounded-3xl border border-tennis-border shadow-sm mb-6 space-y-4">
            <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider">Serve Placement Radar</Text>
            <View className="space-y-3">
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs font-bold text-tennis-dark">Wide Slice (Deuce Side)</Text>
                  <Text className="text-xs font-black text-tennis-dark">42%</Text>
                </View>
                <View className="w-full bg-tennis-surface h-3 rounded-full overflow-hidden">
                  <View className="bg-tennis-lime h-full w-[42%]" />
                </View>
              </View>
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs font-bold text-tennis-dark">Down The 'T' (Flat)</Text>
                  <Text className="text-xs font-black text-tennis-dark">38%</Text>
                </View>
                <View className="w-full bg-tennis-surface h-3 rounded-full overflow-hidden">
                  <View className="bg-tennis-lime h-full w-[38%]" />
                </View>
              </View>
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs font-bold text-tennis-dark">Body Jam (Kick)</Text>
                  <Text className="text-xs font-black text-tennis-dark">20%</Text>
                </View>
                <View className="w-full bg-tennis-surface h-3 rounded-full overflow-hidden">
                  <View className="bg-tennis-lime h-full w-[20%]" />
                </View>
              </View>
            </View>
          </View>
        )}

        {selectedTab === "Rallies" && (
          <View className="bg-white p-5 rounded-3xl border border-tennis-border shadow-sm mb-6 space-y-4">
            <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider">Shot Breakdown</Text>
            <View className="flex-row space-x-3">
              <View className="flex-1 bg-tennis-surface p-4 rounded-2xl items-center">
                <Text className="text-2xl font-black text-tennis-dark">{stats.forehandWinners}</Text>
                <Text className="text-[10px] font-bold text-tennis-sub uppercase mt-1">Forehand Winners</Text>
              </View>
              <View className="flex-1 bg-tennis-surface p-4 rounded-2xl items-center">
                <Text className="text-2xl font-black text-tennis-dark">{stats.backhandWinners}</Text>
                <Text className="text-[10px] font-bold text-tennis-sub uppercase mt-1">Backhand Winners</Text>
              </View>
            </View>
            <View className="bg-red-50 p-4 rounded-2xl border border-red-200 flex-row justify-between items-center">
              <Text className="text-xs font-black text-red-800 uppercase">Unforced Errors (Avg)</Text>
              <Text className="text-lg font-black text-red-900">{stats.unforcedErrors}</Text>
            </View>
          </View>
        )}

        {/* AI Performance Debrief Box */}
        <View className="bg-tennis-dark p-6 rounded-3xl border-2 border-tennis-lime shadow-xl mb-12">
          <View className="flex-row items-center space-x-2 mb-2">
            <Activity size={20} color="#cdea5f" />
            <Text className="text-white font-black text-base">AI Performance Summary</Text>
          </View>
          <Text className="text-white/70 text-xs font-medium leading-relaxed mb-4">
            Your serve speed has climbed +6 MPH over the last 5 matches. Increasing your 2nd serve kick depth will protect against aggressive forehand returners.
          </Text>
          <View className="bg-white/10 px-3 py-1.5 rounded-full self-start">
            <Text className="text-tennis-lime font-black text-[10px] uppercase">Telemetry Peak: 118 MPH Serve</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
