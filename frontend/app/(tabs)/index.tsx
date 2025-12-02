import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, ShoppingBag, MapPin, Bell } from "lucide-react-native";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/store";
import { categories } from "@/data/categories";
import {
  products,
  flashDeals,
  bestSellers,
  featuredProducts as featured,
} from "@/data/products";
import { banners } from "@/data/banners";

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const { cart, user, isAuthenticated, resetApp } = useStore();
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const greeting =
    isAuthenticated && user
      ? `${getGreeting()}, ${user.first_name}`
      : getGreeting();

  if (!fontsLoaded) {
    return null;
  }

  const featuredProducts = featured;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FloatingOrbs />

      {/* DEV: Reset App Button - Remove in production */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.devResetButton}
          onPress={() => {
            resetApp();
            router.replace("/onboarding");
          }}
        >
          <Text style={styles.devResetText}>🔄 Reset App</Text>
        </TouchableOpacity>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.locationRow}>
              <MapPin size={20} color={Colors.primary900} />
              <View>
                <Text style={styles.deliverTo}>Deliver to</Text>
                <Text style={styles.location}>Cairo, Egypt 📍</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push("/notifications")}
              >
                <Bell size={24} color={Colors.primary900} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push("/(tabs)/cart")}
              >
                <ShoppingBag size={24} color={Colors.primary900} />
                {cartItemsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartItemsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.greeting}>{greeting}! 👋</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            Fresh Groceries{"\n"}Delivered to You
          </Text>

          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push("/search")}
          >
            <Search size={20} color={Colors.neutralMedium} />
            <Text style={styles.searchPlaceholder}>Search for products...</Text>
          </TouchableOpacity>

          <View style={styles.bannersSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              contentContainerStyle={styles.bannersContainer}
            >
              {banners.map((banner) => (
                <TouchableOpacity key={banner.id} style={styles.bannerCard}>
                  <View style={styles.bannerContent}>
                    <Text style={styles.bannerTitle}>{banner.title}</Text>
                    <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesRow}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryCard}
                  onPress={() =>
                    router.push(`/categories/${category.id}` as any)
                  }
                >
                  <View style={styles.categoryIcon}>
                    <Text style={styles.categoryEmoji}>{category.icon}</Text>
                  </View>
                  <Text style={styles.categoryName} numberOfLines={2}>
                    {category.name}
                  </Text>
                  <Text style={styles.categoryCount}>
                    {category.productCount} items
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Flash Deals Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Flash Deals ⚡</Text>
                <View style={styles.timerBadge}>
                  <Text style={styles.timerText}>02:45:30</Text>
                </View>
              </View>
              <TouchableOpacity>
                <Text style={styles.seeAll}>View All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {flashDeals.map((product) => (
                <View key={product.id} style={styles.horizontalItem}>
                  <ProductCard
                    product={product}
                    onPress={() => router.push(`/product/${product.id}`)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Featured Products Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Products</Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/categories")}
              >
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.productsGrid}>
              {featuredProducts.map((product) => (
                <View key={product.id} style={styles.productItem}>
                  <ProductCard
                    product={product}
                    onPress={() => router.push(`/product/${product.id}`)}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Best Sellers Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Best Sellers 🔥</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {bestSellers.map((product) => (
                <View key={product.id} style={styles.horizontalItem}>
                  <ProductCard
                    product={product}
                    onPress={() => router.push(`/product/${product.id}`)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  devResetButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    zIndex: 999,
    backgroundColor: Colors.accentRed,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  devResetText: {
    color: Colors.neutralWhite,
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  greeting: {
    fontSize: Typography.h2,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  deliverTo: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  location: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  iconButton: {
    position: "relative",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutralWhite,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.accentRed,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.neutralWhite,
    fontSize: 10,
    fontWeight: Typography.bold,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontSize: Typography.h1,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.lg,
    lineHeight: 44,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPlaceholder: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    flex: 1,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  seeAll: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary900,
    fontWeight: Typography.semibold,
  },
  categoriesRow: {
    gap: Spacing.md,
  },
  categoryCard: {
    width: 100,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.md,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    textAlign: "center",
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 10,
    color: Colors.neutralMedium,
    textAlign: "center",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  productItem: {
    width: (Dimensions.get("window").width - Spacing.lg * 2 - Spacing.md) / 2,
  },
  bannersSection: {
    marginBottom: Spacing.lg,
  },
  bannersContainer: {
    gap: Spacing.md,
  },
  bannerCard: {
    width: Dimensions.get("window").width - Spacing.lg * 2,
    height: 160,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: Colors.primary900,
    padding: Spacing.lg,
    justifyContent: "flex-end",
  },
  bannerContent: {
    gap: Spacing.xs,
  },
  bannerTitle: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  bannerSubtitle: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralWhite,
    opacity: 0.9,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  timerBadge: {
    backgroundColor: Colors.accentOrange,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralWhite,
  },
  horizontalScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  horizontalItem: {
    width: 160,
  },
});
