import { useCallback, useEffect, useState } from "react";
import { loadUserProfile, saveUserProfile } from "../backend/profileRepository";
import { user as defaultProfile } from "../data/starterData";
import { Storage } from "../lib/storage";
import type { UserProfile } from "../types/domain";

type PlayerProfileState = {
  loading: boolean;
  profile: UserProfile;
  refresh: () => Promise<void>;
  saveProfile: (next: UserProfile) => Promise<{ mode: "firebase" | "local" }>;
  userId: string;
};

function mergeProfile(cached: Partial<UserProfile> | null | undefined): UserProfile {
  if (!cached) return { ...defaultProfile };
  return {
    ...defaultProfile,
    ...cached,
    skills: cached.skills ?? defaultProfile.skills,
    equipment: { ...defaultProfile.equipment, ...cached.equipment },
    engagement: cached.engagement ?? defaultProfile.engagement
  };
}

export function usePlayerProfile(): PlayerProfileState {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const uid = (await Storage.getItem<string>("acetrack:uid", "")) || "";
      setUserId(uid);

      if (uid) {
        const remote = await loadUserProfile(uid);
        if (remote.profile) {
          setProfile(mergeProfile(remote.profile));
          await Storage.setItem("acetrack:profile", remote.profile);
          return;
        }
      }

      const cached = await Storage.getItem<Partial<UserProfile> | null>("acetrack:profile", null);
      setProfile(mergeProfile(cached));
    } catch (error) {
      console.warn("Player profile load failed.", error);
      const cached = await Storage.getItem<Partial<UserProfile> | null>("acetrack:profile", null);
      setProfile(mergeProfile(cached));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveProfile = useCallback(
    async (next: UserProfile) => {
      const uid = userId || (await Storage.getItem<string>("acetrack:uid", "")) || "";
      await Storage.setItem("acetrack:profile", next);
      setProfile(next);

      if (!uid) return { mode: "local" as const };
      const result = await saveUserProfile(uid, next);
      return { mode: result.mode };
    },
    [userId]
  );

  return { loading, profile, refresh, saveProfile, userId };
}
