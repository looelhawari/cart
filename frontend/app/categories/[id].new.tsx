import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  ChevronRight,
} from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { ProductCard } from "@/components/ProductCard";
import { getCategoryProducts } from "@/services/api/categoryApi";
import type { Product, Category } from "@/types";
import { useStore } from "@/store";
import { useTranslation, useLocalizedValue } from "@/i18n";

export default function CategoryProductsScreen() {
  const { t } = useTranslation();
  const { getName } = useLocalizedValue();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const { cart } = useStore();

  const cartItemsCount =
    cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  useEffect(() => {
    if (id) {
      loadCategoryProducts();
    }
  }, [id]);

  const loadCategoryProducts = async () => {
    try {
      setLoading(true);
      const response = await getCategoryProducts(Number(id), {
        sort_by: "created_at",
        sort_order: "desc",
      });
      if (response.success) {
        setCategory(response.data.category);
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error("Failed to load category products:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productItem}>
      <ProductCard
        product={item}
        onPress={() => router.push(`/product/${item.barcode}`)}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primary900} />
      </SafeAreaView>
    );
  }

  if (!category) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>{t.ui.categoryNotFound}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasSubcategories =
    category.subcategories && category.subcategories.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {getName(category)}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/search")}
          >
            <Search size={20} color={Colors.primary900} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/(tabs)/cart")}
          >
            <ShoppingCart size={20} color={Colors.primary900} />
            {cartItemsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartItemsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Subcategories Section */}
      {hasSubcategories && (
        <View style={styles.subcategoriesSection}>
          <Text style={styles.sectionTitle}>{t.ui.subcategories}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoriesScroll}
          >
            {category.subcategories.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                style={styles.subcategoryCard}
                onPress={() => router.push(`/categories/${sub.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.subcategoryContent}>
                  <Text style={styles.subcategoryName}>{getName(sub)}</Text>
                  <ChevronRight size={16} color={Colors.primary900} />
                </View>
                {sub.products_count > 0 && (
                  <Text style={styles.subcategoryCount}>
                    {sub.products_count} {t.ui.productPlural}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Products Section */}
      {products.length > 0 && (
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>
            {t.ui.productsIn.replace("{name}", getName(category))}
          </Text>
          <Text style={styles.productsCount}>
            {products.length}{" "}
            {products.length === 1 ? t.ui.productSingular : t.ui.productPlural}
          </Text>
        </View>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t.ui.noProductsFound}</Text>
          <Text style={styles.emptyText}>
            {hasSubcategories ? t.ui.checkSubcategories : t.ui.noProductsYet}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.barcode.toString()}
          numColumns={2}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
    gap: Spacing.md,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.h3,
    fontWeight: "700",
    color: Colors.neutralCharcoal,
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  iconButton: {
    position: "relative",
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.accentRed,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.neutralWhite,
    fontSize: 10,
    fontWeight: "700",
  },
  subcategoriesSection: {
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  subcategoriesScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  subcategoryCard: {
    backgroundColor: Colors.primary100,
    borderRadius: 12,
    padding: Spacing.md,
    minWidth: 160,
  },
  subcategoryContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  subcategoryName: {
    fontSize: Typography.body,
    fontWeight: "600",
    color: Colors.primary900,
    flex: 1,
  },
  subcategoryCount: {
    fontSize: Typography.bodySmall,
    color: Colors.primary700,
  },
  productsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  productsCount: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
  productsList: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  productItem: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: Spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.h3,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.body,
    color: Colors.neutralMedium,
    textAlign: "center",
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorTitle: {
    fontSize: Typography.h3,
    fontWeight: "600",
    color: Colors.accentRed,
  },
});
