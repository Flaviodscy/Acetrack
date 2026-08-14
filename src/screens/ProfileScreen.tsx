import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Camera, Save } from "lucide-react-native";
import { usePlayerProfile } from "../hooks/usePlayerProfile";
import type { UserProfile } from "../types/domain";

export default function ProfileScreen() {
  const { profile, loading, saveProfile } = usePlayerProfile();
  const [draft, setDraft] = useState<UserProfile | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setDraft(profile);
      setPhotoUri(profile.photoDataUrl ?? null);
    }
  }, [loading, profile]);

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
    if (!draft) return;

    setIsSaving(true);
    const nextProfile: UserProfile = {
      ...draft,
      shortName: draft.name.split(" ")[0] || draft.shortName,
      avatar: draft.name.slice(0, 2).toUpperCase() || draft.avatar,
      photoDataUrl: photoUri ?? draft.photoDataUrl,
      equipment: {
        ...draft.equipment,
        racket: draft.equipment.racket
      }
    };

    try {
      const result = await saveProfile(nextProfile);
      Alert.alert(
        "Profile Saved",
        result.mode === "firebase"
          ? "Your AceTrack player card is synced to Firebase."
          : "Profile saved on this device. Sign in to sync across devices."
      );
    } catch (error) {
      console.warn("Profile save error:", error);
      Alert.alert("Save failed", "Could not update your profile. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !draft) {
    return (
      <SafeAreaView className="flex-1 bg-tennis-surface items-center justify-center">
        <ActivityIndicator size="large" color="#1e2b11" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-black text-tennis-dark mb-6">Player Profile</Text>

        <View className="items-center mb-6">
          <TouchableOpacity activeOpacity={0.8} onPress={pickImage} className="relative">
            <View className="w-28 h-28 rounded-full bg-tennis-lime items-center justify-center overflow-hidden border-4 border-white shadow-xl">
              {photoUri ? (
                <Image source={{ uri: photoUri }} className="w-full h-full" />
              ) : (
                <Text className="text-3xl font-black text-tennis-dark">{draft.avatar}</Text>
              )}
            </View>
            <View className="absolute bottom-0 right-0 bg-tennis-dark p-2.5 rounded-full border-2 border-white shadow-md">
              <Camera size={16} color="#cdea5f" />
            </View>
          </TouchableOpacity>
          <Text className="text-xs text-tennis-sub mt-2 font-bold">Tap photo to choose avatar</Text>
        </View>

        <View className="bg-white p-5 rounded-3xl border border-tennis-border space-y-4 shadow-sm mb-6">
          <View>
            <Text className="text-xs font-bold text-tennis-sub mb-1 uppercase tracking-wider">Player Name</Text>
            <TextInput
              value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })}
              className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-sm"
            />
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1">
              <Text className="text-xs font-bold text-tennis-sub mb-1 uppercase tracking-wider">Skill Rating</Text>
              <TextInput
                value={draft.rating}
                onChangeText={(rating) => setDraft({ ...draft, rating })}
                className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-sm"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-tennis-sub mb-1 uppercase tracking-wider">Division Level</Text>
              <TextInput
                value={String(draft.level)}
                onChangeText={(level) => setDraft({ ...draft, level: Number(level) || 0 })}
                keyboardType="numeric"
                className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-sm"
              />
            </View>
          </View>

          <View>
            <Text className="text-xs font-bold text-tennis-sub mb-1 uppercase tracking-wider">Home Club / City</Text>
            <TextInput
              value={draft.location}
              onChangeText={(location) => setDraft({ ...draft, location })}
              className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-sm"
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-tennis-sub mb-1 uppercase tracking-wider">Primary Racket & Specs</Text>
            <TextInput
              value={draft.equipment.racket}
              onChangeText={(racket) =>
                setDraft({
                  ...draft,
                  equipment: { ...draft.equipment, racket }
                })
              }
              className="bg-tennis-surface p-3.5 rounded-2xl font-bold text-tennis-dark text-sm"
            />
          </View>
        </View>

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
