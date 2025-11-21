import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { WebView } from "react-native-webview";

const BASE_URL = Constants.expoConfig.extra.API_URL;
const screenWidth = Dimensions.get("window").width;

// Type definitions to satisfy arithmetic operations
interface RawTransaction {
  amount?: number | string;
  category?: string | string[];
  personal_finance_category?: { primary?: string };
  name?: string;
  merchant_name?: string;
  transaction_date?: string;
  date?: string;
  [key: string]: any;
}

interface NormalizedTransaction extends RawTransaction {
  amount: number;
  category: string;
}

interface ChartDatum {
  category: string;
  amount: number;
  originalCategories?: string[];
}

export default function AnalysisScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<RawTransaction[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
    "#F8B195",
    "#ABDEE6",
  ];

  // Fetch transactions when month or selected account changes
  useEffect(() => {
    fetchTransactions();
  }, [currentMonth, selectedAccount]);

  // Fetch accounts once
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return console.log("No auth token found");

        const res = await fetch(`${BASE_URL}/api/plaid/accounts`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          if (errorData.code === 'token_expired') {
            await AsyncStorage.multiRemove(['token','userId']);
            alert('Session expired. Please log in again.');
            router.replace('/auth/login-screen');
            return;
          }
          console.error('Accounts fetch failed', errorData);
          return;
        }

        const data = await res.json();
        setAccounts(data.accounts || []);
      } catch (err) {
        console.error("Error fetching accounts:", err);
      }
    };
    fetchAccounts();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        setLoading(false);
        return;
      }

      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
      const period = `${year}-${month}`;

      let accountQuery = "";
      if (selectedAccount) {
        if (selectedAccount.id)
          accountQuery = `&account_id=${encodeURIComponent(selectedAccount.id)}`;
        else if (selectedAccount.access_token)
          accountQuery = `&access_token=${encodeURIComponent(
            selectedAccount.access_token
          )}`;
      }

      const response = await fetch(
        `${BASE_URL}/api/plaid/transactions?period=${period}${accountQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        let errorData: any = {};
        try { errorData = await response.json(); } catch {}
        if (errorData.code === 'token_expired') {
          await AsyncStorage.multiRemove(['token','userId']);
          alert('Session expired. Please log in again.');
          router.replace('/auth/login-screen');
          return;
        }
        console.error("API Error:", response.status, response.statusText, errorData);
        return;
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const normalizeTransaction = (raw: RawTransaction): NormalizedTransaction => {
    const category =
      raw.personal_finance_category?.primary ||
      (Array.isArray(raw.category) ? raw.category.join(", ") : raw.category) ||
      "Uncategorized";
    const amount = typeof raw.amount === "number" ? raw.amount : Number(raw.amount) || 0;
    return { ...raw, category, amount };
  };

  const formatCategory = (s) => {
    if (!s) return "Uncategorized";
    return String(s)
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const chartData: ChartDatum[] = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    transactions.forEach((t) => {
      const normalized = normalizeTransaction(t);
      const prev = categoryTotals[normalized.category] || 0;
      categoryTotals[normalized.category] = prev + Math.abs(normalized.amount);
    });
    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const totalSpending: number = useMemo(
    () => chartData.reduce((sum, item) => sum + item.amount, 0),
    [chartData]
  );

  const displayData: ChartDatum[] = useMemo(() => {
    if (!totalSpending || totalSpending === 0) return chartData;

    const main: ChartDatum[] = [];
    let otherAmount = 0;
    const otherCategories: string[] = [];

    chartData.forEach((item) => {
      const pct = (item.amount / totalSpending) * 100;
      if (pct < 2) {
        otherAmount += item.amount;
        otherCategories.push(item.category);
      } else {
        main.push(item);
      }
    });

    if (otherAmount > 0) {
      main.push({
        category: "Other",
        amount: otherAmount,
        originalCategories: otherCategories,
      });
    }
    return main.sort((a, b) => b.amount - a.amount);
  }, [chartData, totalSpending]);

  const filteredTransactions = useMemo<NormalizedTransaction[]>(() => {
    if (!selectedCategory) return [];
    const normalized = transactions.map((t) => normalizeTransaction(t));
    if (selectedCategory === "All") return normalized;
    const disp = displayData.find((d) => d.category === selectedCategory);
    if (disp && disp.originalCategories && Array.isArray(disp.originalCategories)) {
      const setCats = new Set(disp.originalCategories);
      return normalized.filter((t) => setCats.has(t.category));
    }
    return normalized.filter((t) => t.category === selectedCategory);
  }, [transactions, selectedCategory, displayData]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getAccountDisplayName = (account, index) => {
    let displayName = account.name || account.official_name || (account.type ? formatCategory(account.type) : "Account");
    if (account.mask) displayName += ` (...${account.mask})`;
    if (account.subtype && account.subtype !== "checking") displayName += ` - ${formatCategory(account.subtype)}`;
    if (!account.mask && !account.subtype) displayName += ` #${index + 1}`;
    return displayName;
  };

  const isAccountSelected = (account) => {
    if (!selectedAccount) return false;
    return (
      (selectedAccount.id && selectedAccount.id === account.id) ||
      (selectedAccount.access_token && selectedAccount.access_token === account.access_token)
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Spending Analysis</Text>
        <TouchableOpacity
          onPress={() => setShowAccountSelector(true)}
          style={styles.accountSelectorButton}
        >
          <Text style={styles.accountSelectorButtonText}>
            {selectedAccount
              ? getAccountDisplayName(
                  selectedAccount,
                  accounts.findIndex((a) => isAccountSelected(a))
                )
              : "All Accounts"}
          </Text>
          <Text style={styles.accountSelectorArrow}>v</Text>
        </TouchableOpacity>
      </View>

      {/* Account Selector Modal */}
      <Modal visible={showAccountSelector} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.selectorContent}>
            <Text style={styles.selectorTitle}>Select Account</Text>
            <ScrollView style={styles.accountList}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedAccount(null);
                  setShowAccountSelector(false);
                }}
                style={[styles.accountOption, !selectedAccount && styles.accountOptionSelected]}
              >
                <Text style={[styles.accountOptionText, !selectedAccount && styles.accountOptionTextSelected]}>
                  All Accounts
                </Text>
                {!selectedAccount && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>

              {accounts.map((account, index) => {
                const isSelected = isAccountSelected(account);
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSelectedAccount(account);
                      setShowAccountSelector(false);
                    }}
                    style={[styles.accountOption, isSelected && styles.accountOptionSelected]}
                  >
                    <Text style={[styles.accountOptionText, isSelected && styles.accountOptionTextSelected]}>
                      {getAccountDisplayName(account, index)}
                    </Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowAccountSelector(false)} style={styles.closeModalButton}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Month Navigation */}
      <View style={styles.monthNavigation}>
        <TouchableOpacity onPress={handlePrevMonth}>
          <Text style={styles.navButton}>← Prev</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
        </Text>
        <TouchableOpacity onPress={handleNextMonth}>
          <Text style={styles.navButton}>Next →</Text>
        </TouchableOpacity>
      </View>

      {/* Loading / Chart / No Data */}
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : chartData.length > 0 ? (
        <View>
          {/* Pie Chart */}
          <View style={styles.pieChartContainer}>
            <View style={styles.pieSlicesContainer}>
              {totalSpending > 0 && (() => {
                const containerMax = Math.min(screenWidth - 48, 420);
                const padding = 48;
                const strokeWidth = 40;
                const computedRadius = Math.max(48, Math.floor((containerMax - padding * 2 - strokeWidth) / 2));
                const radiusFinal = Math.min(computedRadius, 140);
                const cxP = radiusFinal + strokeWidth / 2 + padding;
                const cyP = radiusFinal + strokeWidth / 2 + padding;
                const size = (radiusFinal + strokeWidth / 2 + padding) * 2;

                let startAngleLocal = -90;
                const paths = [];

                displayData.forEach((item, index) => {
                  const fraction = item.amount / totalSpending;
                  const angle = fraction * 360;
                  const endAngle = startAngleLocal + angle;
                  const largeArc = angle > 180 ? 1 : 0;
                  const startRad = (startAngleLocal * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const x1 = cxP + radiusFinal * Math.cos(startRad);
                  const y1 = cyP + radiusFinal * Math.sin(startRad);
                  const x2 = cxP + radiusFinal * Math.cos(endRad);
                  const y2 = cyP + radiusFinal * Math.sin(endRad);
                  const color = colors[index % colors.length];

                  paths.push(`
                    <path d="M ${cxP} ${cyP} L ${x1} ${y1} A ${radiusFinal} ${radiusFinal} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" />
                  `);
                  // label the percetages on the pie chart
                  const midAngle = startAngleLocal + angle / 2;
                  const midRad = (midAngle * Math.PI) / 180;

                  const labelRadius = radiusFinal * 0.65;
                  const lx = cxP + labelRadius * Math.cos(midRad);
                  const ly = cyP + labelRadius * Math.sin(midRad);

                  const percent = ((item.amount / totalSpending) * 100).toFixed(0);

                  // paths.push(`
                  //   <path 
                  //     d="M ${cxP} ${cyP} L ${x1} ${y1} 
                  //     A ${radiusFinal} ${radiusFinal} 0 ${largeArc} 1 ${x2} ${y2} Z" 
                  //     fill="${color}" 
                  //   />

                  //   <text 
                  //     x="${lx}" 
                  //     y="${ly}" 
                  //     font-size="14" 
                  //     fill="#ffffff" 
                  //     font-weight="600"
                  //     text-anchor="middle" 
                  //     dominant-baseline="middle"
                  //   >
                  //     ${percent}%
                  //   </text>
                  // `);

                  startAngleLocal = endAngle;
                });

                const html = `
                  <!doctype html>
                  <html>
                    <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
                    <body style="margin:0;padding:0;display:flex;align-items:center;justify-content:center;height:100%;">
                      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                        ${paths.join("\n")}
                      </svg>
                    </body>
                  </html>
                `;

                return (
                  <WebView originWhitelist={["*"]} scrollEnabled={false} style={{ width: size, height: size }} source={{ html }} />
                );
              })()}
            </View>
          </View>

          {/* Total Spending */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Spending</Text>
            <Text style={styles.totalAmount}>${totalSpending.toFixed(2)}</Text>
          </View>

          {/* Category Breakdown */}
          <TouchableOpacity onPress={() => setBreakdownOpen(!breakdownOpen)} style={styles.breakdownHeader}>
            <Text style={styles.breakdownTitle}>Breakdown by Category</Text>
            <Text style={styles.breakdownArrow}>{breakdownOpen ? "v" : "<"}</Text>
          </TouchableOpacity>

          {breakdownOpen && (
            <View style={styles.breakdownContainer}>
              <TouchableOpacity onPress={() => setSelectedCategory("All")} style={[styles.categoryRow, selectedCategory === "All" && styles.categoryRowSelected]}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.categoryColor, { backgroundColor: "#ddd" }]} />
                  <Text style={[styles.categoryName, selectedCategory === "All" && styles.categoryNameSelected]}>All</Text>
                </View>
                <View style={styles.categoryDetails}>
                  <Text style={styles.categoryAmount}>${totalSpending.toFixed(2)}</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: '100%', backgroundColor: "#bbb" }]} />
                  </View>
                  <Text style={styles.categoryPercentage}>100%</Text>
                </View>
              </TouchableOpacity>

              {displayData.map((item, index) => {
                const percentage = (item.amount / totalSpending) * 100;
                const isSelected = selectedCategory === item.category;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedCategory(isSelected ? null : item.category)}
                    style={[styles.categoryRow, isSelected && styles.categoryRowSelected]}
                  >
                    <View style={styles.categoryInfo}>
                      <View style={[styles.categoryColor, { backgroundColor: colors[index % colors.length] }]} />
                      <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>{formatCategory(item.category)}</Text>
                    </View>
                    <View style={styles.categoryDetails}>
                      <Text style={styles.categoryAmount}>${item.amount.toFixed(2)}</Text>
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${percentage}%`,
                              backgroundColor: colors[index % colors.length],
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.categoryPercentage}>{percentage.toFixed(1)}%</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Selected Transactions */}
          {selectedCategory && (
            <View style={styles.txListContainer}>
              <Text style={styles.txListHeader}>
                {selectedCategory === "All" ? "All Transactions" : `Transactions: ${formatCategory(selectedCategory)}`}
              </Text>
              {filteredTransactions.length === 0 ? (
                <Text style={styles.noData}>No transactions for this selection</Text>
              ) : (
                filteredTransactions.map((t, i) => (
                  <View key={i} style={styles.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txName}>{t.name || t.merchant_name || formatCategory(t.category)}</Text>
                      <Text style={styles.txDate}>{t.date || t.transaction_date || ""}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: t.amount < 0 ? "#FF6B6B" : "#333" }]}>
                      ${Math.abs(t.amount).toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.noData}>No transactions found for this month</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
    paddingTop: 70,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  accountSelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  accountSelectorButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  accountSelectorArrow: {
    color: "white",
    fontSize: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  selectorContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  selectorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  accountList: {
    maxHeight: 400,
  },
  accountOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
  },
  accountOptionSelected: {
    backgroundColor: "#E3F2FD",
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  accountOptionText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  accountOptionTextSelected: {
    fontWeight: "600",
    color: "#2196F3",
  },
  checkmark: {
    fontSize: 18,
    color: "#2196F3",
    fontWeight: "bold",
  },
  closeModalButton: {
    marginTop: 16,
    backgroundColor: "#666",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  closeModalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  navButton: {
    fontSize: 14,
    color: "#2196F3",
    paddingHorizontal: 12,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  pieChartContainer: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 32,
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "visible",
  },
  pieSlicesContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  totalContainer: {
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: "#666",
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginTop: 4,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 8,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  breakdownArrow: {
    fontSize: 16,
    color: "#2196F3",
  },
  breakdownContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  categoryRowSelected: {
    backgroundColor: "#e8f4ff",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  categoryNameSelected: {
    fontWeight: "700",
  },
  categoryDetails: {
    flex: 1,
    marginLeft: 16,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    marginBottom: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
    color: "#999",
  },
  loader: {
    marginVertical: 24,
  },
  noData: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginVertical: 24,
  },
  txListContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  txListHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  txName: {
    fontSize: 14,
    color: "#333",
  },
  txDate: {
    fontSize: 12,
    color: "#999",
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
});