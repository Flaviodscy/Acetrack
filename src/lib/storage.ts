import AsyncStorage from "@react-native-async-storage/async-storage";

export const Storage = {
  async getItem<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value != null ? (JSON.parse(value) as T) : defaultValue;
    } catch (e) {
      console.warn("Storage.getItem error", e);
      return defaultValue;
    }
  },
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage.setItem error", e);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage.removeItem error", e);
    }
  }
};
