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

export default function Dash() {
  const [showPlaid, setShowPlaid] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState("start");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [dateFilterVisible, setDateFilterVisible] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);

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
    const category =
      raw.personal_finance_category?.primary ||
      (Array.isArray(raw.category) ? raw.category.join(", ") : raw.category) ||
      "Uncategorized";

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

  function formatDisplayText(text) {
    if (!text) return "";
    return text
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
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
        Alert.alert("Error", errorData.message || "Failed to fetch transactions");
        return;
      }

      const data = await res.json();
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

  const allCategories = useMemo(() => {
    const set = new Set(transactions.map((tx) => tx.category || "Uncategorized"));
    return ["All", ...Array.from(set)];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let list = transactions;
    if (selectedCategory !== "All") {
      list = list.filter((tx) => tx.category === selectedCategory);
    }
    if (filterStartDate && filterEndDate) {
      list = list.filter((tx) => {
        const txDate = new Date(tx.date);
        return txDate >= filterStartDate && txDate <= filterEndDate;
      });
    }
    return list;
  }, [transactions, selectedCategory, filterStartDate, filterEndDate]);

  function renderItem({ item }) {
    return (
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.name}>{formatDisplayText(item.name)}</Text>
          {item.category ? (
            <Text style={styles.category}>{formatDisplayText(item.category)}</Text>
          ) : null}
          {item.date ? <Text style={styles.date}>{formatDate(item.date)}</Text> : null}
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
        <TouchableOpacity
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
          onPress={() => {
            setSelectedTransaction(item);
            setDetailsVisible(true);
          }}
        />
      </View>
    );
  }

  if (showPlaid) {
    return (
      <WebView source={{ uri: linkToken }} onNavigationStateChange={handleNavigation} />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {transactions.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions to show</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          />
        )}

        {/* Transaction Details Modal */}
        <Modal
          visible={detailsVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDetailsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                {selectedTransaction && (
                  <>
                    <Text style={styles.modalTitle}>
                      {formatDisplayText(selectedTransaction.name)}
                    </Text>
                    <Text>Amount: {formatCurrency(selectedTransaction.amount)}</Text>
                    <Text>Category: {selectedTransaction.category}</Text>
                    <Text>Date: {formatDate(selectedTransaction.date)}</Text>
                    <Text>Transaction ID: {selectedTransaction.id}</Text>
                  </>
                )}
              </ScrollView>
              <TouchableOpacity style={styles.closeButton} onPress={() => setDetailsVisible(false)}>
                <Text style={{ color: "white" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {loading ? (
            <ActivityIndicator />
          ) : (
            <View>
              <Button title="Link Bank Account" onPress={startPlaidLink} />
              <View style={{ height: 12 }} />
              <Button title="Get Transactions" onPress={fetchTransactions} />

              {/* Category Filter */}
              {transactions.length > 0 && (
                <View style={{ marginVertical: 12 }}>
                  <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Filter by Category:</Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#007AFF",
                      padding: 12,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                    onPress={() => setCategoryModalVisible(true)}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      {selectedCategory === "All" ? "All Categories" : formatDisplayText(selectedCategory)}
                    </Text>
                  </TouchableOpacity>

                  <Modal
                    visible={categoryModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setCategoryModalVisible(false)}
                  >
                    <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
                      <View style={{ backgroundColor: "white", borderRadius: 10, padding: 20, maxHeight: "80%" }}>
                        <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>Select a Category</Text>
                        <ScrollView>
                          {allCategories.map((cat) => (
                            <TouchableOpacity
                              key={cat}
                              style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" }}
                              onPress={() => {
                                setSelectedCategory(cat);
                                setCategoryModalVisible(false);
                              }}
                            >
                              <Text style={{ color: "black", fontSize: 14 }}>
                                {cat === "All" ? "All" : formatDisplayText(cat)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        <TouchableOpacity
                          style={{ marginTop: 10, backgroundColor: "gray", padding: 10, borderRadius: 8, alignItems: "center" }}
                          onPress={() => setCategoryModalVisible(false)}
                        >
                          <Text style={{ color: "white" }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                </View>
              )}

              {/* Date Filter Button */}
              {transactions.length > 0 && (
                <View style={{ marginVertical: 12 }}>
                  <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Filter by Date:</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: "#007AFF", padding: 12, borderRadius: 8, alignItems: "center" }}
                    onPress={() => setDateFilterVisible(true)}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      {filterStartDate && filterEndDate
                        ? `${filterStartDate.toLocaleDateString()} - ${filterEndDate.toLocaleDateString()}`
                        : "Filter by Date"}
                    </Text>
                  </TouchableOpacity>

                  <Modal
                    visible={dateFilterVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => {
                      setDateFilterVisible(false);
                      setShowPicker(false);
                    }}
                  >
                    <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
                      <View style={{ backgroundColor: "white", borderRadius: 10, padding: 20, maxHeight: "80%" }}>
                        <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>Select Date Range</Text>
                        <Button
                          title={`From: ${filterStartDate ? filterStartDate.toLocaleDateString() : "Not set"}`}
                          onPress={() => {
                            setPickerType("filterStart");
                            setShowPicker(true);
                          }}
                        />
                        <View style={{ height: 8 }} />
                        <Button
                          title={`To: ${filterEndDate ? filterEndDate.toLocaleDateString() : "Not set"}`}
                          onPress={() => {
                            setPickerType("filterEnd");
                            setShowPicker(true);
                          }}
                        />
                        <View style={{ height: 12 }} />
                        <Button
                          title="Clear Date Filter"
                          onPress={() => {
                            setFilterStartDate(null);
                            setFilterEndDate(null);
                            setDateFilterVisible(false);
                          }}
                        />
                        <View style={{ height: 8 }} />
                        <Button
                          title="Close"
                          onPress={() => {
                            setDateFilterVisible(false);
                            setShowPicker(false);
                          }}
                          color="gray"
                        />

                        <DateTimePickerModal
                          isVisible={showPicker}
                          mode="date"
                          date={pickerType === "filterStart" ? filterStartDate || new Date() : filterEndDate || filterStartDate || new Date()}
                          onConfirm={(date) => {
                            setShowPicker(false);
                            if (pickerType === "filterStart") {
                              setFilterStartDate(date);
                              if (!filterEndDate || filterEndDate < date) setFilterEndDate(date);
                            } else {
                              setFilterEndDate(date);
                            }
                          }}
                          onCancel={() => setShowPicker(false)}
                        />
                      </View>
                    </View>
                  </Modal>
                </View>
              )}
            </View>
          )}
        </View>
        {/* Transactions List */}
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
  modalOverlay: { flex: 1, justifyContent: "center", backgroundColor: "#000000aa" },
  modalContent: { backgroundColor: "white", margin: 20, borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  closeButton: { marginTop: 20, backgroundColor: "blue", padding: 12, borderRadius: 8, alignItems: "center" },
});
