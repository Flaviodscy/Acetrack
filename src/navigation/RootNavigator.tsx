import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, MapPin, Users, Play, User } from "lucide-react-native";

import HomeScreen from "../screens/HomeScreen";
import CourtFinderScreen from "../screens/CourtFinderScreen";
import UserMapScreen from "../screens/UserMapScreen";
import LiveMatchScreen from "../screens/LiveMatchScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1e2b11",
        tabBarInactiveTintColor: "#8e9889",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "rgba(38, 54, 31, 0.08)",
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Courts"
        component={CourtFinderScreen}
        options={{
          tabBarLabel: "Courts",
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Live"
        component={LiveMatchScreen}
        options={{
          tabBarLabel: "Play",
          tabBarIcon: ({ color, size }) => <Play color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Players"
        component={UserMapScreen}
        options={{
          tabBarLabel: "Players",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
