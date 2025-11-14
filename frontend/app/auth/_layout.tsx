import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="login-screen" options={{ title: "Login" }} />
    </Stack>
  );
}