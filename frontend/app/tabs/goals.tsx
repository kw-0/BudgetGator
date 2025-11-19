import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const BASE_URL = Constants.expoConfig.extra.API_URL;

async function handleTokenExpired(router) {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("userId");
  Alert.alert("Session Expired", "Please log in again", [
    { text: "OK", onPress: () => router.replace("/auth/login-screen") },
  ]);
}

export default function Goals() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [goalsWithProgress, setGoalsWithProgress] = useState([]);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });
  const [goalAmount, setGoalAmount] = useState("");

  useEffect(() => {
    fetchGoals();
  }, []);

  async function fetchGoals() {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/goals`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.code === "token_expired") {
          await handleTokenExpired(router);
          return;
        }
        throw new Error("Failed to fetch goals");
      }

      const data = await res.json();
      setGoals(data.goals || []);

      // Fetch progress for each goal
      const goalsWithProgressData = await Promise.all(
        (data.goals || []).map(async (goal) => {
          try {
            const txRes = await fetch(`${BASE_URL}/api/plaid/transactions?period=${goal.period}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (txRes.ok) {
              const txData = await txRes.json();
              return {
                ...goal,
                spent: txData.totals?.total_amount || 0,
                percentage: ((txData.totals?.total_amount || 0) / goal.amount) * 100,
              };
            }
          } catch (err) {
            console.error(`Error fetching transactions for ${goal.period}:`, err);
          }
          return { ...goal, spent: 0, percentage: 0 };
        })
      );

      setGoalsWithProgress(goalsWithProgressData);

      // Pre-fill current period's goal if it exists
      const currentGoal = data.goals?.find((g) => g.period === period);
      if (currentGoal) {
        setGoalAmount(String(currentGoal.amount));
      }
    } catch (err) {
      console.error("Error fetching goals:", err);
      Alert.alert("Error", "Unable to load goals");
    } finally {
      setLoading(false);
    }
  }

  async function setGoal() {
    const amount = parseFloat(goalAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a positive number");
      return;
    }

    // Validate period format
    if (!/^\d{4}-\d{2}$/.test(period)) {
      Alert.alert("Invalid Period", "Please use YYYY-MM format (e.g., 2025-11)");
      return;
    }

    // Validate period is current or future
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (period < currentPeriod) {
      Alert.alert("Invalid Period", "Cannot set goals for past periods");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/goals/set`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ period, amount }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.code === "token_expired") {
          await handleTokenExpired(router);
          return;
        }
        throw new Error(errorData.error || "Failed to set goal");
      }

      Alert.alert("Success", `Goal set for ${period}: $${amount}`);
      setGoalAmount("");
      fetchGoals();
    } catch (err) {
      console.error("Error setting goal:", err);
      Alert.alert("Error", err.message || "Unable to set goal");
    } finally {
      setLoading(false);
    }
  }

  async function deleteGoal(goalPeriod) {
    Alert.alert(
      "Delete Goal",
      `Are you sure you want to delete the goal for ${formatPeriodName(goalPeriod)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem("token");
              const res = await fetch(`${BASE_URL}/api/goals/${goalPeriod}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });

              if (!res.ok) {
                const errorData = await res.json();
                if (errorData.code === "token_expired") {
                  await handleTokenExpired(router);
                  return;
                }
                throw new Error(errorData.error || "Failed to delete goal");
              }

              Alert.alert("Success", "Goal deleted");
              fetchGoals();
            } catch (err) {
              console.error("Error deleting goal:", err);
              Alert.alert("Error", err.message || "Unable to delete goal");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  function formatPeriodName(periodStr) {
    try {
      const [y, m] = periodStr.split("-").map((s) => parseInt(s, 10));
      const d = new Date(y, m - 1, 1);
      return d.toLocaleString(undefined, { month: "long", year: "numeric" });
    } catch (e) {
      return periodStr;
    }
  }

  function formatCurrency(amount) {
    return `$${amount.toFixed(2)}`;
  }

  function renderGoal({ item }) {
    const percentage = item.percentage || 0;
    const barColor = percentage < 80 ? "#4CAF50" : percentage < 100 ? "#FF9800" : "#F44336";
    const remaining = item.amount - (item.spent || 0);

    return (
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.goalPeriod}>{formatPeriodName(item.period)}</Text>
            <Text style={styles.goalPeriodSubtext}>{item.period}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.goalAmount}>{formatCurrency(item.amount)}</Text>
            <TouchableOpacity
              onPress={() => deleteGoal(item.period)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
        {item.spent !== undefined && (
          <>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={styles.progressText}>{percentage.toFixed(1)}%</Text>
            </View>
            <View style={styles.goalStats}>
              <Text style={styles.statText}>Spent: {formatCurrency(item.spent)}</Text>
              <Text style={[styles.statText, { color: remaining >= 0 ? "#4CAF50" : "#F44336" }]}>
                {remaining >= 0 ? `Remaining: ${formatCurrency(remaining)}` : `Over: ${formatCurrency(Math.abs(remaining))}`}
              </Text>
            </View>
          </>
        )}
      </View>
    );
  }

  

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>Set Monthly Spending Goal</Text>
        <Text style={styles.description}>
          Set a spending limit for any current or future month to track your budget progress.
        </Text>
        
        <Text style={styles.label}>Period (YYYY-MM):</Text>
        <TextInput
          style={styles.input}
          value={period}
          onChangeText={setPeriod}
          placeholder="2025-11"
          placeholderTextColor="#999"
        />
        
        <Text style={styles.label}>Goal Amount ($):</Text>
        <TextInput
          style={styles.input}
          value={goalAmount}
          onChangeText={setGoalAmount}
          placeholder="1000"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
        
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 16 }} />
        ) : (
          <TouchableOpacity style={styles.setButton} onPress={setGoal}>
            <Text style={styles.setButtonText}>Set Goal</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Your Goals</Text>
        {loading && goalsWithProgress.length === 0 ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 16 }} />
        ) : goalsWithProgress.length === 0 ? (
          <Text style={styles.emptyText}>No goals set yet. Create one above to get started!</Text>
        ) : (
          <FlatList
            data={goalsWithProgress}
            keyExtractor={(item, idx) => `${item.period}-${idx}`}
            renderItem={renderGoal}
            scrollEnabled={false}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", padding: 16 },
  section: { backgroundColor: "white", padding: 16, borderRadius: 8, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  description: { fontSize: 14, color: "#666", marginBottom: 16, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  setButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  setButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  goalCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  goalPeriod: { fontSize: 16, fontWeight: "500" },
  goalPeriodSubtext: { fontSize: 12, color: "#999", marginTop: 2 },
  goalAmount: { fontSize: 16, color: "#007AFF", fontWeight: "600", marginRight: 8 },
  deleteButton: {
    backgroundColor: "#F44336",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 20,
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 10,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    width: 50,
    textAlign: "right",
  },
  goalStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  statText: {
    fontSize: 14,
    color: "#666",
  },
  emptyText: { color: "#999", textAlign: "center", marginTop: 12 },
});