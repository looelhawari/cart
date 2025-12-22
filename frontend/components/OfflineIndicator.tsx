import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { WifiOff } from "lucide-react-native";
import Colors from "@/constants/Colors";
import Spacing from "@/constants/Spacing";
import { useIsOnline } from "@/services/cache/networkDetector";

/**
 * Offline Indicator Component
 * Displays a banner when the device is offline
 */
export default function OfflineIndicator() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <WifiOff size={16} color={Colors.neutralWhite} />
      <Text style={styles.text}>No Internet Connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.accentRed,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  text: {
    color: Colors.neutralWhite,
    fontSize: 14,
    fontWeight: "600",
  },
});
