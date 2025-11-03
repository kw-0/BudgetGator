import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { WebView } from "react-native-webview";

const BASE_URL = Constants.expoConfig.extra.API_URL;

export default function Dashboard() {
  const [showPlaid, setShowPlaid] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState("start");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

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
    const name = raw.name || raw.description || "Unknown";
    const amount =
      typeof raw.amount === "number" ? raw.amount : Number(raw.amount) || 0;
    const date = raw.date || raw.transaction_date || raw.created_at || null;
    const category = Array.isArray(raw.category)
      ? raw.category.join(", ")
      : raw.category || "Uncategorized";
    return {
      id: raw.transaction_id || raw.id || Math.random().toString(),
      name,
      amount,
      date,
      category,
    };
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
      const res = await fetch(
        `${BASE_URL}/api/plaid/transactions?start_date=${startDate
          .toISOString()
          .slice(0, 10)}&end_date=${endDate.toISOString().slice(0, 10)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.log("Fetch failed:", errorData);
        Alert.alert(
          "Error",
          errorData.message || "Failed to fetch transactions"
        );
        return;
      }

      const data = await res.json();
      console.log("Plaid transactions raw JSON:", JSON.stringify(data, null, 2));

      const rawList = Array.isArray(data) ? data : data.transactions || [];
      if (rawList.length === 0) {
        Alert.alert(
          "No Transactions",
          "Bank linked but no recent activity found."
        );
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

  const spendingByCategory = useMemo(() => {
    const summary = {};
    transactions.forEach((tx) => {
      const cat = tx.category || "Uncategorized";
      if (tx.amount < 0) {
        summary[cat] = (summary[cat] || 0) + Math.abs(tx.amount);
      }
    });
    return Object.entries(summary).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  function renderItem({ item }) {
    return (
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.name}>{item.name}</Text>
          {item.category ? (
            <Text style={styles.category}>{item.category}</Text>
          ) : null}
          {item.date ? (
            <Text style={styles.date}>{formatDate(item.date)}</Text>
          ) : null}
        </View>
        <View style={styles.right}>
          <Text
            style={[
              styles.amount,
              item.amount < 0 ? styles.negative : styles.positive,
            ]}
          >
            {formatCurrency(item.amount)}
          </Text>
        </View>
        <View
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        >
          <Button
            title=""
            onPress={() => {
              setSelectedTransaction(item);
              setDetailsVisible(true);
            }}
          />
        </View>
      </View>
    );
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
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <View>
            <Button title="Link Bank Account" onPress={startPlaidLink} />
            <View style={{ height: 12 }} />
            <Button title="Get Transactions" onPress={fetchTransactions} />
            <View style={{ height: 12 }} />
            <Button
              title={`From: ${startDate.toLocaleDateString()}`}
              onPress={() => {
                setPickerType("start");
                setShowPicker(true);
              }}
            />
            <View style={{ height: 8 }} />
            <Button
              title={`To: ${endDate.toLocaleDateString()}`}
              onPress={() => {
                setPickerType("end");
                setShowPicker(true);
              }}
            />

            <DateTimePickerModal
              isVisible={showPicker}
              mode="date"
              date={pickerType === "start" ? startDate : endDate}
              minimumDate={pickerType === "end" ? startDate : undefined}
              onConfirm={(date) => {
                setShowPicker(false);
                if (pickerType === "start") {
                  setStartDate(date);
                  if (endDate < date) setEndDate(date);
                } else {
                  setEndDate(date);
                }
              }}
              onCancel={() => setShowPicker(false)}
            />
          </View>
        )}
      </View>

      {spendingByCategory.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Spending by Category</Text>
          {spendingByCategory.map(([cat, total]) => (
            <Text key={cat} style={styles.summaryItem}>
              {cat}: ${total.toFixed(2)}
            </Text>
          ))}
        </View>
      )}

      <View style={{ flex: 1 }}>
        {transactions.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions to show</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              data={transactions}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            />

            <Modal
              visible={detailsVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setDetailsVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <ScrollView>
                    {selectedTransaction && (
                      <>
                        <Text style={styles.modalTitle}>
                          {selectedTransaction.name}
                        </Text>
                        <Text>
                          Amount: {formatCurrency(selectedTransaction.amount)}
                        </Text>
                        <Text>Category: {selectedTransaction.category}</Text>
                        <Text>Date: {formatDate(selectedTransaction.date)}</Text>
                        <Text>Transaction ID: {selectedTransaction.id}</Text>
                      </>
                    )}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setDetailsVisible(false)}
                  >
                    <Text style={{ color: "white" }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", paddingVertical: 12, alignItems: "center" },
  left: { flex: 1 },
  right: { width: 110, alignItems: "flex-end" },
  name: { fontSize: 16, fontWeight: "500" },
  category: { fontSize: 12, color: "#666" },
  date: { fontSize: 12, color: "#999" },
  amount: { fontSize: 16, fontWeight: "600" },
  negative: { color: "red" },
  positive: { color: "green" },
  separator: { height: 1, backgroundColor: "#ccc" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#999" },
  summary: { padding: 16, backgroundColor: "#f5f5f5" },
  summaryTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  summaryItem: { fontSize: 14, marginBottom: 4 },
  modalOverlay: { flex: 1, justifyContent: "center", backgroundColor: "#000000aa" },
  modalContent: { backgroundColor: "white", margin: 20, borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  closeButton: { marginTop: 20, backgroundColor: "blue", padding: 12, borderRadius: 8, alignItems: "center" },
});