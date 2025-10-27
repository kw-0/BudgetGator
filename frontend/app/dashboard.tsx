import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  StyleSheet,
  Text,
  View
} from "react-native";
import { WebView } from "react-native-webview";

const BASE_URL = Constants.expoConfig.extra.API_URL;

export default function Dashboard() {
  const [showPlaid, setShowPlaid] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

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
      if (!data.link_token) throw new Error("No link token received");
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

  function normalizeTransaction(raw) {
    // Adjust these field names to match what your API returns
    const name = raw.name || raw.description || "Unknown";
    const amount = typeof raw.amount === "number" ? raw.amount : Number(raw.amount) || 0;
    const date = raw.date || raw.transaction_date || raw.created_at || null;
    const category = Array.isArray(raw.category) ? raw.category.join(", ") : raw.category || "";
    return { id: raw.transaction_id || raw.id || Math.random().toString(), name, amount, date, category };
  }

  function formatCurrency(amount) {
    const abs = Math.abs(amount).toFixed(2);
    const sign = amount < 0 ? "-" : "";
    return `${sign}$${abs}`;
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString();
  }

  async function fetchTransactions() {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/plaid/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.log("Fetch failed:", errorData);
        Alert.alert("Error", errorData.message || "Failed to fetch transactions");
        return;
      }

      const data = await res.json();
      // If your API returns { transactions: [...] } adjust accordingly
      const rawList = Array.isArray(data) ? data : data.transactions || [];
      if (rawList.length === 0) {
        Alert.alert("No Transactions", "Bank linked but no recent activity found.");
        setTransactions([]);
        return;
      }

      const normalized = rawList.map(normalizeTransaction);
      setTransactions(normalized);
    } catch (err) {
      console.error("Fetch error:", err);
      Alert.alert("Error", "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  }

  function renderItem({ item }) {
    return (
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.name}>{item.name}</Text>
          {item.category ? <Text style={styles.category}>{item.category}</Text> : null}
          {item.date ? <Text style={styles.date}>{formatDate(item.date)}</Text> : null}
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, item.amount < 0 ? styles.negative : styles.positive]}>
            {formatCurrency(item.amount)}
          </Text>
        </View>
      </View>
    );
  }

  if (showPlaid) {
    return <WebView source={{ uri: linkToken }} onNavigationStateChange={handleNavigation} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Button title="Link Bank Account" onPress={startPlaidLink} />
            <View style={{ height: 12 }} />
            <Button title="Get Transactions" onPress={fetchTransactions} />
          </>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {transactions.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions to show</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", paddingVertical: 12, alignItems: "center" },
  left: { flex: 1 },
  right: { width: 110, alignItems: "flex-end" },
  name: { fontSize: 16, fontWeight: "600" },
  category: { color: "#666", marginTop: 4 },
  date: { color: "#999", marginTop: 4, fontSize: 12 },
  amount: { fontSize: 16, fontWeight: "700" },
  negative: { color: "#d9534f" },
  positive: { color: "#2e8b57" },
  separator: { height: 1, backgroundColor: "#eee" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#666" },
});