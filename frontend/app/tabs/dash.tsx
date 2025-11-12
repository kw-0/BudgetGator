import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Dash() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is the Dash screen ⚙️</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  text: { fontSize: 18, fontWeight: "bold" },
});
