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
      if (!token) {
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
      if (!data.link_token) throw new Error("No link token received");

      const plaidUrl = `https://cdn.plaid.com/link/v2/stable/link.html?token=${data.link_token}`;
      setLinkToken(plaidUrl);
      setShowPlaid(true);
    } catch (err) {
      console.error("Plaid setup error:", err);
      Alert.alert("Error", "Unable to start Plaid");
    } finally {
      setLoading(false);
    }
  }

// Exchange public token server-side
  async function exchangePublicToken(public_token) {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "You must log in again");
        return;
      }

      const res = await fetch(`${BASE_URL}/api/plaid/exchange_public_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ public_token }),
      });

      const data = await res.json();
      if (data.success) Alert.alert("Success", "Bank linked!");
      else {
        console.warn("Exchange response:", data);
        Alert.alert("Error", "Failed to link bank");
      }
    } catch (err) {
      console.error("Exchange error:", err);
      Alert.alert("Error", "Failed to link bank");
    } finally {
      setLoading(false);
    }
  }

// Receive messages from WebView (the /return page posts public_token)
  function onWebViewMessage(event) {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      const public_token = payload.public_token;
      if (public_token) {
        setShowPlaid(false);
        exchangePublicToken(public_token);
      }
    } catch (err) {
      // Ignore unexpected messages
    }
  }


  // Fetch transactions
  async function fetchTransactions() {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/plaid/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const count = Array.isArray(data) ? data.length : (Array.isArray(data.transactions) ? data.transactions.length : 0);
      console.log("Transactions:", data);
      Alert.alert("Transactions Loaded", `Found: ${count}`);
    } catch (err) {
      console.error("Transactions error:", err);
      Alert.alert("Error", "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }

  // Render WebView when linking
  if (showPlaid && linkToken) {
    return (
      <WebView
        source={{ uri: linkToken }}
        onMessage={onWebViewMessage}
        javaScriptEnabled={true}
        originWhitelist={['*']}
        startInLoadingState={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
      />
    );
  }
return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      {loading && <ActivityIndicator size="large" />}
      {!loading && (
        <>
          <Button title="Link Bank Account" onPress={startPlaidLink} />
          <View style={{ height: 20 }} />
          <Button title="Get Transactions" onPress={fetchTransactions} />
        </>
      )}
    </View>
  );
}


