import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import { getFirebaseAuth, getFirebaseDb } from "./src/backend/firebaseClient";
import { Storage } from "./src/lib/storage";

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};

    (async () => {
      try {
        const auth = await getFirebaseAuth();
        if (auth) {
          const { onAuthStateChanged, signInAnonymously } = await import("firebase/auth");
          unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
              setUser(currentUser);
              await Storage.setItem("acetrack:uid", currentUser.uid);
            } else {
              // Automatically sign in anonymously so players can use the app without friction
              const anonCred = await signInAnonymously(auth);
              setUser(anonCred.user);
              await Storage.setItem("acetrack:uid", anonCred.user.uid);
            }
            setInitializing(false);
          });
        } else {
          setInitializing(false);
        }
      } catch (err) {
        console.warn("Auth initialization error:", err);
        setInitializing(false);
      }
    })();

    return () => unsubscribe();
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8faf0", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e2b11" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
