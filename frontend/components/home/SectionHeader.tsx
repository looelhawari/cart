import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import Colors from "@/constants/Colors";

interface SectionHeaderProps {
  title: string;
  /** Text inside the "See all" pill — defaults to "See All" */
  actionLabel?: string;
  onActionPress?: () => void;
  /** Optional left icon element */
  leftIcon?: React.ReactNode;
  /** Optional badge element placed right of the title */
  badge?: React.ReactNode;
}

export const SectionHeader = memo(function SectionHeader({
  title,
  actionLabel,
  onActionPress,
  leftIcon,
  badge,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {leftIcon}
        <Text style={styles.title}>{title}</Text>
        {badge}
      </View>
      {onActionPress && actionLabel ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onActionPress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <ChevronRight size={15} color={Colors.primary900} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary100,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
  },
  actionText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: Colors.primary900,
    marginRight: 1,
  },
});
