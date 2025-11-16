import React, { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Modal,
  ScrollView,
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
  const [modalVisible, setModalVisible] = useState(false);
  const [benefactorUsername, setBenefactorUsername] = useState("");

const linkBenefactor = async () => {
  try {
      const res = await fetch(`${BASE_URL}/api/plaid/create_link_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        //Authorization: `Bearer ${token}`, // <-- if needed
      },
      body: JSON.stringify({
        benefactorUsername,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to link benefactor");
      return;
    }

    alert("Benefactor linked successfully!");
    setModalVisible(false);
    setBenefactorUsername("");

  } catch (err) {
    console.error("Error linking benefactor:", err);
    alert("Server error while linking benefactor.");
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is the Settings screen </Text>

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
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#f9f9f9" 
  },
  text: { 
    fontSize: 18, 
    fontWeight: "bold" 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    padding: 20,
    borderRadius: 10,
    backgroundColor: "white",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelBtn: {
    backgroundColor: "#aaa",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  btnText: {
    color: "white",
    fontWeight: "bold",
  },
});
