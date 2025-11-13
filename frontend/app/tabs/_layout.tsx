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
          height: 100, // was 60
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
      }, //HEHE HI
      // did you look at the demo vid i sent?
      // no :(. also, i like watching people eat, its so intriguing and revealing about them i think
      // do i show the vido or live demo for her?


      // need icon labels
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

          return <Ionicons name={iconName} size={27} color={focused ? "#007AFF" : "#999"} />;
        },
      })}
    >
      <Tabs.Screen name="dash" options={{ title: "Dash" }} />
      <Tabs.Screen name="nav" options={{ title: "Nav" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
