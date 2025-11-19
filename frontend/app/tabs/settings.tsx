import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Button,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// import DateTimePickerModal from "react-native-modal-datetime-picker";
// import { WebView } from "react-native-webview";
// import Dash from "./dash";

const BASE_URL = Constants.expoConfig.extra.API_URL;

  //  export default function Settings() {
  //    return (
  //      <View style={styles.container}>
  //        <Text style={styles.text}>This is the Settings screen 🛠️</Text>
  //      </View>
  //    );
  //  }

  //  const styles = StyleSheet.create({
  //    container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9f9f9" },
  //    text: { fontSize: 18, fontWeight: "bold" },
  //  });


export default function Settings() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [benefactorUsername, setBenefactorUsername] = useState("");

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");
      Alert.alert("Logged Out", "You have been logged out successfully");
      router.replace("/auth/login-screen");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out");
    }
  };

  const linkBenefactor = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Session", "Please log in again");
        router.replace("/auth/login-screen");
        return;
      }

      const res = await fetch(`${BASE_URL}/api/plaid/create_link_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ benefactorUsername }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "token_expired") {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("userId");
          Alert.alert("Session Expired", "Please log in again", [
            { text: "OK", onPress: () => router.replace("/auth/login-screen") },
          ]);
          return;
        }
        Alert.alert("Error", data.error || "Failed to link benefactor");
        return;
      }

      Alert.alert("Success", "Benefactor linked successfully!");
      setModalVisible(false);
      setBenefactorUsername("");
    } catch (err) {
      console.error("Error linking benefactor:", err);
      Alert.alert("Error", "Server error while linking benefactor.");
    }
  };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Settings</Text>
//       <View style={{ marginTop: 20, width: 200 }}>
        
//       </View>
//     </View>
//   );
// }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is the Settings screen</Text>

      <View style={{ marginTop: 20, width: 200 }}>
          <Button title="Log Out" onPress={handleLogout} color="#ff3b30" />
      </View>

      <View style={{ marginTop: 20 }}>
        <Button title="Add Benefactor" onPress={() => setModalVisible(true)} />
      </View>

      {/* Modal for entering username */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Benefactor</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter benefactor username"
              value={benefactorUsername}
              onChangeText={setBenefactorUsername}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={linkBenefactor}>
                <Text style={styles.btnText}>Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9f9f9", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  text: { fontSize: 18, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end" },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: "#aaa",
    marginRight: 8,
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: "#007AFF",
  },
  btnText: { color: "white", fontWeight: "bold" },
});