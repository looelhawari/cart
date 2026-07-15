import React, { memo, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { SectionHeader } from "./SectionHeader";
import { HorizontalProductLane } from "./HorizontalProductLane";
import type { Product } from "@/types";

export interface CollectionLaneSectionProps {
  title: string;
  products: Product[];
  /** Ionicons name for the round leading icon. */
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Accent color for the icon chip (defaults to brand green). */
  iconColor?: string;
  /** Optional pill badge shown next to the title (e.g. "Hot", "New"). */
  badgeLabel?: string;
  badgeColor?: string;
  /** Route pushed when "See All" is tapped. Omit to hide the action. */
  seeAllRoute?: string;
  seeAllLabel?: string;
  onAddToCart?: (result: {
    success: boolean;
    message: string;
    type: "success" | "error";
  }) => void;
}

/**
 * Generic, data-driven product lane: a {@link SectionHeader} (icon + title +
 * optional badge + "See All") on top of a horizontal {@link HorizontalProductLane}.
 * Every home-page product collection (Recommended, Trending, New Arrivals,
 * Popular, Top Rated, Fresh, …) is just this component with different props —
 * adding a new collection needs no new component, only a config entry.
 */
export const CollectionLaneSection = memo(function CollectionLaneSection({
  title,
  products,
  iconName,
  iconColor = Colors.primary900,
  badgeLabel,
  badgeColor = Colors.accentOrange,
  seeAllRoute,
  seeAllLabel,
  onAddToCart,
}: CollectionLaneSectionProps) {
  const handleSeeAll = useCallback(() => {
    if (seeAllRoute) router.push(seeAllRoute as any);
  }, [seeAllRoute]);

  if (!products || products.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title={title}
        actionLabel={seeAllRoute ? seeAllLabel : undefined}
        onActionPress={seeAllRoute ? handleSeeAll : undefined}
        leftIcon={
          iconName ? (
            <View style={[styles.iconChip, { backgroundColor: iconColor }]}>
              <Ionicons name={iconName} size={13} color={Colors.neutralWhite} />
            </View>
          ) : undefined
        }
        badge={
          badgeLabel ? (
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          ) : undefined
        }
      />
      <HorizontalProductLane products={products} onAddToCart={onAddToCart} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
  },
  iconChip: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },
});
