// app/create-acct.tsx
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const BASE_URL = Constants.expoConfig.extra.API_URL;

export default function CreateAcctScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  // const [role, setRole] = useState<"Primary User" | "Benefactor" | null>(null);
  const [isPrimaryUser, setIsPrimaryUser] = useState<boolean | undefined>(undefined);

  const router = useRouter();

  const handleAccount = async () => {
    if (!username || !password || !email || isPrimaryUser == undefined) {
      Alert.alert("Error", "Please enter email, username, password and role");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username, 
          password,
          isPrimaryUser,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Create Account failed", data.message || "Something went wrong");
        return;
      }
      
      console.log("Create Account successful:", data);
      Alert.alert("Success", "Account Creation successful");
      
      // Navigate to dashboard
      router.push("./login-screen");
    } catch (error) {
      console.error("Error creating account:", error);
      Alert.alert("Network Error", "Unable to connect to server");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="none"
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        placeholderTextColor="#999"
      />
      
      <Text style={styles.radioLabel}>Select Role:</Text>
      <View style={styles.radioGroup}>
        <Pressable
          style={styles.radioOption}
          onPress={() => setIsPrimaryUser(true)}
        >
          <View style={styles.radioOuter}>
            {isPrimaryUser === true && <View style={styles.radioInner} />}
          </View>
          <Text style={styles.radioText}>Primary User</Text>
        </Pressable>

        <Pressable
          style={styles.radioOption}
          onPress={() => setIsPrimaryUser(false)}
        >
          <View style={styles.radioOuter}>
            {isPrimaryUser === false && <View style={styles.radioInner} />}
          </View>
          <Text style={styles.radioText}>Benefactor</Text>
        </Pressable>
      </View>


      <Button title="Create Account" onPress={handleAccount} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    // backgroundColor: "#fff",
  },
   radioLabel: {
    alignSelf: "flex-start",
    fontSize: 16,
    marginTop: 10,
    marginBottom: 5,
  },
  radioGroup: {
    flexDirection: "row",
    marginBottom: 15,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007AFF",
  },
  radioText: {
    fontSize: 16,
    textTransform: "capitalize",
  },
});
