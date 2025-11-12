import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Nav() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is the Nav screen 🏠</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9f9f9" },
  text: { fontSize: 18, fontWeight: "bold" },
});
