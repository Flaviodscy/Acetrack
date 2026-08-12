import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Share, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sparkles, Share2, Flame, Trophy, Swords, Zap, ArrowLeft, RefreshCw, Award } from "lucide-react-native";
import { Storage } from "../lib/storage";

interface Props {
  route?: any;
  navigation?: any;
}

export default function MatchPosterScreen({ route, navigation }: Props) {
  const [styleTone, setStyleTone] = useState<"UFC" | "CYBER" | "VINTAGE" | "CHAMPION">("UFC");
  const [isGenerating, setIsGenerating] = useState(false);
  const [posterData, setPosterData] = useState({
    winner: "Flavio Gorodscy",
    loser: "Opponent",
    score: "6-4, 7-5",
    aces: 8,
    winners: 24,
    speed: "118 MPH",
    duration: "1h 42m",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    eventTitle: "OFFICIAL MAIN EVENT",
  });

  useEffect(() => {
    (async () => {
      // Pull recent match data if available
      const history = await Storage.getItem<any[]>("acetrack:matches", []);
      if (history && history.length > 0) {
        const last = history[0];
        setPosterData((prev) => ({
          ...prev,
          winner: last.winner || "Flavio Gorodscy",
          loser: (last.players && last.players.find((p: string) => p !== last.winner)) || "Opponent",
          score: last.finalScore || "6-4, 7-5",
        }));
      }
    })();
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🏆 OFFICIAL MATCH VICTORY: ${posterData.winner} def. ${posterData.loser} (${posterData.score})! Generated on AceTrack. #Tennis #AceTrack`,
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const regenerateAiPoster = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      Alert.alert("AI Artwork Rendered! 🎨", `Synthesized high-res fight card with aesthetic: ${styleTone}`);
    }, 1000);
  };

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider">POST-MATCH ARTWORK</Text>
            <Text className="text-xl font-black text-tennis-dark">AI Fight Poster</Text>
          </View>
          <TouchableOpacity
            onPress={handleShare}
            className="p-3 bg-tennis-lime rounded-full shadow-md"
          >
            <Share2 size={18} color="#1e2b11" />
          </TouchableOpacity>
        </View>

        {/* Style Selector Tabs */}
        <Text className="text-xs font-black text-tennis-sub uppercase tracking-wider mb-2">Aesthetic Preset</Text>
        <View className="flex-row space-x-2 mb-5">
          {(["UFC", "CYBER", "VINTAGE", "CHAMPION"] as const).map((tone) => (
            <TouchableOpacity
              key={tone}
              onPress={() => setStyleTone(tone)}
              className={`flex-1 py-2.5 rounded-2xl items-center border shadow-sm ${
                styleTone === tone ? "bg-tennis-dark border-tennis-lime" : "bg-white border-tennis-border"
              }`}
            >
              <Text className={`text-xs font-black ${styleTone === tone ? "text-tennis-lime" : "text-tennis-sub"}`}>
                {tone}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dynamic UFC-Style Fight Poster Frame */}
        <View
          className={`rounded-3xl p-6 shadow-2xl border-2 mb-6 overflow-hidden ${
            styleTone === "UFC"
              ? "bg-black border-red-600"
              : styleTone === "CYBER"
              ? "bg-slate-950 border-cyan-400"
              : styleTone === "VINTAGE"
              ? "bg-[#213318] border-amber-400"
              : "bg-tennis-dark border-tennis-lime"
          }`}
        >
          {/* Header Tag */}
          <View className="flex-row justify-between items-center mb-6">
            <View
              className={`px-3 py-1 rounded-md ${
                styleTone === "UFC"
                  ? "bg-red-600"
                  : styleTone === "CYBER"
                  ? "bg-cyan-500"
                  : styleTone === "VINTAGE"
                  ? "bg-amber-600"
                  : "bg-tennis-lime"
              }`}
            >
              <Text
                className={`font-black text-[10px] tracking-widest ${
                  styleTone === "CHAMPION" ? "text-tennis-dark" : "text-white"
                }`}
              >
                {posterData.eventTitle}
              </Text>
            </View>
            <Text className="text-white/60 font-bold text-xs">{posterData.date}</Text>
          </View>

          {/* Victor Spotlight */}
          <View className="items-center my-2">
            <Text
              className={`font-black text-xs uppercase tracking-widest ${
                styleTone === "UFC"
                  ? "text-red-500"
                  : styleTone === "CYBER"
                  ? "text-cyan-400"
                  : styleTone === "VINTAGE"
                  ? "text-amber-400"
                  : "text-tennis-lime"
              }`}
            >
              ★ VICTORIOUS CHAMPION ★
            </Text>
            <Text className="text-white font-black text-3xl tracking-tight text-center mt-1">
              {posterData.winner.toUpperCase()}
            </Text>

            <View className="bg-white/10 px-4 py-1 rounded-full my-3 border border-white/10">
              <Text className="text-tennis-lime font-black text-xs tracking-widest">DEFEATED</Text>
            </View>

            <Text className="text-white/60 font-black text-lg text-center">
              {posterData.loser.toUpperCase()}
            </Text>
          </View>

          {/* Score Badge */}
          <View className="bg-white/10 p-4 rounded-2xl my-4 border border-white/10 items-center">
            <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">OFFICIAL SCORE</Text>
            <Text className="text-white font-black text-2xl tracking-wider">{posterData.score}</Text>
          </View>

          {/* Telemetry Stats */}
          <View className="flex-row justify-around border-t border-white/10 pt-4">
            <View className="items-center">
              <Text className="text-tennis-lime font-black text-xl">{posterData.aces}</Text>
              <Text className="text-white/60 text-[10px] font-bold">ACES</Text>
            </View>
            <View className="items-center">
              <Text className="text-tennis-lime font-black text-xl">{posterData.winners}</Text>
              <Text className="text-white/60 text-[10px] font-bold">WINNERS</Text>
            </View>
            <View className="items-center">
              <Text className="text-tennis-lime font-black text-xl">{posterData.speed}</Text>
              <Text className="text-white/60 text-[10px] font-bold">MAX SERVE</Text>
            </View>
          </View>
        </View>

        {/* Action Row */}
        <View className="space-y-3 mb-12">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={regenerateAiPoster}
            disabled={isGenerating}
            className="bg-tennis-dark py-4 rounded-2xl flex-row items-center justify-center space-x-2 border-2 border-tennis-lime shadow-md"
          >
            <Sparkles size={18} color="#cdea5f" />
            <Text className="text-tennis-lime font-black text-sm">
              {isGenerating ? "Synthesizing AI Artwork..." : "Regenerate AI Fight Poster"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleShare}
            className="bg-tennis-lime py-4 rounded-2xl flex-row items-center justify-center space-x-2 shadow-sm"
          >
            <Share2 size={18} color="#1e2b11" />
            <Text className="text-tennis-dark font-black text-sm">Share to Instagram / Stories</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
