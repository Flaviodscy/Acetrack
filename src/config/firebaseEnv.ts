function readProcessEnv(key: string): string {
  if (typeof process === "undefined" || !process.env) return "";
  return process.env[key]?.trim() ?? "";
}

function readViteEnv(key: string): string {
  try {
    return (import.meta.env?.[key] as string | undefined)?.trim() ?? "";
  } catch {
    return "";
  }
}

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const viteValue = readViteEnv(key);
    if (viteValue) return viteValue;

    const processValue = readProcessEnv(key);
    if (processValue) return processValue;
  }
  return "";
}

export type FirebaseEnvConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export function getFirebaseEnvConfig(): FirebaseEnvConfig {
  return {
    apiKey: readEnv("VITE_FIREBASE_API_KEY", "EXPO_PUBLIC_FIREBASE_API_KEY"),
    authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN", "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: readEnv("VITE_FIREBASE_PROJECT_ID", "EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET", "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readEnv("VITE_FIREBASE_APP_ID", "EXPO_PUBLIC_FIREBASE_APP_ID")
  };
}

export function isFirebaseEnvConfigured(config: FirebaseEnvConfig = getFirebaseEnvConfig()): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}
