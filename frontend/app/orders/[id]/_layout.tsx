import { Stack } from "expo-router";

export default function OrderDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="rate" />
      <Stack.Screen name="track" />
    </Stack>
  );
}
