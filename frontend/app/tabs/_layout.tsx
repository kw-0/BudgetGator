import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "white",
          borderTopColor: "#ddd",
          height: 60,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "dash") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "nav") {
            iconName = focused ? "card" : "card-outline";
          } else if (route.name === "settings") {
            iconName = focused ? "settings" : "settings-outline";
          } else {
            iconName = "help-circle-outline";
          }

          return <Ionicons name={iconName} size={24} color={focused ? "#007AFF" : "#999"} />;
        },
      })}
    >
      <Tabs.Screen name="dash" options={{ title: "Dash" }} />
      <Tabs.Screen name="nav" options={{ title: "Nav" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
