import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";

export default function Settings() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");
      Alert.alert("Logged Out", "You have been logged out successfully");
      router.replace("/auth/login-screen");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={{ marginTop: 20, width: 200 }}>
        <Button title="Log Out" onPress={handleLogout} color="#ff3b30" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9f9f9", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
});