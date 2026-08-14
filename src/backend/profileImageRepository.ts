// Telegra.ph image hosting - completely free, no tier limits, no billing
// API: POST https://telegra.ph/upload
// Returns: { ok: true, src: "//telegra.ph/file/xxxxxx.jpg" }

// Convert to full URL: https://telegra.ph/file/xxxxxx.jpg

import { getFirebaseDb } from "./firebaseClient";
import type { UserProfile } from "../types/domain";

export interface ImageUploadResult {
  success: boolean;
  url?: string; // Full image URL
  error?: string;
}

/**
 * Upload image to Telegra.ph (free, no account needed for basic use)
 * Takes base64 or file and returns direct URL
 */
export async function uploadImageToTelegraph(
  fileBase64: string,
  fileName: string = "profile"
): Promise<ImageUploadResult> {
  try {
    // Telegra.ph API endpoint
    const response = await fetch("https://telegra.ph/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: fileBase64,
        filename: fileName,
      }),
    });

    const data = (await response.json()) as { ok?: boolean; error?: string; src?: string };

    if (!data.ok) {
      return { success: false, error: data.error || "Upload failed" };
    }

    // Telegra returns relative URL, convert to full https URL
    const fullUrl = `https://telegra.ph${data.src}`;

    return { success: true, url: fullUrl };
  } catch (error) {
    console.error("Telegraph upload error:", error);
    return { success: false, error: "Upload service unavailable" };
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(userId: string): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
  try {
    const db = await getFirebaseDb();
    if (!db) return { success: false, error: "Firebase not configured" };

    const { doc, getDoc } = await import("firebase/firestore");
    const snapshot = await getDoc(doc(db, "users", userId, "profile", "main"));

    if (!snapshot.exists()) {
      return { success: false, error: "Profile not found" };
    }

    const data = snapshot.data() as UserProfile;
    return { success: true, profile: { ...data, id: userId } as UserProfile };
  } catch (error) {
    console.error("Get profile error:", error);
    return { success: false, error: "Failed to fetch profile" };
  }
}

/**
 * Update user profile (avatarUrl, rating, level, etc.)
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getFirebaseDb();
    if (!db) return { success: false, error: "Firebase not configured" };

    const { doc, setDoc } = await import("firebase/firestore");
    const profileRef = doc(db, "users", userId, "profile", "main");

    // Only update provided fields, preserve existing ones
    const updatesOnly: Record<string, any> = {};
    if (updates.avatarUrl) updatesOnly.avatarUrl = updates.avatarUrl;
    if (updates.rating !== undefined) updatesOnly.rating = updates.rating;
    if (updates.level !== undefined) updatesOnly.level = updates.level;
    if (updates.name !== undefined) updatesOnly.name = updates.name;
    if (updates.shortName !== undefined) updatesOnly.shortName = updates.shortName;

    await setDoc(profileRef, updatesOnly, { merge: true });

    return { success: true };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, error: "Failed to update profile" };
  }
}