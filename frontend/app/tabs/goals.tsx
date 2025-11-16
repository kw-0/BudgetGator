import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Button,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
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
      fetchGoals();
    } catch (err) {
      console.error("Error setting goal:", err);
      Alert.alert("Error", err.message || "Unable to set goal");
    } finally {
      setLoading(false);
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
          <Text style={styles.goalPeriod}>{item.period}</Text>
          <Text style={styles.goalAmount}>{formatCurrency(item.amount)}</Text>
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
        <Text style={styles.label}>Period (YYYY-MM):</Text>
        <TextInput
          style={styles.input}
          value={period}
          onChangeText={setPeriod}
          placeholder="2025-11"
        />
        <Text style={styles.label}>Goal Amount ($):</Text>
        <TextInput
          style={styles.input}
          value={goalAmount}
          onChangeText={setGoalAmount}
          placeholder="1000"
          keyboardType="numeric"
        />
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Button title="Set Goal" onPress={setGoal} />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Your Goals</Text>
        {goalsWithProgress.length === 0 ? (
          <Text style={styles.emptyText}>No goals set yet</Text>
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
  label: { fontSize: 14, fontWeight: "600", marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  goalCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  goalPeriod: { fontSize: 16, fontWeight: "500" },
  goalAmount: { fontSize: 16, color: "#007AFF", fontWeight: "600" },
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