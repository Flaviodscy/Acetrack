import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Play, MapPin, Trophy, Flame, Zap, ArrowRight } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export default function HomeScreen({ navigation }: any) {
  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-xs font-bold text-tennis-sub uppercase tracking-wider">Welcome back</Text>
            <Text className="text-2xl font-black text-tennis-dark">Flavio Gorodscy</Text>
          </View>
          <View className="flex-row items-center bg-white px-3.5 py-2 rounded-full border border-tennis-border space-x-1 shadow-sm">
            <Flame size={18} color="#e06236" />
            <Text className="text-xs font-black text-tennis-dark">4 Match Streak</Text>
          </View>
        </View>

        {/* Quick Play Banner */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate("Live")}
          className="bg-tennis-dark p-6 rounded-3xl mb-5 shadow-lg border-2 border-tennis-lime"
        >
          <View className="flex-row justify-between items-start mb-2">
            <View className="bg-tennis-lime/20 px-3 py-1 rounded-full">
              <Text className="text-tennis-lime font-black text-[10px] uppercase tracking-widest">READY TO COMPETE?</Text>
            </View>
            <Zap size={20} color="#cdea5f" />
          </View>
          <Text className="text-white font-black text-2xl mb-1">Start Live Match</Text>
          <Text className="text-white/70 text-xs mb-5">Touch scoring, live voice umpire calls & GPS telemetry</Text>
          <View className="bg-tennis-lime self-start px-5 py-2.5 rounded-full flex-row items-center space-x-2">
            <Play size={14} color="#1e2b11" fill="#1e2b11" />
            <Text className="text-tennis-dark font-black text-xs">Launch Scoreboard</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Discovery Grid */}
        <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider mb-3">Explore Your Area</Text>
        <View className="flex-row space-x-3 mb-6">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Courts")}
            className="flex-1 bg-white p-5 rounded-3xl border border-tennis-border items-center space-y-2 shadow-sm"
          >
            <View className="w-12 h-12 rounded-full bg-tennis-lime/20 items-center justify-center">
              <MapPin size={24} color="#1e2b11" />
            </View>
            <Text className="font-bold text-tennis-dark text-sm">Find Courts</Text>
            <Text className="text-[11px] text-tennis-sub text-center">GPS Tennis Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Players")}
            className="flex-1 bg-white p-5 rounded-3xl border border-tennis-border items-center space-y-2 shadow-sm"
          >
            <View className="w-12 h-12 rounded-full bg-tennis-lime/20 items-center justify-center">
              <Trophy size={24} color="#1e2b11" />
            </View>
            <Text className="font-bold text-tennis-dark text-sm">Challenge</Text>
            <Text className="text-[11px] text-tennis-sub text-center">Local Opponents</Text>
          </TouchableOpacity>
        </View>

        {/* Player Level & XP Card */}
        <View className="bg-white p-5 rounded-3xl border border-tennis-border shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-bold text-tennis-sub uppercase tracking-wider">Player Progression</Text>
            <Text className="text-xs font-black text-tennis-dark">Level 14</Text>
          </View>
          <View className="w-full bg-tennis-surface h-3 rounded-full overflow-hidden mb-2">
            <View className="bg-tennis-lime h-full w-3/4 rounded-full" />
          </View>
          <Text className="text-[11px] text-tennis-sub font-semibold">1,420 / 2,000 Ace XP to Level 15</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
