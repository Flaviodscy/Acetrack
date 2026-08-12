import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Camera, Save, Trophy, Shield, Dumbbell, Award, Flame, User } from "lucide-react-native";
import { Storage } from "../lib/storage";
import { getFirebaseDb, getFirebaseAuth } from "../backend/firebaseClient";

export default function ProfileScreen() {
  const [name, setName] = useState("Flavio Gorodscy");
  const [rating, setRating] = useState("4.5 UTR");
  const [level, setLevel] = useState("14");
  const [height, setHeight] = useState("6'1\"");
  const [racket, setRacket] = useState("Babolat Pure Aero 98 (305g)");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const cached = await Storage.getItem<any>("acetrack:profile", null);
      if (cached) {
        if (cached.name) setName(cached.name);
        if (cached.rating) setRating(cached.rating);
        if (cached.level) setLevel(String(cached.level));
        if (cached.height) setHeight(cached.height);
        if (cached.racket) setRacket(cached.racket);
        if (cached.photoUri) setPhotoUri(cached.photoUri);
      }
    })();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow photo library access to upload a player profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const profilePayload = {
      name,
      rating,
      level: Number(level) || 14,
      height,
      racket,
      photoUri,
      updatedAt: new Date().toISOString(),
    };

    try {
      // 1. Save locally to AsyncStorage
      await Storage.setItem("acetrack:profile", profilePayload);

      // 2. Sync to Firestore /users/{uid}
      const db = await getFirebaseDb();
      const currentUid = (await Storage.getItem<string>("acetrack:uid", "")) || "me";

      if (db && currentUid) {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "users", currentUid), profilePayload, { merge: true });
      }

      Alert.alert("Profile Saved 🎾", "Your AceTrack Player Card is updated on the live ladder!");
    } catch (e) {
      console.warn("Profile save error:", e);
      Alert.alert("Saved Locally!", "Profile updated on your device.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-black text-tennis-dark mb-6">Player Profile</Text>

        {/* Profile Avatar with Camera Picker */}
        <View className="items-center mb-6">
          <TouchableOpacity activeOpacity={0.8} onPress={pickImage} className="relative">
            <View className="w-28 h-28 rounded-full bg-tennis-lime items-center justify-center overflow-hidden border-4 border-white shadow-xl">
              {photoUri ? (
                <Image source={{ uri: photoUri }} className="w-full h-full" />
              ) : (
                <Text className="text-3xl font-black text-tennis-dark">FG</Text>
              )}
            </View>
            <View className="absolute bottom-0 right-0 bg-tennis-dark p-2.5 rounded-full border-2 border-white shadow-md">
              <Camera size={16} color="#cdea5f" />
            </View>
          </TouchableOpacity>
          <Text className="text-xs text-tennis-sub mt-2 font-bold">Tap photo to choose avatar</Text>
        </View>

        {/* Player Form Inputs */}
        <View className="bg-white p-5 rounded-3xl border border-tennis-border space-y-4 shadow-sm mb-6">
          <View>
            <Text className="text-xs font-bold text-tennis-sub mb-1 uppercase tracking-wider">Player Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-sm"
            />
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1">
              <Text className="text-xs font-bold text-tennis-sub mb-1 uppercase tracking-wider">Skill Rating</Text>
              <TextInput
                value={rating}
                onChangeText={setRating}
                className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-sm"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-tennis-sub mb-1 uppercase tracking-wider">Division Level</Text>
              <TextInput
                value={level}
                onChangeText={setLevel}
                keyboardType="numeric"
                className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-sm"
              />
            </View>
          </View>

          <View>
            <Text className="text-xs font-bold text-tennis-sub mb-1 uppercase tracking-wider">Height / Size</Text>
            <TextInput
              value={height}
              onChangeText={setHeight}
              className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-sm"
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-tennis-sub mb-1 uppercase tracking-wider">Primary Racket & Specs</Text>
            <TextInput
              value={racket}
              onChangeText={setRacket}
              className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-sm"
            />
          </View>
        </View>

        {/* Save Profile Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={isSaving}
          className="bg-tennis-lime py-4 rounded-2xl flex-row items-center justify-center space-x-2 shadow-md mb-12"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#1e2b11" />
          ) : (
            <>
              <Save size={18} color="#1e2b11" />
              <Text className="text-tennis-dark font-black text-sm">Save Profile Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
