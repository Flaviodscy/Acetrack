import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Watch, Heart, Activity, Flame, Shield, CheckCircle, Wifi } from "lucide-react-native";

export default function WatchWorkoutScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const [heartRate, setHeartRate] = useState(142);
  const [activeCalories, setActiveCalories] = useState(380);

  const toggleWatchPairing = () => {
    if (!isConnected) {
      setIsConnected(true);
      Alert.alert("Apple Watch Linked ⌚️", "AceTrack is now receiving real-time heart rate, workout calories, and wrist score inputs.");
    } else {
      setIsConnected(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-black text-tennis-dark mb-2">Watch & HealthKit</Text>
        <Text className="text-xs text-tennis-sub font-semibold mb-6">
          Real-time wrist scoring + Apple HealthKit & Google Health Connect biometric tracking.
        </Text>

        {/* Watch Connection Status Card */}
        <View className="bg-white p-6 rounded-3xl border border-tennis-border shadow-sm mb-6 items-center">
          <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${isConnected ? "bg-tennis-lime" : "bg-gray-100"}`}>
            <Watch size={32} color="#1e2b11" />
          </View>
          <Text className="text-lg font-black text-tennis-dark">
            {isConnected ? "Apple Watch Ultra Active" : "No Watch Paired"}
          </Text>
          <Text className="text-xs text-tennis-sub font-medium mt-1 mb-4 text-center">
            {isConnected
              ? "Live scoring sync enabled with digital crown and touch gestures"
              : "Tap below to connect your Apple Watch or WearOS device"}
          </Text>
          <TouchableOpacity
            onPress={toggleWatchPairing}
            className={`px-6 py-3 rounded-full flex-row items-center space-x-2 ${
              isConnected ? "bg-tennis-dark" : "bg-tennis-lime"
            }`}
          >
            <Wifi size={16} color={isConnected ? "#cdea5f" : "#1e2b11"} />
            <Text className={`font-black text-xs ${isConnected ? "text-tennis-lime" : "text-tennis-dark"}`}>
              {isConnected ? "Disconnect Watch" : "Pair Apple Watch"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Real-Time Biometrics Dashboard */}
        <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider mb-3">Live Workout Biometrics</Text>
        <View className="flex-row space-x-3 mb-6">
          <View className="flex-1 bg-white p-5 rounded-3xl border border-tennis-border items-center shadow-sm">
            <Heart size={24} color="#ef4444" />
            <Text className="text-2xl font-black text-tennis-dark mt-2">{heartRate} BPM</Text>
            <Text className="text-[11px] text-tennis-sub font-bold">Heart Rate (Avg)</Text>
          </View>

          <View className="flex-1 bg-white p-5 rounded-3xl border border-tennis-border items-center shadow-sm">
            <Flame size={24} color="#f97316" />
            <Text className="text-2xl font-black text-tennis-dark mt-2">{activeCalories} KCAL</Text>
            <Text className="text-[11px] text-tennis-sub font-bold">Active Calories</Text>
          </View>
        </View>

        {/* HealthKit Sync Card */}
        <View className="bg-tennis-dark p-6 rounded-3xl border-2 border-tennis-lime shadow-lg mb-10">
          <View className="flex-row items-center space-x-3 mb-3">
            <Activity size={24} color="#cdea5f" />
            <Text className="text-lg font-black text-white">Apple HealthKit Sync</Text>
          </View>
          <Text className="text-xs text-white/70 font-medium mb-4">
            Every match is automatically recorded as a Tennis Workout in Apple Fitness & Activity Rings.
          </Text>
          <View className="flex-row items-center space-x-2">
            <CheckCircle size={16} color="#cdea5f" />
            <Text className="text-tennis-lime font-bold text-xs">Biometrics Enabled</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
