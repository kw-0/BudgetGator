
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
// date filtering is handled server-side by period; remove client date-picker
// import { useRouter } from "expo-router";
import { Dimensions } from "react-native";
import { WebView } from "react-native-webview";


const screenWidth = Dimensions.get("window").width;
const BASE_URL = Constants.expoConfig.extra.API_URL;

async function handleTokenExpired(router) {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("userId");
  Alert.alert("Session Expired", "Please log in again", [
    { text: "OK", onPress: () => router.replace("/auth/login-screen") },
  ]);
}

// export default function Dashboard() {
//   const router = useRouter();
//   const [showPlaid, setShowPlaid] = useState(false);
//   const [linkToken, setLinkToken] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [transactions, setTransactions] = useState([]);
//   const [period, setPeriod] = useState(() => {
//     const now = new Date();
//     const y = now.getFullYear();
//     const m = String(now.getMonth() + 1).padStart(2, "0");
//     return `${y}-${m}`;
//   });
//   const [totals, setTotals] = useState({ count: 0, total_amount: 0, by_category: {} });
  
//   const [selectedTransaction, setSelectedTransaction] = useState(null);
//   const [detailsVisible, setDetailsVisible] = useState(false);
//   const [selectedCategory, setSelectedCategory] = useState("All");
//   const [categoryModalVisible, setCategoryModalVisible] = useState(false);
//   // date filtering moved to server via ?period=YYYY-MM; client no longer needs date pickers

//   async function startPlaidLink() {
//     try {
//       setLoading(true);
//       const token = await AsyncStorage.getItem("token");
//       const userId = await AsyncStorage.getItem("userId");
//       if (!token || !userId) {
//         Alert.alert("Error", "You must log in again");
//         return;
//       }
//       const res = await fetch(`${BASE_URL}/api/plaid/create_link_token`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       const data = await res.json();
//       if (!data.link_token) throw new Error("No link token received");
//       const redirectUri = `${BASE_URL}/api/plaid/return`;
//       const plaidUrl = `https://cdn.plaid.com/link/v2/stable/link.html?token=${data.link_token}&redirect_uri=${encodeURIComponent(
//         redirectUri
//       )}`;
//       setLinkToken(plaidUrl);
//       setShowPlaid(true);
//     } catch (e) {
//       console.error("Plaid setup error:", e);
//       Alert.alert("Error", "Unable to start Plaid");
//     } finally {
//       setLoading(false);
//     }
//   }

//   function handleNavigation(evt) {
//     if (evt.url.includes("/api/plaid/return")) {
//       setShowPlaid(false);
//       Alert.alert("Success", "Bank linked! Tap to load transactions.");
//     }
//   }

//   function normalizeTransaction(raw) {
//     const name = raw.name || raw.description || "Unknown";
//     const amount =
//       typeof raw.amount === "number" ? raw.amount : Number(raw.amount) || 0;
//     const date = raw.date || raw.transaction_date || raw.created_at || null;
//     const category =
//       raw.personal_finance_category?.primary ||
//       (Array.isArray(raw.category) ? raw.category.join(", ") : raw.category) ||
//       "Uncategorized";

//     return {
//       id: raw.transaction_id || raw.id || Math.random().toString(),
//       name,
//       amount,
//       date,
//       category,
//     };
//   }

//   function formatCurrency(amount) {
//     const abs = Math.abs(amount).toFixed(2);
//     const sign = amount < 0 ? "-" : "";
//     return `${sign}$${abs}`;
//   }

//   function formatDate(dateString) {
//     if (!dateString) return "";
//     const d = new Date(dateString);
//     if (isNaN(d.getTime())) return dateString;
//     return d.toLocaleDateString();
//   }

//   function formatDisplayText(text) {
//     if (!text) return "";
//     return text
//       .replace(/_/g, " ")
//       .toLowerCase()
//       .replace(/\b\w/g, (c) => c.toUpperCase());
//   }

//   async function fetchTransactions() {
//     try {
//       setLoading(true);
//       const token = await AsyncStorage.getItem("token");
//       // Request transactions for the selected period (YYYY-MM) and optional category
//       const category = selectedCategory && selectedCategory !== "All" ? selectedCategory : null;
//       let url = `${BASE_URL}/api/plaid/transactions?period=${period}`;
//       if (category) url += `&category=${encodeURIComponent(category)}`;
//       const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

//       if (!res.ok) {
//         const errorData = await res.json().catch(() => ({}));
//         if (errorData.code === "token_expired") {
//           await handleTokenExpired(router);
//           return;
//         }
//         console.log("Fetch failed:", errorData);
//         Alert.alert("Error", errorData.message || "Failed to fetch transactions");
//         return;
//       }

