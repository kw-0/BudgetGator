import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    console.log("Username", username);
    console.log("Password:", password);
    // Navigate to dashboard
    router.push("./dashboard");
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
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.loginboxes}
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