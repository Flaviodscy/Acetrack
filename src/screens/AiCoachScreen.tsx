import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bot, Sparkles, Trophy, Zap, Shield, Target, ArrowRight, BrainCircuit } from "lucide-react-native";

interface StrategyCard {
  title: string;
  focus: string;
  drills: string[];
  weaknessToExploit: string;
}

export default function AiCoachScreen() {
  const [opponentStyle, setOpponentStyle] = useState("Aggressive Baseliner");
  const [yourRecentStat, setYourRecentStat] = useState("Low First Serve % (48%)");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [strategy, setStrategy] = useState<StrategyCard | null>({
    title: "Heavy Topspin Crosscourt Squeeze",
    focus: "Target Opponent's High Backhand & Extend Rallies to 5+ Shots",
    drills: [
      "Kick Serve out wide on Ad court to open the baseline",
      "Short angled crosscourt forehands to pull them off balance",
      "Approach on deep slice to keep ball below shoulder height"
    ],
    weaknessToExploit: "Opponent makes 65% of unforced errors when rushed onto their high backhand side."
  });

  const analyzeMatchPlan = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setStrategy({
        title: "Serve & Volley Rush Tactic",
        focus: "Disrupt Rhythm and Neutralize Heavy Groundstrokes Early",
        drills: [
          "Serve down the T on Deuce court and charge the net immediately",
          "Deep drop shot recovery when opponent is 3+ feet behind baseline",
          "Body serves to jam their backswing on return"
        ],
        weaknessToExploit: "Opponent sits deep on returns; punish with low net angles and drop volleys."
      });
      Alert.alert("AI Gameplan Ready 🧠", "Tactical adjustments synthesized based on your telemetry.");
    }, 1200);
  };

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center space-x-3 mb-6">
          <View className="w-12 h-12 rounded-full bg-tennis-lime items-center justify-center shadow-md">
            <BrainCircuit size={26} color="#1e2b11" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-black text-tennis-dark">AI Tennis Coach</Text>
            <Text className="text-xs text-tennis-sub font-semibold">
              Algorithmic scouting, tactical drill generator & match debriefs
            </Text>
          </View>
        </View>

        {/* Input parameters card */}
        <View className="bg-white p-5 rounded-3xl border border-tennis-border shadow-sm mb-6 space-y-4">
          <View>
            <Text className="text-xs font-bold text-tennis-sub uppercase tracking-wider mb-1.5">
              Opponent Playing Style
            </Text>
            <TextInput
              value={opponentStyle}
              onChangeText={setOpponentStyle}
              className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-sm"
              placeholder="e.g. Heavy Spin Baseliner, Serve & Volleyer"
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-tennis-sub uppercase tracking-wider mb-1.5">
              Your Current Match Metric to Fix
            </Text>
            <TextInput
              value={yourRecentStat}
              onChangeText={setYourRecentStat}
              className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-sm"
              placeholder="e.g. Backhand errors, Second serve points won"
            />
          </View>

          <TouchableOpacity
            onPress={analyzeMatchPlan}
            disabled={isAnalyzing}
            className="bg-tennis-dark py-4 rounded-2xl flex-row items-center justify-center space-x-2 border-2 border-tennis-lime shadow-md mt-2"
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color="#cdea5f" />
            ) : (
              <>
                <Sparkles size={18} color="#cdea5f" />
                <Text className="text-tennis-lime font-black text-sm uppercase tracking-wider">
                  Generate Tactical Gameplan
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tactical Strategy Plan Result */}
        {strategy && (
          <View className="bg-white p-6 rounded-3xl border border-tennis-border shadow-lg mb-8">
            <View className="flex-row items-center space-x-2 mb-2">
              <View className="bg-tennis-lime px-2.5 py-1 rounded-md">
                <Text className="text-tennis-dark font-black text-[10px] uppercase tracking-widest">TACTICAL PLAN</Text>
              </View>
              <Text className="text-tennis-sub font-bold text-xs">AI Confidence: 94%</Text>
            </View>

            <Text className="text-xl font-black text-tennis-dark mb-1">{strategy.title}</Text>
            <Text className="text-xs text-tennis-sub font-semibold mb-4">{strategy.focus}</Text>

            {/* Exploit Weakness Box */}
            <View className="bg-red-50 p-4 rounded-2xl border border-red-200 mb-4">
              <View className="flex-row items-center space-x-1.5 mb-1">
                <Target size={16} color="#dc2626" />
                <Text className="text-red-700 font-black text-xs uppercase tracking-wider">Opponent Vulnerability</Text>
              </View>
              <Text className="text-red-950 text-xs font-semibold leading-relaxed">
                {strategy.weaknessToExploit}
              </Text>
            </View>

            {/* Drills to Win */}
            <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider mb-2.5">
              3 In-Game Execution Keys
            </Text>
            <View className="space-y-2.5">
              {strategy.drills.map((drill, index) => (
                <View key={index} className="flex-row items-start space-x-2.5 bg-tennis-surface p-3 rounded-2xl">
                  <View className="w-6 h-6 rounded-full bg-tennis-lime items-center justify-center mt-0.5">
                    <Text className="text-tennis-dark font-black text-xs">{index + 1}</Text>
                  </View>
                  <Text className="flex-1 text-tennis-dark font-bold text-xs leading-relaxed">{drill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