//       const data = await res.json();
//       const rawList = Array.isArray(data) ? data : data.transactions || [];
//       if (rawList.length === 0) {
//         Alert.alert("No Transactions", "Bank linked but no recent activity found.");
//         setTransactions([]);
//         setTotals({ count: 0, total_amount: 0, by_category: {} });
//         return;
//       }

//       const normalized = rawList.map(normalizeTransaction);
//       setTransactions(normalized);
//       // capture totals if provided by server
//       if (data.totals) setTotals(data.totals);
//     } catch (err) {
//       console.error("Fetch error:", err);
//       Alert.alert("Error", "Unable to load transactions.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   // Auto-fetch when period or selectedCategory changes
//   useEffect(() => {
//     fetchTransactions();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [period, selectedCategory]);

//   function prevMonth() {
//     const [y, m] = period.split("-").map((p) => parseInt(p, 10));
//     const d = new Date(y, m - 1, 1);
//     d.setMonth(d.getMonth() - 1);
//     const ny = d.getFullYear();
//     const nm = String(d.getMonth() + 1).padStart(2, "0");
//     setPeriod(`${ny}-${nm}`);
//   }

//   function nextMonth() {
//     const [y, m] = period.split("-").map((p) => parseInt(p, 10));
//     const d = new Date(y, m - 1, 1);
//     d.setMonth(d.getMonth() + 1);
//     const ny = d.getFullYear();
//     const nm = String(d.getMonth() + 1).padStart(2, "0");
//     setPeriod(`${ny}-${nm}`);
//   }

//   function prettyPeriod(p) {
//     try {
//       const [y, m] = p.split("-").map((s) => parseInt(s, 10));
//       const d = new Date(y, m - 1, 1);
//       return d.toLocaleString(undefined, { month: "long", year: "numeric" });
//     } catch (e) {
//       return p;
//     }
//   }

//   const allCategories = useMemo(() => {
//     const set = new Set(transactions.map((tx) => tx.category || "Uncategorized"));
//     return ["All", ...Array.from(set)];
//   }, [transactions]);

//   const filteredTransactions = useMemo(() => {
//     if (selectedCategory === "All") return transactions;
//     return transactions.filter((tx) => tx.category === selectedCategory);
//   }, [transactions, selectedCategory]);

//   function renderItem({ item }) {
//     return (
//       <View style={styles.row}>
//         <View style={styles.left}>
//           <Text style={styles.name}>{formatDisplayText(item.name)}</Text>
//           {item.category ? (
//             <Text style={styles.category}>{formatDisplayText(item.category)}</Text>
//           ) : null}
//           {item.date ? <Text style={styles.date}>{formatDate(item.date)}</Text> : null}
//         </View>
//         <View style={styles.right}>
//           <Text
//             style={[
//               styles.amount,
//               item.amount < 0 ? styles.negative : styles.positive,
//             ]}
//           >
//             {formatCurrency(item.amount)}
//           </Text>
//         </View>
//         <TouchableOpacity
//           style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
//           onPress={() => {
//             setSelectedTransaction(item);
//             setDetailsVisible(true);
//           }}
//         />
//       </View>
//     );
//   }

//   if (showPlaid) {
//     return (
//       <WebView source={{ uri: linkToken }} onNavigationStateChange={handleNavigation} />
//     );
//   }

//   return (
//     <View style={{ flex: 1 }}>
//       <View style={{ padding: 16 }}>
//         {loading ? (
//           <ActivityIndicator />
//         ) : (
//           <View>
//             <Button title="Link Bank Account" onPress={startPlaidLink} />
//             <View style={{ height: 12 }} />
//             <Button title="Get Transactions" onPress={fetchTransactions} />

//             <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
//               <TouchableOpacity onPress={prevMonth} style={{ padding: 8, backgroundColor: '#eee', borderRadius: 6, marginRight: 8 }}>
//                 <Text>{'‹ Prev'}</Text>
//               </TouchableOpacity>
//               <View style={{ flex: 1, alignItems: 'center' }}>
//                 <Text style={{ fontWeight: '600' }}>{prettyPeriod(period)}</Text>
//               </View>
//               <TouchableOpacity onPress={nextMonth} style={{ padding: 8, backgroundColor: '#eee', borderRadius: 6, marginLeft: 8 }}>
//                 <Text>{'Next ›'}</Text>
//               </TouchableOpacity>
//             </View>

//             <View style={{ marginTop: 8 }}>
//               <Text style={{ fontWeight: '600' }}>Summary: {totals.count} transactions • {formatCurrency(totals.total_amount || 0)}</Text>
//             </View>

