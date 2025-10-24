// import AsyncStorage from "@react-native-async-storage/async-storage";
// import Constants from "expo-constants";
// import * as Linking from "expo-linking";
// import React from "react";
// import { Alert, Button, View } from "react-native";

// const BASE_URL = Constants.expoConfig.extra.API_URL;

// export default function Dashboard() {
//   const openPlaid = async () => {
//     try {
//         const token = await AsyncStorage.getItem("token");

//         const res = await fetch(`${BASE_URL}/api/plaid/create_link_token`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//             },
//         });
//     const text = await res.text();
//     console.log("Link token response:", text);

//     let data;
//     try {
//     data = JSON.parse(text);
//     } catch (e) {
//     Alert.alert("Error", "Server did not return JSON");
//     return;
//     }

//       const { link_token } = data;
//       if (!link_token) {
//         Alert.alert("Error", "Could not get link token");
//         return;
//       }

//       // Open Plaid Link in system browser
//       const url = `https://cdn.plaid.com/link/v2/stable/link.html?token=${link_token}`;
//       Linking.openURL(url);
//     } catch (err) {
//       console.error("Error opening Plaid:", err);
//       Alert.alert("Error", "Unable to start Plaid Link");
//     }
//   };

//   return (
//     <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//       <Button title="Link Bank Account" onPress={openPlaid} />
//     </View>
//   );
// }

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import { Button, FlatList, StyleSheet, Text, View } from "react-native";

const BASE_URL = Constants.expoConfig.extra.API_URL;

export default function Dashboard() {
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const fetchSandboxData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/plaid/sandbox/cards-and-transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setCards(data.creditCards || []);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Error fetching sandbox data:", err);
    }
  };

  useEffect(() => {
    fetchSandboxData();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Credit Cards</Text>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.account_id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text>Mask: ****{item.mask}</Text>
            <Text>Balance: ${item.balances.current}</Text>
            <Text>Limit: ${item.balances.limit}</Text>
          </View>
        )}
      />

      <Text style={styles.title}>Recent Transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.transaction_id}
        renderItem={({ item }) => (
          <View style={styles.tx}>
            <Text style={styles.txName}>{item.name}</Text>
            <Text>${item.amount.toFixed(2)} — {item.date}</Text>
            <Text>{item.category?.join(" > ")}</Text>
          </View>
        )}
      />

      <Button title="Refresh Fake Data" onPress={fetchSandboxData} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginVertical: 10 },
  card: { padding: 10, borderBottomWidth: 1, borderColor: "#ccc" },
  cardName: { fontSize: 16, fontWeight: "600" },
  tx: { padding: 10, borderBottomWidth: 1, borderColor: "#eee" },
  txName: { fontSize: 14, fontWeight: "500" },
});