import { Redirect } from "expo-router";
import React from "react";

export default function AuthIndex() {
  return <Redirect href="/auth/login-screen" />;
}