//             {/* Category Filter */}
//             {transactions.length > 0 && (
//               <View style={{ marginVertical: 12 }}>
//                 <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Filter by Category:</Text>
//                 <TouchableOpacity
//                   style={{
//                     backgroundColor: "#007AFF",
//                     padding: 12,
//                     borderRadius: 8,
//                     alignItems: "center",
//                   }}
//                   onPress={() => setCategoryModalVisible(true)}
//                 >
//                   <Text style={{ color: "white", fontWeight: "bold" }}>
//                     {selectedCategory === "All" ? "All Categories" : formatDisplayText(selectedCategory)}
//                   </Text>
//                 </TouchableOpacity>

//                 <Modal
//                   visible={categoryModalVisible}
//                   transparent
//                   animationType="slide"
//                   onRequestClose={() => setCategoryModalVisible(false)}
//                 >
//                   <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 }}>
//                     <View style={{ backgroundColor: "white", borderRadius: 10, padding: 20, maxHeight: "80%" }}>
//                       <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>Select a Category</Text>
//                       <ScrollView>
//                         {allCategories.map((cat) => (
//                           <TouchableOpacity
//                             key={cat}
//                             style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" }}
//                             onPress={() => {
//                               setSelectedCategory(cat);
//                               setCategoryModalVisible(false);
//                             }}
//                           >
//                             <Text style={{ color: "black", fontSize: 14 }}>
//                               {cat === "All" ? "All" : formatDisplayText(cat)}
//                             </Text>
//                           </TouchableOpacity>
//                         ))}
//                       </ScrollView>
//                       <TouchableOpacity
//                         style={{ marginTop: 10, backgroundColor: "gray", padding: 10, borderRadius: 8, alignItems: "center" }}
//                         onPress={() => setCategoryModalVisible(false)}
//                       >
//                         <Text style={{ color: "white" }}>Cancel</Text>
//                       </TouchableOpacity>
//                     </View>
//                   </View>
//                 </Modal>
//               </View>
//             )}

//             {/* Date filter removed — server supplies month periods */}
//           </View>
//         )}
//       </View>

//       {/* Transactions List */}
//       <View style={{ flex: 1 }}>
//         {transactions.length === 0 && !loading ? (
//           <View style={styles.empty}>
//             <Text style={styles.emptyText}>No transactions to show</Text>
//           </View>
//         ) : (
//           <FlatList
//             data={filteredTransactions}
//             keyExtractor={(item) => item.id}
//             renderItem={renderItem}
//             ItemSeparatorComponent={() => <View style={styles.separator} />}
//             contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
//           />
//         )}

//         {/* Transaction Details Modal */}
//         <Modal
//           visible={detailsVisible}
//           transparent
//           animationType="slide"
//           onRequestClose={() => setDetailsVisible(false)}
//         >
//           <View style={styles.modalOverlay}>
//             <View style={styles.modalContent}>
//               <ScrollView>
//                 {selectedTransaction && (
//                   <>
//                     <Text style={styles.modalTitle}>
//                       {formatDisplayText(selectedTransaction.name)}
//                     </Text>
//                     <Text>Amount: {formatCurrency(selectedTransaction.amount)}</Text>
//                     <Text>Category: {selectedTransaction.category}</Text>
//                     <Text>Date: {formatDate(selectedTransaction.date)}</Text>
//                     <Text>Transaction ID: {selectedTransaction.id}</Text>
//                   </>
//                 )}
//               </ScrollView>
//               <TouchableOpacity style={styles.closeButton} onPress={() => setDetailsVisible(false)}>
//                 <Text style={{ color: "white" }}>Close</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </Modal>
//       </View>
//     </View>
//   );

