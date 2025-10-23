import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, View } from "react-native";
import { WebView } from "react-native-webview";

const BASE_URL = Constants.expoConfig.extra.API_URL; // Your Railway backend URL

export default function Dashboard() {
  const [showPlaid, setShowPlaid] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("userId").then(setUserId);
  }, []);

  if (!userId) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  if (showPlaid) {
    const injectedJS = `
      (function() {
        async function createLinkToken() {
          const res = await fetch("${BASE_URL}/api/plaid/create_link_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: "${userId}" })
          });
          const data = await res.json();
          return data.link_token;
        }

        async function openPlaidLink() {
          const linkToken = await createLinkToken();
          const handler = Plaid.create({
            token: linkToken,
            onSuccess: async (public_token) => {
              await fetch("${BASE_URL}/api/exchange_public_token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ public_token })
              });
              window.ReactNativeWebView.postMessage("success");
            },
            onExit: (err, metadata) => {
              window.ReactNativeWebView.postMessage("exit");
            }
          });
          handler.open();
        }

        document.getElementById("link-btn").addEventListener("click", openPlaidLink);
      })();
      true;
    `;

    const html = `
      <html>
        <head>
          <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
        </head>
        <body>
          <button id="link-btn" style="padding: 10px 20px; font-size: 16px;">Connect Bank</button>
        </body>
      </html>
    `;

    return (
      <WebView
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        injectedJavaScript={injectedJS}
        onMessage={(event) => {
          if (event.nativeEvent.data === "success") {
            setShowPlaid(false);
            Alert.alert("Success", "Bank account connected!");
          } else if (event.nativeEvent.data === "exit") {
            setShowPlaid(false);
            Alert.alert("Cancelled", "Plaid Link closed");
          }
        }}
        source={{ html }}
      />
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Button title="Connect Bank Account" onPress={() => setShowPlaid(true)} />
    </View>
  );
}
