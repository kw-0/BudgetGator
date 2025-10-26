import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

const BASE_URL = Constants.expoConfig.extra.API_URL;
export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier, // can be username or email
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Login failed", data.message || "Something went wrong");
        return;
      }

      console.log("Login successful:", data);
      Alert.alert("Success", "Login successful");

      // Navigate to dashboard
      router.push("./dashboard");
    } catch (error) {
      console.error("Error logging in:", error);
      Alert.alert("Network Error", "Unable to connect to server");
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 24, marginBottom: 20 }}>BudgetGator Login</Text>

      <TextInput
        placeholder="Username/Email"
        value={identifier}
        onChangeText={setIdentifier}
        style={styles.loginboxes}
        autoCapitalize="none"
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.loginboxes}
        autoCapitalize="none"
        placeholderTextColor="#999"
      />

      <Button title="Create Account" onPress={() => router.push("./create-acct")} 
/>
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}
const styles = StyleSheet.create({
    loginboxes: {
          width: "100%",
          padding: 10,
          marginVertical: 8,
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 6,
    }
  })
