import { useRouter } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

export default function Dashboard() {
  const router = useRouter();
    return (
        <View>
            <Text>Dashboard</Text>
        </View>
    );
}