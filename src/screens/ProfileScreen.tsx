import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Camera, Save, Trophy, Shield, Dumbbell } from "lucide-react-native";

export default function ProfileScreen() {
  const [name, setName] = useState("Flavio Gorodscy");
  const [rating, setRating] = useState("4.5 UTR");
  const [level, setLevel] = useState("14");
  const [height, setHeight] = useState("6'1\"");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant photo library access to upload a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    Alert.alert("Profile Saved", "Your AceTrack player card has been updated.");
  };

  return (
    <SafeAreaView className="flex-1 bg-tennis-surface">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-black text-tennis-dark mb-6">Player Profile</Text>

        {/* Profile Avatar with Camera Picker */}
        <View className="items-center mb-6">
          <TouchableOpacity activeOpacity={0.8} onPress={pickImage} className="relative">
            <View className="w-28 h-28 rounded-full bg-tennis-lime items-center justify-center overflow-hidden border-4 border-white shadow-lg">
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
          <Text className="text-xs text-tennis-sub mt-2 font-bold">Tap photo to change avatar</Text>
        </View>

        {/* Player Form Fields */}
        <View className="bg-white p-5 rounded-3xl border border-tennis-border space-y-4 shadow-sm mb-6">
          <View>
            <Text className="text-xs font-bold text-tennis-sub mb-1.5 uppercase tracking-wider">Player Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              className="bg-tennis-surface p-4 rounded-2xl font-bold text-tennis-dark text-base"
            />
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1">
              <Text className="text-xs font-bold text-tennis-sub mb-1.5 uppercase tracking-wider">Skill Rating</Text>
              <TextInput
                value={rating}
                onChangeText={setRating}
                className="bg-tennis-surface p-4 rounded-2xl font-bold text-tennis-dark text-base"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-tennis-sub mb-1.5 uppercase tracking-wider">Level</Text>
              <TextInput
                value={level}
                onChangeText={setLevel}
                keyboardType="numeric"
                className="bg-tennis-surface p-4 rounded-2xl font-bold text-tennis-dark text-base"
              />
            </View>
          </View>

          <View>
            <Text className="text-xs font-bold text-tennis-sub mb-1.5 uppercase tracking-wider">Height / Size</Text>
            <TextInput
              value={height}
              onChangeText={setHeight}
              className="bg-tennis-surface p-4 rounded-2xl font-bold text-tennis-dark text-base"
            />
          </View>
        </View>

        {/* Save Changes Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSave}
          className="bg-tennis-lime py-4 rounded-2xl flex-row items-center justify-center space-x-2 shadow-sm mb-12"
        >
          <Save size={18} color="#1e2b11" />
          <Text className="text-tennis-dark font-black text-base">Save Profile Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
