import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Search, X, SlidersHorizontal } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { ProductCard } from "@/components/ProductCard";
import { getProducts, type ProductsResponse } from "@/services/api/productsApi";
import { getCategories } from "@/services/api/categoryApi";
import type { Product, Category } from "@/types";
import { useTranslation, useLocalizedValue } from "@/i18n";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;

const POPULAR_SEARCHES = [
  "Tomatoes",
  "Milk",
  "Bread",
  "Chicken",
  "Eggs",
  "Rice",
  "Pasta",
  "Yogurt",
];

export default function SearchScreen() {
  const { t } = useTranslation();
  const { getName } = useLocalizedValue();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await getCategories(true);
      if (response.success) {
        setCategories(response.data.categories.slice(0, 8));
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      setIsSearching(true);
      setLoading(true);

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery.trim(), selectedCategory);
      }, 500); // 500ms debounce
    } else if (!selectedCategory) {
      setIsSearching(false);
      setSearchResults([]);
      setLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedCategory]);

  const performSearch = async (query: string, categoryId: number | null) => {
    try {
      setLoading(true);
      const response = await getProducts({
        search: query,
        category_id: categoryId || undefined,
        per_page: 50,
      }, false);

      if (response.success) {
        setSearchResults(response.data.products);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim() && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 9)]);
    }
  }, [recentSearches]);

  const handleCategorySelect = useCallback((categoryId: number) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      if (!searchQuery.trim()) {
        setIsSearching(false);
        setSearchResults([]);
      }
    } else {
      setSelectedCategory(categoryId);
      setIsSearching(true);
      performSearch(searchQuery.trim(), categoryId);
    }
  }, [selectedCategory, searchQuery]);

  const removeRecentSearch = (search: string) => {
    setRecentSearches(recentSearches.filter((s) => s !== search));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.resultItem}>
      <ProductCard
        product={item}
        onPress={() => router.push(`/product/${item.barcode}` as any)}
      />
    </View>
  );

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

        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.neutralMedium} />
          <TextInput
            style={styles.searchInput}
            placeholder={t.common.searchPlaceholder}
            placeholderTextColor={Colors.neutralMedium}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={20} color={Colors.neutralMedium} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            // TODO: Open filter bottom sheet
          }}
        >
          <SlidersHorizontal size={20} color={Colors.primary900} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {!isSearching ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t.search.recentSearches}
                </Text>
                <TouchableOpacity onPress={clearAllRecent}>
                  <Text style={styles.clearText}>{t.search.clearAll}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsContainer}>
                {recentSearches.map((search, index) => (
                  <View key={index} style={styles.chip}>
                    <TouchableOpacity
                      onPress={() => handleSearch(search)}
                      style={styles.chipContent}
                    >
                      <Text style={styles.chipText}>{search}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeRecentSearch(search)}
                      style={styles.chipRemove}
                    >
                      <X size={14} color={Colors.neutralMedium} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Popular Searches */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.search.popularSearches}</Text>
            <View style={styles.chipsContainer}>
              {POPULAR_SEARCHES.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.popularChip}
                  onPress={() => handleSearch(search)}
                  activeOpacity={0.7}
                >
                  <Search size={14} color={Colors.primary900} />
                  <Text style={styles.popularChipText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Search by Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search by Category</Text>
            {loadingCategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary900} />
              </View>
            ) : (
              <View style={styles.categoryFilters}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryFilter,
                      selectedCategory === category.id && styles.categoryFilterActive,
                    ]}
                    onPress={() => handleCategorySelect(category.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryFilterText,
                        selectedCategory === category.id && styles.categoryFilterTextActive,
                      ]}
                    >
                      {getName(category)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.resultsContainer}>
          {/* Results Header */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {loading ? "Searching..." : `${searchResults.length} ${searchResults.length === 1 ? "result" : "results"} found`}
            </Text>
            <TouchableOpacity style={styles.sortButton}>
              <Text style={styles.sortText}>Sort</Text>
              <SlidersHorizontal size={16} color={Colors.neutralMedium} />
            </TouchableOpacity>
          </View>

          {/* Results Grid */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary900} />
              <Text style={styles.loadingText}>Searching products...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderProduct}
              keyExtractor={(item) => (item.barcode || item.id)?.toString() || ""}
              numColumns={2}
              contentContainerStyle={styles.resultsGrid}
              columnWrapperStyle={styles.resultRow}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={Colors.neutralGray} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>
                Try searching with different keywords or check your spelling
              </Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    fontFamily: "Poppins_400Regular",
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
  },
  clearText: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary900,
    fontFamily: "Poppins_600SemiBold",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
  },
  chipContent: {
    marginRight: Spacing.xs,
  },
  chipText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    fontFamily: "Poppins_400Regular",
  },
  chipRemove: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  popularChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary900,
  },
  popularChipText: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary900,
    fontFamily: "Poppins_600SemiBold",
  },
  categoryFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryFilter: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
  },
  categoryFilterActive: {
    backgroundColor: Colors.primary900,
    borderColor: Colors.primary900,
  },
  categoryFilterText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    fontFamily: "Poppins_600SemiBold",
  },
  categoryFilterTextActive: {
    color: Colors.neutralWhite,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  resultsCount: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    fontFamily: "Poppins_400Regular",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  sortText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    fontFamily: "Poppins_600SemiBold",
  },
  resultsGrid: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
  },
  resultRow: {
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  resultItem: {
    width: CARD_WIDTH,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    marginTop: Spacing.md,
    fontFamily: "Poppins_400Regular",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: Typography.h3,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
});
