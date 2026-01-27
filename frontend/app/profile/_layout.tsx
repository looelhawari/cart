import { Stack } from "expo-router";
import React from "react";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackTitle: "Back",
        headerStyle: {
          backgroundColor: "#fff",
        },
        headerTintColor: "#16a34a",
      }}
    >
      <Stack.Screen
        name="favorites"
        options={{
          headerShown: false,
          title: "My Favorites",
        }}
      />
      <Stack.Screen
        name="addresses"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          headerShown: false,
          title: "Help & Support",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
          title: "Settings",
        }}
      />
    </Stack>
  );
}
