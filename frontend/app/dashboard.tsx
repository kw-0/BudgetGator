import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Button, View } from "react-native";
import { WebView } from "react-native-webview";

const BASE_URL = Constants.expoConfig.extra.API_URL;

export default function Dashboard() {
  const [showPlaid, setShowPlaid] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);

  async function startPlaidLink() {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");

      if (!token || !userId) {
        Alert.alert("Error", "You must log in again");
        return;
      }

      const res = await fetch(`${BASE_URL}/api/plaid/create_link_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!data.link_token) {
        throw new Error("No link token received");
      }

      const redirectUri = `${BASE_URL}/api/plaid/return`;
      const plaidUrl = `https://cdn.plaid.com/link/v2/stable/link.html?token=${data.link_token}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}`;

      setLinkToken(plaidUrl);
      setShowPlaid(true);
    } catch (e) {
      console.error("Plaid setup error:", e);
      Alert.alert("Error", "Unable to start Plaid");
    } finally {
      setLoading(false);
    }
  }

  function handleNavigation(evt) {
    if (evt.url.includes("/api/plaid/return")) {
      setShowPlaid(false);
      Alert.alert("Success", "Bank linked! Tap to load transactions.");
    }
  }
  //  async function handleNavigation(evt) {
  //   try {
  //     const url = new URL(evt.url);
  //     const public_token = url.searchParams.get("public_token");
  //     if (public_token) {
  //       setShowPlaid(false);
  //       const token = await AsyncStorage.getItem("token");

  //       await fetch(`${BASE_URL}/api/plaid/exchange_public_token`, {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${token}`,
  //         },
  //         body: JSON.stringify({ public_token }),
  //       });

  //       Alert.alert("Success", "Bank linked!");
  //     }
  //   } catch (err) {
  //     // Ignore navigation errors
  //   }
  // }

  async function fetchTransactions() {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/plaid/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      console.log("Transactions:", data);
      Alert.alert("Transactions Loaded", `Found: ${data.length}`);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }

  if (showPlaid) {
    return (
      <WebView
        source={{ uri: linkToken }}
        onNavigationStateChange={handleNavigation}
      />
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      {loading && <ActivityIndicator />}
      {!loading && (
        <>
          <Button title="Link Bank Account" onPress={startPlaidLink} />
          <Button title="Get Transactions" onPress={fetchTransactions} />
        </>
      )}
    </View>
  );
}
