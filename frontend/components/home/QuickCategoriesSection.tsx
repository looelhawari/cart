import React, { memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { SectionHeader } from "./SectionHeader";
import type { Category } from "@/types";
import { useLocalizedValue, useTranslation } from "@/i18n";

// Category icon mapping with CART brand gradients
const getCategoryIcon = (
  slug: string,
): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: readonly [string, string];
} => {
  const iconMap: Record<
    string,
    {
      icon: keyof typeof Ionicons.glyphMap;
      color: string;
      gradient: readonly [string, string];
    }
  > = {
    fruits: {
      icon: "nutrition-outline",
      color: Colors.accentOrange,
      gradient: ["#FFF7ED", "#FFEDD5"] as const,
    },
    vegetables: {
      icon: "leaf-outline",
      color: Colors.primary900,
      gradient: ["#F0FDF4", "#DCFCE7"] as const,
    },
    meat: {
      icon: "restaurant-outline",
      color: "#DC2626",
      gradient: ["#FEF2F2", "#FECACA"] as const,
    },
    dairy: {
      icon: "water-outline",
      color: "#0EA5E9",
      gradient: ["#F0F9FF", "#E0F2FE"] as const,
    },
    bakery: {
      icon: "pizza-outline",
      color: "#D97706",
      gradient: ["#FFFBEB", "#FEF3C7"] as const,
    },
    beverages: {
      icon: "cafe-outline",
      color: "#7C3AED",
      gradient: ["#FAF5FF", "#EDE9FE"] as const,
    },
    snacks: {
      icon: "fast-food-outline",
      color: "#EC4899",
      gradient: ["#FDF2F8", "#FCE7F3"] as const,
    },
    frozen: {
      icon: "snow-outline",
      color: "#06B6D4",
      gradient: ["#ECFEFF", "#CFFAFE"] as const,
    },
    cleaning: {
      icon: "sparkles-outline",
      color: "#3B82F6",
      gradient: ["#EFF6FF", "#DBEAFE"] as const,
    },
    personal: {
      icon: "body-outline",
      color: "#8B5CF6",
      gradient: ["#F5F3FF", "#EDE9FE"] as const,
    },
    grocery: {
      icon: "cart-outline",
      color: Colors.primary700,
      gradient: ["#F0FDF4", "#DCFCE7"] as const,
    },
    organic: {
      icon: "flower-outline",
      color: "#10B981",
      gradient: ["#ECFDF5", "#D1FAE5"] as const,
    },
  };

  const normalizedSlug = slug?.toLowerCase().replace(/[^a-z]/g, "") || "";
  for (const [key, value] of Object.entries(iconMap)) {
    if (normalizedSlug.includes(key) || key.includes(normalizedSlug)) {
      return value;
    }
  }
  return {
    icon: "grid-outline",
    color: Colors.primary900,
    gradient: ["#F0FDF4", "#DCFCE7"] as const,
  };
};

interface QuickCategoriesSectionProps {
  categories: Category[];
  categoryDiscounts: Map<number, number>;
}

export const QuickCategoriesSection = memo(function QuickCategoriesSection({
  categories,
  categoryDiscounts,
}: QuickCategoriesSectionProps) {
  const { t } = useTranslation();
  const { getName } = useLocalizedValue();

  if (categories.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title={t.common?.browse || "Browse Categories"}
        actionLabel={t.common?.viewAll || "View All"}
        onActionPress={() => router.push("/(tabs)/categories")}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {categories.map((cat) => {
          const iconInfo = getCategoryIcon(cat.slug || "");
          const discount = categoryDiscounts.get(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.card}
              onPress={() => router.push(`/categories/${cat.id}` as any)}
              activeOpacity={0.85}
            >
              <View style={{ position: "relative" }}>
                {cat.image ? (
                  <View style={styles.imageWrap}>
                    <Image
                      source={{ uri: cat.image }}
                      style={styles.imageFill}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <LinearGradient
                    colors={iconInfo.gradient}
                    style={styles.iconContainer}
                  >
                    <Ionicons
                      name={iconInfo.icon}
                      size={26}
                      color={iconInfo.color}
                    />
                  </LinearGradient>
                )}
                {discount != null && discount > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{discount}%</Text>
                  </View>
                )}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {getName(cat)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 6,
  },
  scroll: {
    paddingHorizontal: 14,
    gap: 10,
  },
  card: {
    alignItems: "center",
    width: 76,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  imageWrap: {
    width: 68,
    height: 68,
    borderRadius: 17,
    overflow: "hidden",
    marginBottom: 7,
    backgroundColor: Colors.neutralLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  imageFill: {
    width: 68,
    height: 68,
  },
  name: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralCharcoal,
    textAlign: "center",
  },
  discountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.accentRed,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 28,
    alignItems: "center",
    shadowColor: Colors.accentRed,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  discountText: {
    fontSize: 9,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    letterSpacing: 0.2,
  },
});
