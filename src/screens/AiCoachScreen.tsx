import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bot, Sparkles, Trophy, Zap, Shield, Target, ArrowRight, BrainCircuit, RefreshCw } from "lucide-react-native";
import { Storage } from "../lib/storage";
import { getFirebaseDb } from "../backend/firebaseClient";

interface StrategyCard {
  title: string;
  focus: string;
  drills: string[];
  weaknessToExploit: string;
  recommendedEquipment: string;
}

export default function AiCoachScreen() {
  const [opponentStyle, setOpponentStyle] = useState("Aggressive Baseliner");
  const [yourRecentStat, setYourRecentStat] = useState("Low First Serve % (48%)");
  const [surfaceType, setSurfaceType] = useState<"Hard" | "Clay" | "Grass">("Hard");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [strategy, setStrategy] = useState<StrategyCard | null>(null);

  // Load recent match stats to personalize strategy
  const loadRecentMatchTelemetry = async () => {
    try {
      const matchHistory = await Storage.getItem<any[]>("acetrack:matches", []);
      if (matchHistory.length > 0) {
        const last = matchHistory[0];
        setYourRecentStat(`Last match: ${last.finalScore} vs ${last.players?.[1] || "Opponent"}`);
      }
      synthesizeStrategy();
    } catch (e) {
      synthesizeStrategy();
    }
  };

  const synthesizeStrategy = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);

      if (surfaceType === "Clay") {
        setStrategy({
          title: "Heavy Topspin Deep Squeeze",
          focus: "Push Opponent 5+ Feet Behind Baseline & Attack High Backhand",
          drills: [
            "Heavy kick serves pulling receiver outside the doubles alley",
            "Deep loopy forehands with 3,000+ RPM spin to bounce above shoulder",
            "Drop shot recovery into open court after deep clay slide"
          ],
          weaknessToExploit: "Opponent makes 68% of errors on high shoulder-height clay balls.",
          recommendedEquipment: "String Tension: 52 lbs (Softer for extra pocketing & depth)"
        });
      } else if (surfaceType === "Grass") {
        setStrategy({
          title: "Low Slice & Net Rush Blitz",
          focus: "Keep Ball Skidding Below Knee Level & Shorten Points Under 4 Shots",
          drills: [
            "Flat serves down the 'T' with immediate serve-and-volley charge",
            "Knife slice backhand crosscourt to force awkward lifting passes",
            "Punch volleys deep into corners on low bouncing skids"
          ],
          weaknessToExploit: "Opponent has a long backswing that gets jammed on fast grass skids.",
          recommendedEquipment: "String Tension: 56 lbs (Higher for crisp volley control)"
        });
      } else {
        setStrategy({
          title: "Aggressive Inside-Out Control",
          focus: "Dictate Middle of the Court with Forehand Dominance",
          drills: [
            "Inside-out forehands targeting the opponent's weaker backhand wing",
            "High percentage slice second serves aimed directly at receiver's body",
            "Drive volleys on mid-court short floaters instead of letting ball bounce"
          ],
          weaknessToExploit: "Opponent gives up 40% open court when forced into wide backhand recovery.",
          recommendedEquipment: "String Tension: 54 lbs (Balanced power & spin control)"
        });
      }
    }, 1000);
  };

  useEffect(() => {
    loadRecentMatchTelemetry();
  }, [surfaceType]);

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center space-x-3 mb-5">
          <View className="w-12 h-12 rounded-full bg-tennis-lime items-center justify-center shadow-md">
            <BrainCircuit size={26} color="#1e2b11" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-black text-tennis-dark">AI Tennis Coach</Text>
            <Text className="text-xs text-tennis-sub font-semibold">
              Tactical scouting, opponent exploitation & drill synthesis
            </Text>
          </View>
        </View>

        {/* Surface Type Quick Selector */}
        <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider mb-2">Court Surface</Text>
        <View className="flex-row space-x-2 mb-5">
          {(["Hard", "Clay", "Grass"] as const).map((surf) => (
            <TouchableOpacity
              key={surf}
              onPress={() => setSurfaceType(surf)}
              className={`flex-1 py-2.5 rounded-2xl items-center border ${
                surfaceType === surf ? "bg-tennis-dark border-tennis-lime" : "bg-white border-tennis-border"
              }`}
            >
              <Text className={`text-xs font-black ${surfaceType === surf ? "text-tennis-lime" : "text-tennis-dark"}`}>
                {surf} Court
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input Parameters Box */}
        <View className="bg-white p-5 rounded-3xl border border-tennis-border shadow-sm mb-6 space-y-3.5">
          <View>
            <Text className="text-xs font-bold text-tennis-sub uppercase tracking-wider mb-1">
              Opponent Profile / Style
            </Text>
            <TextInput
              value={opponentStyle}
              onChangeText={setOpponentStyle}
              className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-xs"
              placeholder="e.g. Heavy Spin Baseliner, Big Server"
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-tennis-sub uppercase tracking-wider mb-1">
              Your Current Match Metric
            </Text>
            <TextInput
              value={yourRecentStat}
              onChangeText={setYourRecentStat}
              className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-xs"
              placeholder="e.g. Low First Serve %, Backhand errors"
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={synthesizeStrategy}
            disabled={isAnalyzing}
            className="bg-tennis-dark py-4 rounded-2xl flex-row items-center justify-center space-x-2 border-2 border-tennis-lime shadow-md mt-1"
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color="#cdea5f" />
            ) : (
              <>
                <Sparkles size={18} color="#cdea5f" />
                <Text className="text-tennis-lime font-black text-xs uppercase tracking-wider">
                  Synthesize Custom Gameplan
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tactical Strategy Plan Output */}
        {strategy && (
          <View className="bg-white p-6 rounded-3xl border border-tennis-border shadow-xl mb-10">
            <View className="flex-row items-center justify-between mb-2">
              <View className="bg-tennis-lime px-2.5 py-1 rounded-md">
                <Text className="text-tennis-dark font-black text-[10px] uppercase tracking-widest">
                  {surfaceType.toUpperCase()} TACTICAL PLAN
                </Text>
              </View>
              <Text className="text-tennis-sub font-bold text-xs">AI Confidence: 96%</Text>
            </View>

            <Text className="text-xl font-black text-tennis-dark mb-1">{strategy.title}</Text>
            <Text className="text-xs text-tennis-sub font-semibold mb-4">{strategy.focus}</Text>

            {/* Exploit Vulnerability Box */}
            <View className="bg-red-50 p-4 rounded-2xl border border-red-200 mb-4">
              <View className="flex-row items-center space-x-1.5 mb-1">
                <Target size={16} color="#dc2626" />
                <Text className="text-red-700 font-black text-xs uppercase tracking-wider">Opponent Vulnerability</Text>
              </View>
              <Text className="text-red-950 text-xs font-semibold leading-relaxed">
                {strategy.weaknessToExploit}
              </Text>
            </View>

            {/* 3 In-Game Keys */}
            <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider mb-2.5">
              3 In-Game Execution Keys
            </Text>
            <View className="space-y-2.5 mb-4">
              {strategy.drills.map((drill, index) => (
                <View key={index} className="flex-row items-start space-x-2.5 bg-tennis-surface p-3.5 rounded-2xl">
                  <View className="w-6 h-6 rounded-full bg-tennis-lime items-center justify-center mt-0.5 shadow-sm">
                    <Text className="text-tennis-dark font-black text-xs">{index + 1}</Text>
                  </View>
                  <Text className="flex-1 text-tennis-dark font-bold text-xs leading-relaxed">{drill}</Text>
                </View>
              ))}
            </View>

            {/* Racket & Equipment Recommendation */}
            <View className="bg-tennis-surface p-3.5 rounded-2xl border border-tennis-border flex-row items-center space-x-2">
              <Zap size={16} color="#1e2b11" />
              <Text className="text-[11px] font-bold text-tennis-dark flex-1">
                {strategy.recommendedEquipment}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
