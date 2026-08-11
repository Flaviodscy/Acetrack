import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { Swords, X, Trophy, Sparkles } from "lucide-react-native";
import type { NearbyPlayer } from "../types/domain";

const SAMPLE_PLAYERS = [
  { id: "p1", name: "Carlos Alcaraz", rating: "5.5 UTR", level: 18, latOffset: 0.003, lngOffset: 0.002, avatar: "CA" },
  { id: "p2", name: "Elena Rybakina", rating: "4.5 UTR", level: 12, latOffset: -0.005, lngOffset: 0.004, avatar: "ER" },
  { id: "p3", name: "Marcus Turner", rating: "4.0 UTR", level: 9, latOffset: 0.008, lngOffset: -0.006, avatar: "MT" },
  { id: "p4", name: "Sophia Chen", rating: "5.0 UTR", level: 15, latOffset: -0.007, lngOffset: -0.005, avatar: "SC" },
];

export default function UserMapScreen() {
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  const sendChallenge = (player: any) => {
    Alert.alert(
      "🎾 Challenge Dispatched!",
      `You challenged ${player.name} (${player.rating}). When they accept on AceTrack, you will receive an alert to start scoring.`,
      [{ text: "Awesome", onPress: () => setSelectedPlayer(null) }]
    );
  };

  return (
    <View className="flex-1 bg-tennis-surface">
      {location ? (
        <MapView
          provider={PROVIDER_DEFAULT}
          className="flex-1"
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          {SAMPLE_PLAYERS.map((p) => {
            const lat = location.latitude + p.latOffset;
            const lng = location.longitude + p.lngOffset;
            return (
              <Marker
                key={p.id}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => setSelectedPlayer(p)}
              >
                <View className="items-center">
                  <View className="bg-tennis-lime px-2.5 py-1 rounded-full border border-tennis-dark shadow-md">
                    <Text className="text-[10px] font-black text-tennis-dark">{p.name}</Text>
                  </View>
                  <View className="w-9 h-9 rounded-full bg-tennis-dark items-center justify-center border-2 border-white mt-1 shadow-md">
                    <Text className="text-white font-bold text-xs">{p.avatar}</Text>
                  </View>
                </View>
              </Marker>
            );
          })}
        </MapView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1e2b11" />
          <Text className="text-tennis-sub text-xs font-bold mt-3">Discovering nearby tennis players...</Text>
        </View>
      )}

      {/* Selected Player Bottom Sheet */}
      {selectedPlayer && (
        <View className="absolute bottom-6 left-4 right-4 bg-white p-5 rounded-3xl shadow-xl border border-tennis-border">
          <View className="flex-row items-center space-x-3 mb-4">
            <View className="w-12 h-12 rounded-full bg-tennis-lime items-center justify-center">
              <Text className="text-tennis-dark font-black text-base">{selectedPlayer.avatar}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-tennis-dark">{selectedPlayer.name}</Text>
              <Text className="text-tennis-sub text-xs">Skill: {selectedPlayer.rating} · Level {selectedPlayer.level}</Text>
            </View>
          </View>

          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => sendChallenge(selectedPlayer)}
              className="flex-1 bg-tennis-lime py-3.5 rounded-2xl flex-row items-center justify-center space-x-2 shadow-sm"
            >
              <Swords size={18} color="#1e2b11" />
              <Text className="text-tennis-dark font-black text-sm">Send Match Challenge</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedPlayer(null)}
              className="px-4 py-3.5 bg-gray-100 rounded-2xl items-center justify-center"
            >
              <Text className="text-gray-500 font-bold text-sm">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
