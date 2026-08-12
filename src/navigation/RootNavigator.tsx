import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, MapPin, Users, Play, User, Watch, Sparkles, BrainCircuit, Trophy } from "lucide-react-native";

import HomeScreen from "../screens/HomeScreen";
import CourtFinderScreen from "../screens/CourtFinderScreen";
import UserMapScreen from "../screens/UserMapScreen";
import LiveMatchScreen from "../screens/LiveMatchScreen";
import ProfileScreen from "../screens/ProfileScreen";
import WatchWorkoutScreen from "../screens/WatchWorkoutScreen";
import MatchPosterScreen from "../screens/MatchPosterScreen";
import AiCoachScreen from "../screens/AiCoachScreen";
import LadderRankingsScreen from "../screens/LadderRankingsScreen";

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
          height: 66,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="Courts"
        component={CourtFinderScreen}
        options={{
          tabBarLabel: "Courts",
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="Live"
        component={LiveMatchScreen}
        options={{
          tabBarLabel: "Score",
          tabBarIcon: ({ color, size }) => <Play color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="Ladder"
        component={LadderRankingsScreen}
        options={{
          tabBarLabel: "Ladder",
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="Coach"
        component={AiCoachScreen}
        options={{
          tabBarLabel: "AI Coach",
          tabBarIcon: ({ color, size }) => <BrainCircuit color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="Poster"
        component={MatchPosterScreen}
        options={{
          tabBarLabel: "Poster",
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="Watch"
        component={WatchWorkoutScreen}
        options={{
          tabBarLabel: "Watch",
          tabBarIcon: ({ color, size }) => <Watch color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={20} />,
        }}
      />
    </Tab.Navigator>
  );
}


