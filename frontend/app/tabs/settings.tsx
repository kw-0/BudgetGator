import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Settings() {

  const isPrimaryUser = false; // Placeholder for actual user role check

//   return (
//     <View style={styles.container}>
//       <Text style={styles.text}>hi this is settings</Text>
//     </View>
//   );
// }
  return (
      <View style={styles.container}>
        {isPrimaryUser ? (
          <Text style={styles.text}>This is settings for PRIMARY users</Text>
        ) : (
          <Text style={styles.text}>This is settings for BENEFACTORS</Text>
        )}
      </View>
    );
  }

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9f9f9" },
  text: { fontSize: 18, fontWeight: "bold" },
});