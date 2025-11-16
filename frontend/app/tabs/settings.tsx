import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import Constants from "expo-constants";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Modal,
  ScrollView,
  Alert, Button, StyleSheet,
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

  async function handleLogout() {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");
      Alert.alert("Logged Out", "You have been logged out successfully");
      router.replace("/auth/login-screen");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={{ marginTop: 20, width: 200 }}>
        <Button title="Log Out" onPress={handleLogout} color="#ff3b30" />
      </View>
    </View>
  );
}

  const isPrimaryUser = false; // Placeholder for actual user role check

//   return (
//     <View style={styles.container}>
//       <Text style={styles.text}>hi this is settings</Text>
//     </View>
//   );
// }
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
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9f9f9", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
});