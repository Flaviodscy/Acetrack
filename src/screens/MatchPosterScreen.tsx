import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sparkles, Share2, Flame, Trophy, Swords, Zap, ArrowLeft, RefreshCw } from "lucide-react-native";

interface Props {
  route?: any;
  navigation?: any;
}

export default function MatchPosterScreen({ route, navigation }: Props) {
  const [styleTone, setStyleTone] = useState<"UFC" | "CYBER" | "VINTAGE" | "CHAMPION">("UFC");
  const [isGenerating, setIsGenerating] = useState(false);

  const matchData = route?.params?.match || {
    winner: "Flavio Gorodscy",
    loser: "Opponent",
    score: "6-4, 7-5",
    aces: 8,
    winners: 24,
    speed: "118 MPH",
    duration: "1h 42m",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎾 POST-MATCH OFFICIAL VICTORY: ${matchData.winner} def. ${matchData.loser} (${matchData.score})! Generated on AceTrack.`,
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const regenerateAiPoster = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      Alert.alert("AI Poster Rendered! 🎨", `Generated with style preset: ${styleTone}`);
    }, 1000);
  };

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View className="flex-row justify-between items-center mb-5">
          <TouchableOpacity
            onPress={() => navigation?.goBack?.() || undefined}
            className="p-2.5 bg-white rounded-full border border-tennis-border shadow-sm"
          >
            <ArrowLeft size={18} color="#1e2b11" />
          </TouchableOpacity>
          <Text className="text-sm font-black text-tennis-dark uppercase tracking-widest">AI FIGHT POSTER</Text>
          <TouchableOpacity
            onPress={handleShare}
            className="p-2.5 bg-tennis-lime rounded-full shadow-sm"
          >
            <Share2 size={18} color="#1e2b11" />
          </TouchableOpacity>
        </View>

        {/* Style Selector Tabs */}
        <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider mb-2.5">Choose Poster Aesthetic</Text>
        <View className="flex-row space-x-2 mb-5">
          {(["UFC", "CYBER", "VINTAGE", "CHAMPION"] as const).map((tone) => (
            <TouchableOpacity
              key={tone}
              onPress={() => setStyleTone(tone)}
              className={`flex-1 py-2.5 rounded-xl items-center border ${
                styleTone === tone ? "bg-tennis-dark border-tennis-lime" : "bg-white border-tennis-border"
              }`}
            >
              <Text className={`text-xs font-black ${styleTone === tone ? "text-tennis-lime" : "text-tennis-sub"}`}>
                {tone}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dynamic UFC-Style Fight Poster Card */}
        <View
          className={`rounded-3xl p-6 shadow-2xl border-2 mb-6 overflow-hidden ${
            styleTone === "UFC"
              ? "bg-black border-red-600"
              : styleTone === "CYBER"
              ? "bg-slate-950 border-cyan-400"
              : styleTone === "VINTAGE"
              ? "bg-[#25391d] border-amber-400"
              : "bg-tennis-dark border-tennis-lime"
          }`}
        >
          {/* Header Banner */}
          <View className="flex-row justify-between items-center mb-6">
            <View className="bg-red-600 px-3 py-1 rounded-md">
              <Text className="text-white font-black text-[10px] tracking-widest">OFFICIAL MAIN EVENT</Text>
            </View>
            <Text className="text-white/60 font-bold text-xs">{matchData.date}</Text>
          </View>

          {/* Versus Header */}
          <View className="items-center my-2">
            <Text className="text-red-500 font-black text-xs uppercase tracking-widest">VICTORIOUS CHAMPION</Text>
            <Text className="text-white font-black text-3xl tracking-tight text-center mt-1">
              {matchData.winner.toUpperCase()}
            </Text>
            <View className="bg-white/10 px-4 py-1.5 rounded-full my-3 border border-white/10">
              <Text className="text-tennis-lime font-black text-sm tracking-widest">VS</Text>
            </View>
            <Text className="text-white/60 font-black text-xl text-center">
              {matchData.loser.toUpperCase()}
            </Text>
          </View>

          {/* Score Badge */}
          <View className="bg-white/10 p-4 rounded-2xl my-5 border border-white/10 items-center">
            <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">FINAL MATCH SCORE</Text>
            <Text className="text-white font-black text-2xl tracking-wider">{matchData.score}</Text>
          </View>

          {/* Fight Telemetry Grid */}
          <View className="flex-row justify-around border-t border-white/10 pt-4">
            <View className="items-center">
              <Text className="text-tennis-lime font-black text-xl">{matchData.aces}</Text>
              <Text className="text-white/60 text-[10px] font-bold">ACES</Text>
            </View>
            <View className="items-center">
              <Text className="text-tennis-lime font-black text-xl">{matchData.winners}</Text>
              <Text className="text-white/60 text-[10px] font-bold">WINNERS</Text>
            </View>
            <View className="items-center">
              <Text className="text-tennis-lime font-black text-xl">{matchData.speed}</Text>
              <Text className="text-white/60 text-[10px] font-bold">MAX SERVE</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="space-y-3 mb-10">
          <TouchableOpacity
            onPress={regenerateAiPoster}
            disabled={isGenerating}
            className="bg-tennis-dark py-4 rounded-2xl flex-row items-center justify-center space-x-2 border border-tennis-lime shadow-md"
          >
            <Sparkles size={18} color="#cdea5f" />
            <Text className="text-tennis-lime font-black text-base">
              {isGenerating ? "Synthesizing AI Artwork..." : "Regenerate AI Fight Poster"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            className="bg-tennis-lime py-4 rounded-2xl flex-row items-center justify-center space-x-2 shadow-sm"
          >
            <Share2 size={18} color="#1e2b11" />
            <Text className="text-tennis-dark font-black text-base">Share to Instagram / Stories</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
