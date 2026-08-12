import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Watch, Heart, Activity, Flame, Shield, CheckCircle, Wifi, Play, RotateCcw } from "lucide-react-native";

export default function WatchWorkoutScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const [heartRate, setHeartRate] = useState(148);
  const [activeCalories, setActiveCalories] = useState(412);
  const [isMatchActive, setIsMatchActive] = useState(true);

  // Simulated live HR pulse updates
  useEffect(() => {
    let interval: any;
    if (isConnected) {
      interval = setInterval(() => {
        setHeartRate(140 + Math.floor(Math.random() * 18));
        setActiveCalories((prev) => prev + 1);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const toggleWatchPairing = () => {
    if (!isConnected) {
      setIsConnected(true);
      Alert.alert(
        "Apple Watch Paired! ⌚️",
        "AceTrack is now receiving real-time heart rate, workout calories, and wrist score inputs via WatchConnectivity."
      );
    } else {
      setIsConnected(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider">BIOMETRICS & WEARABLES</Text>
          <Text className="text-2xl font-black text-tennis-dark">Apple Watch & HealthKit</Text>
        </View>

        {/* Watch Connection Status Box */}
        <View className="bg-white p-6 rounded-3xl border border-tennis-border shadow-sm mb-6 items-center">
          <View
            className={`w-16 h-16 rounded-full items-center justify-center mb-3 shadow-md ${
              isConnected ? "bg-tennis-lime" : "bg-gray-100"
            }`}
          >
            <Watch size={32} color="#1e2b11" />
          </View>
          <Text className="text-lg font-black text-tennis-dark">
            {isConnected ? "Apple Watch Series 9 Linked" : "No Watch Connected"}
          </Text>
          <Text className="text-xs text-tennis-sub font-medium mt-1 mb-4 text-center">
            {isConnected
              ? "Wrist scoring enabled: Digital Crown scroll & double tap to score points."
              : "Pair your Apple Watch to score from your wrist and sync biometrics."}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={toggleWatchPairing}
            className={`px-6 py-3.5 rounded-full flex-row items-center space-x-2 shadow-sm ${
              isConnected ? "bg-tennis-dark" : "bg-tennis-lime"
            }`}
          >
            <Wifi size={16} color={isConnected ? "#cdea5f" : "#1e2b11"} />
            <Text className={`font-black text-xs ${isConnected ? "text-tennis-lime" : "text-tennis-dark"}`}>
              {isConnected ? "Disconnect Watch" : "Pair Apple Watch"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Biometrics Cards */}
        <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider mb-2.5">
          Match Biometrics (Live)
        </Text>
        <View className="flex-row space-x-3 mb-6">
          <View className="flex-1 bg-white p-5 rounded-3xl border border-tennis-border items-center shadow-sm">
            <Heart size={26} color="#ef4444" />
            <Text className="text-3xl font-black text-tennis-dark mt-2">
              {isConnected ? heartRate : "--"} <Text className="text-xs font-bold text-tennis-sub">BPM</Text>
            </Text>
            <Text className="text-[10px] text-tennis-sub font-bold uppercase mt-1">Heart Rate</Text>
          </View>

          <View className="flex-1 bg-white p-5 rounded-3xl border border-tennis-border items-center shadow-sm">
            <Flame size={26} color="#f97316" />
            <Text className="text-3xl font-black text-tennis-dark mt-2">
              {isConnected ? activeCalories : "--"} <Text className="text-xs font-bold text-tennis-sub">KCAL</Text>
            </Text>
            <Text className="text-[10px] text-tennis-sub font-bold uppercase mt-1">Active Burn</Text>
          </View>
        </View>

        {/* Apple HealthKit Sync Status Banner */}
        <View className="bg-tennis-dark p-6 rounded-3xl border-2 border-tennis-lime shadow-xl mb-10">
          <View className="flex-row items-center space-x-3 mb-2">
            <Activity size={24} color="#cdea5f" />
            <Text className="text-lg font-black text-white">Apple HealthKit Sync</Text>
          </View>
          <Text className="text-xs text-white/70 font-medium mb-4">
            Every match is automatically recorded as an official Tennis Workout in Apple Fitness to close your Activity Rings.
          </Text>
          <View className="flex-row items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full self-start">
            <CheckCircle size={14} color="#cdea5f" />
            <Text className="text-tennis-lime font-bold text-xs">HealthKit Permissions Active</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
