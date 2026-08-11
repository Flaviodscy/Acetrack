import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { Navigation, MapPin } from "lucide-react-native";

interface Court {
  id: string;
  name: string;
  courts: number;
  surface: string;
  latOffset: number;
  lngOffset: number;
  latitude?: number;
  longitude?: number;
}

const SAMPLE_COURTS: Court[] = [
  { id: "c1", name: "Central Park Tennis Center", courts: 26, surface: "Hard / Clay", latOffset: 0.004, lngOffset: 0.003 },
  { id: "c2", name: "Riverside Clay Courts", courts: 10, surface: "Red Clay", latOffset: -0.007, lngOffset: -0.005 },
  { id: "c3", name: "East River Tennis Club", courts: 12, surface: "Hard Court", latOffset: 0.011, lngOffset: -0.004 },
  { id: "c4", name: "Highland Park Public Courts", courts: 8, surface: "Hard Court", latOffset: -0.009, lngOffset: 0.008 },
];

export default function CourtFinderScreen() {
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location Access Required", "Please allow location access to discover courts near you.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      setLoading(false);
    })();
  }, []);

  if (loading || !location) {
    return (
      <View className="flex-1 items-center justify-center bg-tennis-surface">
        <ActivityIndicator size="large" color="#1e2b11" />
        <Text className="mt-4 text-tennis-sub font-bold text-sm">Locating nearby tennis courts...</Text>
      </View>
    );
  }

  const courts = SAMPLE_COURTS.map((c) => ({
    ...c,
    latitude: location.latitude + c.latOffset,
    longitude: location.longitude + c.lngOffset,
  }));

  const openInMaps = (court: Court) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${court.name} ${court.latitude},${court.longitude}`)}`;
    Linking.openURL(url);
  };

  return (
    <View className="flex-1 bg-tennis-surface">
      {/* Real Native Map Component */}
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
        {courts.map((court) => (
          <Marker
            key={court.id}
            coordinate={{ latitude: court.latitude!, longitude: court.longitude! }}
            title={court.name}
            description={`${court.courts} Courts · ${court.surface}`}
            onPress={() => setSelectedCourt(court)}
          >
            <View className="bg-tennis-dark p-2 rounded-full border-2 border-tennis-lime shadow-md">
              <Text className="text-base">🎾</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Selected Court Bottom Info Card */}
      {selectedCourt ? (
        <View className="absolute bottom-6 left-4 right-4 bg-white p-5 rounded-3xl shadow-xl border border-tennis-border">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-black text-tennis-dark">{selectedCourt.name}</Text>
              <Text className="text-tennis-sub text-xs font-semibold mt-1">
                {selectedCourt.courts} Public Courts · {selectedCourt.surface}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => openInMaps(selectedCourt)}
              className="bg-tennis-lime px-4 py-2.5 rounded-full flex-row items-center space-x-1.5 shadow-sm"
            >
              <Navigation size={14} color="#1e2b11" />
              <Text className="text-tennis-dark font-black text-xs">Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="absolute bottom-6 left-4 right-4 bg-white/95 p-4 rounded-2xl border border-tennis-border">
          <Text className="text-center text-xs font-bold text-tennis-sub">
            Tap on any tennis pin to view court details and driving directions
          </Text>
        </View>
      )}
    </View>
  );
}