export default function Dashboard() {
 const router = useRouter();
 const [showPlaid, setShowPlaid] = useState(false);
 const [linkToken, setLinkToken] = useState(null);
 const [loading, setLoading] = useState(false);
 const [transactions, setTransactions] = useState([]);
 const [period, setPeriod] = useState(() => {
   const now = new Date();
   const y = now.getFullYear();
   const m = String(now.getMonth() + 1).padStart(2, "0");
   return `${y}-${m}`;
 });
 const [totals, setTotals] = useState({ count: 0, total_amount: 0, by_category: {} });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
 const [detailsVisible, setDetailsVisible] = useState(false);
 const [selectedCategory, setSelectedCategory] = useState("All");
 const [categoryModalVisible, setCategoryModalVisible] = useState(false);
 // date filtering moved to server via ?period=YYYY-MM; client no longer needs date pickers


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
     
     if (!res.ok) {
       const errorData = await res.json().catch(() => ({}));
       if (errorData.code === "token_expired") {
         await handleTokenExpired(router);
         return;
       }
       throw new Error(errorData.message || "Failed to create link token");
     }
     
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
     // Request transactions for the selected period (YYYY-MM) and optional category
     const category = selectedCategory && selectedCategory !== "All" ? selectedCategory : null;
     let url = `${BASE_URL}/api/plaid/transactions?period=${period}`;
     if (category) url += `&category=${encodeURIComponent(category)}`;
     const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });


     if (!res.ok) {
       const errorData = await res.json().catch(() => ({}));
       if (errorData.code === "token_expired") {
         await handleTokenExpired(router);
         return;
       }
       console.log("Fetch failed:", errorData);
       Alert.alert("Error", errorData.message || "Failed to fetch transactions");
       return;
     }


     const data = await res.json();
     const rawList = Array.isArray(data) ? data : data.transactions || [];
     if (rawList.length === 0) {
       Alert.alert("No Transactions", "Bank linked but no recent activity found.");
       setTransactions([]);
       setTotals({ count: 0, total_amount: 0, by_category: {} });
       return;
     }


     const normalized = rawList.map(normalizeTransaction);
     setTransactions(normalized);
     // capture totals if provided by server
     if (data.totals) setTotals(data.totals);
   } catch (err) {
     console.error("Fetch error:", err);
     Alert.alert("Error", "Unable to load transactions.");
   } finally {
     setLoading(false);
   }
 }


 // Auto-fetch when period or selectedCategory changes
 useEffect(() => {
   fetchTransactions();
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [period, selectedCategory]);


 function prevMonth() {
   const [y, m] = period.split("-").map((p) => parseInt(p, 10));
   const d = new Date(y, m - 1, 1);
   d.setMonth(d.getMonth() - 1);
   const ny = d.getFullYear();
   const nm = String(d.getMonth() + 1).padStart(2, "0");
   setPeriod(`${ny}-${nm}`);
 }


 function nextMonth() {
   const [y, m] = period.split("-").map((p) => parseInt(p, 10));
   const d = new Date(y, m - 1, 1);
   d.setMonth(d.getMonth() + 1);
   const ny = d.getFullYear();
   const nm = String(d.getMonth() + 1).padStart(2, "0");
   setPeriod(`${ny}-${nm}`);
 }


 function prettyPeriod(p) {
   try {
     const [y, m] = p.split("-").map((s) => parseInt(s, 10));
     const d = new Date(y, m - 1, 1);
     return d.toLocaleString(undefined, { month: "long", year: "numeric" });
   } catch (e) {
     return p;
   }
 }


 const allCategories = useMemo(() => {
   const set = new Set(transactions.map((tx) => tx.category || "Uncategorized"));
   return ["All", ...Array.from(set)];
 }, [transactions]);


 const filteredTransactions = useMemo(() => {
   if (selectedCategory === "All") return transactions;
   return transactions.filter((tx) => tx.category === selectedCategory);
 }, [transactions, selectedCategory]);


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
     <View style={{ padding: 16 }}>
       {loading ? (
         <ActivityIndicator />
       ) : (
         <View>
           <Button title="Link Bank Account" onPress={startPlaidLink} />
           <View style={{ height: 12 }} />
           <Button title="Get Transactions" onPress={fetchTransactions} />
           <View style={{ height: 12 }} />
           <Button title="View Analysis" onPress={() => router.push("/analysis")} />


           <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
             <TouchableOpacity onPress={prevMonth} style={{ padding: 8, backgroundColor: '#eee', borderRadius: 6, marginRight: 8 }}>
               <Text>{'‹ Prev'}</Text>
             </TouchableOpacity>
             <View style={{ flex: 1, alignItems: 'center' }}>
               <Text style={{ fontWeight: '600' }}>{prettyPeriod(period)}</Text>
             </View>
             <TouchableOpacity onPress={nextMonth} style={{ padding: 8, backgroundColor: '#eee', borderRadius: 6, marginLeft: 8 }}>
               <Text>{'Next ›'}</Text>
             </TouchableOpacity>
           </View>


           <View style={{ marginTop: 8 }}>
             <Text style={{ fontWeight: '600' }}>Summary: {totals.count} transactions • {formatCurrency(totals.total_amount || 0)}</Text>
           </View>


           {/* {totals.by_category && Object.keys(totals.by_category).length > 0 && (
                 <View style={{ alignItems: "center", marginVertical: 16 }}>
                       <Text style={{ fontWeight: "bold", marginBottom: 8 }}>Spending by Category</Text>
                       <PieChart
                           data={Object.entries(totals.by_category).map(([category, amount], i) => ({
                             name: category,
                             population: amount,
                             color: `hsl(${i * 45}, 70%, 50%)`,
                             legendFontColor: "#333",
                             legendFontSize: 12,
                           }))}
                           width={screenWidth - 32}
                           height={220}
                           accessor={"population"}
                           backgroundColor={"transparent"}
                           paddingLeft={"10"}
                           absolute
                       />
                 </View>
           )} */}


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


           {/* Date filter removed — server supplies month periods */}
         </View>
       )}
     </View>


     {/* Transactions List */}
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


