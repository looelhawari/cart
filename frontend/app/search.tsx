import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
  Image,
  Keyboard,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  X,
  SlidersHorizontal,
  Clock,
  Tag,
  ChevronRight,
  Grid3x3,
  Percent,
  Flame,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { ProductCard } from "@/components/ProductCard";
import { getProducts, type ProductsResponse } from "@/services/api/productsApi";
import { getCategories } from "@/services/api/categoryApi";
import {
  getSearchSuggestions,
  getPopularSearches,
  type SearchSuggestionProduct,
  type SearchSuggestionCategory,
  type SearchSuggestionOffer,
  type PopularSearchData,
} from "@/services/api/searchApi";
import type { Product, Category } from "@/types";
import { useTranslation, useLocalizedValue } from "@/i18n";
import { useStore } from "@/store";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;

// ─── Search States ───────────────────────────────────────────────
type SearchState = "idle" | "typing" | "results";

// ─── Sort Options ────────────────────────────────────────────────
type SortOption =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "popular"
  | "newest";

const SORT_OPTIONS: { key: SortOption; sortBy?: string; sortOrder?: string }[] =
  [
    { key: "relevance" },
    { key: "price_asc", sortBy: "price", sortOrder: "asc" },
    { key: "price_desc", sortBy: "price", sortOrder: "desc" },
    { key: "popular", sortBy: "popularity", sortOrder: "desc" },
    { key: "newest", sortBy: "created_at", sortOrder: "desc" },
  ];

export default function SearchScreen() {
  const { t } = useTranslation();
  const { getName } = useLocalizedValue();

  // ─── Zustand store (persisted recent searches) ─────────────────
  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useStore();

  // ─── Local State ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");

  // Suggestions (typeahead)
  const [suggestedProducts, setSuggestedProducts] = useState<
    SearchSuggestionProduct[]
  >([]);
  const [suggestedCategories, setSuggestedCategories] = useState<
    SearchSuggestionCategory[]
  >([]);
  const [suggestedOffers, setSuggestedOffers] = useState<
    SearchSuggestionOffer[]
  >([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Full results
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters & sort
  const [selectedSort, setSelectedSort] = useState<SortOption>("relevance");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showSortSheet, setShowSortSheet] = useState(false);

  // Popular/trending data from backend
  const [popularData, setPopularData] = useState<PopularSearchData | null>(
    null,
  );
  const [popularLoading, setPopularLoading] = useState(true);

  // Categories for filter
  const [categories, setCategories] = useState<Category[]>([]);

  // Refs
  const searchInputRef = useRef<TextInput>(null);
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchSubmittedQuery = useRef<string>("");

  // ─── Load popular data + categories on mount ──────────────────
  useEffect(() => {
    loadPopularData();
    loadCategories();
  }, []);

  const loadPopularData = async () => {
    try {
      setPopularLoading(true);
      const response = await getPopularSearches();
      if (response.success) {
        setPopularData(response.data);
      }
    } catch (error) {
      console.error("Failed to load popular searches:", error);
    } finally {
      setPopularLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await getCategories(true);
      if (response.success) {
        setCategories(response.data.categories.slice(0, 8));
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  // ─── Debounced Suggestions (300ms) + Auto-Search (2s) ─────────
  useEffect(() => {
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }
    if (autoSearchTimeoutRef.current) {
      clearTimeout(autoSearchTimeoutRef.current);
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length >= 2) {
      if (searchState !== "results") {
        setSearchState("typing");
      }
      setSuggestionsLoading(true);

      // Fast typeahead suggestions (300ms)
      suggestionsTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await getSearchSuggestions(trimmed);
          if (response.success) {
            setSuggestedProducts(response.data.products);
            setSuggestedCategories(response.data.categories);
            setSuggestedOffers(response.data.offers);
          }
        } catch (error) {
          console.error("Suggestions error:", error);
        } finally {
          setSuggestionsLoading(false);
        }
      }, 300);

      // Auto-execute full search after 2s of inactivity (enterprise dynamic search)
      autoSearchTimeoutRef.current = setTimeout(() => {
        executeSearch(trimmed);
      }, 2000);
    } else if (trimmed.length === 0 && searchState === "typing") {
      setSearchState("idle");
      setSuggestedProducts([]);
      setSuggestedCategories([]);
      setSuggestedOffers([]);
      setSuggestionsLoading(false);
    }

    return () => {
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
      if (autoSearchTimeoutRef.current) {
        clearTimeout(autoSearchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // ─── Full Search Execution ─────────────────────────────────────
  const executeSearch = useCallback(
    async (query: string, page: number = 1, append: boolean = false) => {
      const trimmed = query.trim();
      if (!trimmed && !selectedCategory) return;

      if (!append) {
        setResultsLoading(true);
        setSearchState("results");
        searchSubmittedQuery.current = trimmed;
      } else {
        setLoadingMore(true);
      }

      Keyboard.dismiss();

      // Save to recent searches
      if (trimmed) {
        addRecentSearch(trimmed);
      }

      try {
        const sortConfig = SORT_OPTIONS.find((s) => s.key === selectedSort);
        const response = await getProducts(
          {
            search: trimmed || undefined,
            category_id: selectedCategory || undefined,
            sort_by: (sortConfig?.sortBy as any) || undefined,
            sort_order: (sortConfig?.sortOrder as any) || undefined,
            per_page: 20,
            page,
          },
          false,
        );

        if (response.success) {
          const newProducts = response.data.products;
          setSearchResults((prev) =>
            append ? [...prev, ...newProducts] : newProducts,
          );
          setTotalResults(
            response.data.pagination?.total ?? newProducts.length,
          );
          setCurrentPage(page);
          setHasMorePages(page < (response.data.pagination?.last_page ?? 1));
        } else {
          if (!append) setSearchResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        if (!append) setSearchResults([]);
      } finally {
        setResultsLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedSort, selectedCategory, addRecentSearch],
  );

  // ─── Handlers ──────────────────────────────────────────────────
  const handleSubmitSearch = useCallback(() => {
    // Cancel auto-search since user explicitly submitted
    if (autoSearchTimeoutRef.current) {
      clearTimeout(autoSearchTimeoutRef.current);
      autoSearchTimeoutRef.current = null;
    }
    executeSearch(searchQuery);
  }, [searchQuery, executeSearch]);

  const handleSuggestionProductPress = useCallback((barcode: string) => {
    Keyboard.dismiss();
    router.push(`/product/${barcode}` as any);
  }, []);

  const handleSuggestionCategoryPress = useCallback(
    (categoryId: number) => {
      setSelectedCategory(categoryId);
      executeSearch(searchQuery, 1);
    },
    [searchQuery, executeSearch],
  );

  const handleRecentSearchPress = useCallback(
    (query: string) => {
      setSearchQuery(query);
      executeSearch(query);
    },
    [executeSearch],
  );

  const handleTrendingPress = useCallback(
    (termEn: string) => {
      setSearchQuery(termEn);
      executeSearch(termEn);
    },
    [executeSearch],
  );

  const handleClearSearch = useCallback(() => {
    if (autoSearchTimeoutRef.current) {
      clearTimeout(autoSearchTimeoutRef.current);
      autoSearchTimeoutRef.current = null;
    }
    setSearchQuery("");
    setSearchState("idle");
    setSearchResults([]);
    setSuggestedProducts([]);
    setSuggestedCategories([]);
    setSuggestedOffers([]);
    setSelectedCategory(null);
    setSelectedSort("relevance");
    searchInputRef.current?.focus();
  }, []);

  const handleSortSelect = useCallback(
    (sort: SortOption) => {
      setSelectedSort(sort);
      setShowSortSheet(false);
      // Re-execute search with new sort
      if (searchState === "results") {
        setTimeout(() => executeSearch(searchSubmittedQuery.current), 50);
      }
    },
    [searchState, executeSearch],
  );

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMorePages) {
      executeSearch(searchSubmittedQuery.current, currentPage + 1, true);
    }
  }, [loadingMore, hasMorePages, currentPage, executeSearch]);

  const handleCategoryChipPress = useCallback(
    (categoryId: number) => {
      const newCat = selectedCategory === categoryId ? null : categoryId;
      setSelectedCategory(newCat);
      if (searchState === "results") {
        setTimeout(() => {
          executeSearch(searchSubmittedQuery.current);
        }, 50);
      }
    },
    [selectedCategory, searchState, executeSearch],
  );

  // ─── Sort label ────────────────────────────────────────────────
  const sortLabel = useMemo(() => {
    const labels: Record<SortOption, string> = {
      relevance: t.search.relevance,
      price_asc: t.search.priceLowHigh,
      price_desc: t.search.priceHighLow,
      popular: t.search.mostPopular,
      newest: t.search.newest,
    };
    return labels[selectedSort];
  }, [selectedSort, t]);

  const hasSuggestions =
    suggestedProducts.length > 0 ||
    suggestedCategories.length > 0 ||
    suggestedOffers.length > 0;

  // ─── Render: Product result card ───────────────────────────────
  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.resultItem}>
        <ProductCard
          product={item}
          onPress={() => router.push(`/product/${item.barcode}` as any)}
        />
      </View>
    ),
    [],
  );

  // ─── Render: Suggestion Product Row ────────────────────────────
  const renderSuggestionProduct = useCallback(
    (product: SearchSuggestionProduct) => (
      <TouchableOpacity
        key={product.barcode}
        style={styles.suggestionRow}
        onPress={() => handleSuggestionProductPress(product.barcode)}
        activeOpacity={0.6}
      >
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.suggestionImage}
          />
        ) : (
          <View
            style={[styles.suggestionImage, styles.suggestionImagePlaceholder]}
          >
            <Ionicons
              name="cube-outline"
              size={20}
              color={Colors.neutralMedium}
            />
          </View>
        )}
        <View style={styles.suggestionTextContainer}>
          <Text style={styles.suggestionName} numberOfLines={1}>
            {getName({ name_en: product.name_en, name_ar: product.name_ar })}
          </Text>
          <View style={styles.suggestionPriceRow}>
            {product.sale_price ? (
              <>
                <Text style={styles.suggestionSalePrice}>
                  {product.sale_price.toFixed(2)} EGP
                </Text>
                <Text style={styles.suggestionOldPrice}>
                  {product.price.toFixed(2)}
                </Text>
              </>
            ) : (
              <Text style={styles.suggestionPrice}>
                {product.price.toFixed(2)} EGP
              </Text>
            )}
          </View>
        </View>
        <ChevronRight size={16} color={Colors.neutralMedium} />
      </TouchableOpacity>
    ),
    [getName, handleSuggestionProductPress],
  );

  // ═════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Header / Search Bar ──────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={Colors.neutralCharcoal} />
        </TouchableOpacity>

        <View style={styles.searchInputContainer}>
          <Search size={18} color={Colors.neutralMedium} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={t.common.searchPlaceholder}
            placeholderTextColor={Colors.neutralMedium}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={handleSubmitSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.clearIconCircle}>
                <X size={14} color={Colors.neutralWhite} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Category Filter Chips (Results Mode) ─────────────────── */}
      {searchState === "results" && categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryChipsBar}
          contentContainerStyle={styles.categoryChipsContent}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => handleCategoryChipPress(cat.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {getName(cat)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  STATE 1: IDLE — Recent + Popular + Categories            */}
      {/* ══════════════════════════════════════════════════════════ */}
      {searchState === "idle" && (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.idleContent}
        >
          {/* ── Recent Searches ──────────────────────────────────── */}
          {recentSearches.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionIconCircle}>
                    <Clock size={14} color={Colors.primary900} />
                  </View>
                  <Text style={styles.sectionTitle}>
                    {t.search.recentSearches}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={clearRecentSearches}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.clearText}>{t.search.clearAll}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsContainer}>
                {recentSearches.map((search, index) => (
                  <View key={`recent-${index}`} style={styles.recentChip}>
                    <TouchableOpacity
                      onPress={() => handleRecentSearchPress(search)}
                      style={styles.recentChipContent}
                    >
                      <Text style={styles.recentChipText}>{search}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeRecentSearch(search)}
                      style={styles.chipRemove}
                    >
                      <X size={12} color={Colors.neutralMedium} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Trending Now ─────────────────────────────────────── */}
          {popularData && popularData.trending_searches.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <View
                  style={[
                    styles.sectionIconCircle,
                    { backgroundColor: "#FFF7ED" },
                  ]}
                >
                  <Flame size={14} color={Colors.accentOrange} />
                </View>
                <Text style={styles.sectionTitle}>{t.search.trendingNow}</Text>
              </View>
              <View style={styles.trendingList}>
                {popularData.trending_searches
                  .slice(0, 5)
                  .map((item, index) => (
                    <TouchableOpacity
                      key={`trend-${index}`}
                      style={styles.trendingRow}
                      onPress={() => handleTrendingPress(item.term_en)}
                      activeOpacity={0.6}
                    >
                      <View style={styles.trendingRank}>
                        <Text
                          style={[
                            styles.trendingRankText,
                            index < 3 && styles.trendingRankTextTop,
                          ]}
                        >
                          {index + 1}
                        </Text>
                      </View>
                      <Text style={styles.trendingTermText} numberOfLines={1}>
                        {getName({
                          name_en: item.term_en,
                          name_ar: item.term_ar,
                        })}
                      </Text>
                      <ChevronRight size={14} color={Colors.neutralGray} />
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          )}

          {/* ── Top Categories ───────────────────────────────────── */}
          {popularData && popularData.top_categories.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <View
                  style={[
                    styles.sectionIconCircle,
                    { backgroundColor: Colors.primary100 },
                  ]}
                >
                  <Grid3x3 size={14} color={Colors.primary900} />
                </View>
                <Text style={styles.sectionTitle}>
                  {t.search.topCategories}
                </Text>
              </View>
              <View style={styles.topCategoriesGrid}>
                {popularData.top_categories.map((cat) => (
                  <TouchableOpacity
                    key={`topcat-${cat.id}`}
                    style={styles.topCategoryCard}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      executeSearch("");
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.topCategoryImageWrap}>
                      {cat.image ? (
                        <Image
                          source={{ uri: cat.image }}
                          style={styles.topCategoryImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.topCategoryImage,
                            styles.topCategoryPlaceholder,
                          ]}
                        >
                          <Grid3x3 size={22} color={Colors.neutralMedium} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.topCategoryName} numberOfLines={2}>
                      {getName({ name_en: cat.name_en, name_ar: cat.name_ar })}
                    </Text>
                    <Text style={styles.topCategoryCount}>
                      {cat.product_count} {t.search.products.toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Active Offers Banner ──────────────────────────────── */}
          {popularData && popularData.active_offers_count > 0 && (
            <TouchableOpacity
              style={styles.offersBanner}
              onPress={() => router.push("/(tabs)/offers" as any)}
              activeOpacity={0.7}
            >
              <View style={styles.offersBannerIcon}>
                <Percent size={22} color={Colors.neutralWhite} />
              </View>
              <View style={styles.offersBannerText}>
                <Text style={styles.offersBannerTitle}>
                  {popularData.active_offers_count} {t.search.activeOffers}
                </Text>
                <Text style={styles.offersBannerSubtitle}>
                  {t.search.seeAll} →
                </Text>
              </View>
              <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}

          {/* Loading */}
          {popularLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary900} />
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  STATE 2: TYPING — Typeahead Suggestions                  */}
      {/* ══════════════════════════════════════════════════════════ */}
      {searchState === "typing" && (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {suggestionsLoading && !hasSuggestions && (
            <View style={styles.suggestionsLoader}>
              <ActivityIndicator size="small" color={Colors.primary900} />
              <Text style={styles.suggestionsLoaderText}>
                {t.search.suggestions}...
              </Text>
            </View>
          )}

          {/* ── Suggested Products ────────────────────────────────── */}
          {suggestedProducts.length > 0 && (
            <View style={styles.suggestionSection}>
              <View style={styles.suggestionSectionHeader}>
                <Text style={styles.suggestionSectionTitle}>
                  {t.search.products}
                </Text>
                <TouchableOpacity onPress={handleSubmitSearch}>
                  <Text style={styles.seeAllText}>{t.search.seeAll}</Text>
                </TouchableOpacity>
              </View>
              {suggestedProducts.map(renderSuggestionProduct)}
            </View>
          )}

          {/* ── Suggested Categories ──────────────────────────────── */}
          {suggestedCategories.length > 0 && (
            <View style={styles.suggestionSection}>
              <Text style={styles.suggestionSectionTitle}>
                {t.search.categories}
              </Text>
              {suggestedCategories.map((cat) => (
                <TouchableOpacity
                  key={`sug-cat-${cat.id}`}
                  style={styles.suggestionRow}
                  onPress={() => handleSuggestionCategoryPress(cat.id)}
                  activeOpacity={0.6}
                >
                  {cat.image ? (
                    <Image
                      source={{ uri: cat.image }}
                      style={styles.suggestionImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.suggestionImage,
                        styles.suggestionImagePlaceholder,
                      ]}
                    >
                      <Grid3x3 size={20} color={Colors.neutralMedium} />
                    </View>
                  )}
                  <View style={styles.suggestionTextContainer}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {getName({ name_en: cat.name_en, name_ar: cat.name_ar })}
                    </Text>
                    <Text style={styles.suggestionMeta}>
                      {cat.product_count} {t.search.products.toLowerCase()}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={Colors.neutralMedium} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Suggested Offers ──────────────────────────────────── */}
          {suggestedOffers.length > 0 && (
            <View style={styles.suggestionSection}>
              <Text style={styles.suggestionSectionTitle}>
                {t.search.offers}
              </Text>
              {suggestedOffers.map((offer) => (
                <TouchableOpacity
                  key={`sug-offer-${offer.id}`}
                  style={styles.suggestionRow}
                  onPress={() =>
                    router.push(`/categories/promotion/${offer.id}` as any)
                  }
                  activeOpacity={0.6}
                >
                  <View style={[styles.suggestionImage, styles.offerIconBg]}>
                    <Tag size={20} color={Colors.neutralWhite} />
                  </View>
                  <View style={styles.suggestionTextContainer}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {getName({
                        name_en: offer.title_en,
                        name_ar: offer.title_ar,
                      })}
                    </Text>
                    <Text style={styles.offerDiscount}>
                      {offer.discount_type === "percentage"
                        ? `${offer.discount_value}% OFF`
                        : `${offer.discount_value} EGP OFF`}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={Colors.neutralMedium} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* No suggestions found */}
          {!suggestionsLoading &&
            !hasSuggestions &&
            searchQuery.trim().length >= 2 && (
              <View style={styles.noSuggestionsContainer}>
                <View style={styles.noSuggestionsIcon}>
                  <Search size={28} color={Colors.neutralMedium} />
                </View>
                <Text style={styles.noSuggestionsText}>
                  {t.search.noResults}
                </Text>
                <TouchableOpacity
                  style={styles.searchAnywayButton}
                  onPress={handleSubmitSearch}
                >
                  <Search size={16} color={Colors.neutralWhite} />
                  <Text style={styles.searchAnywayText}>
                    {t.search.searchResults}: "{searchQuery.trim()}"
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  STATE 3: RESULTS — Full Product Grid                     */}
      {/* ══════════════════════════════════════════════════════════ */}
      {searchState === "results" && (
        <View style={styles.resultsContainer}>
          {/* Results Header — single toolbar with count + sort */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {resultsLoading
                ? "..."
                : `${totalResults} ${t.search.resultsFor} "${searchSubmittedQuery.current || t.search.categories}"`}
            </Text>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setShowSortSheet(!showSortSheet)}
            >
              <SlidersHorizontal size={14} color={Colors.primary900} />
              <Text style={styles.sortText}>{sortLabel}</Text>
            </TouchableOpacity>
          </View>

          {/* Sort Dropdown */}
          {showSortSheet && (
            <View style={styles.sortDropdown}>
              {SORT_OPTIONS.map((opt) => {
                const labels: Record<SortOption, string> = {
                  relevance: t.search.relevance,
                  price_asc: t.search.priceLowHigh,
                  price_desc: t.search.priceHighLow,
                  popular: t.search.mostPopular,
                  newest: t.search.newest,
                };
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.sortOption,
                      selectedSort === opt.key && styles.sortOptionActive,
                    ]}
                    onPress={() => handleSortSelect(opt.key)}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        selectedSort === opt.key && styles.sortOptionTextActive,
                      ]}
                    >
                      {labels[opt.key]}
                    </Text>
                    {selectedSort === opt.key && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={Colors.primary900}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Results Grid */}
          {resultsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary900} />
              <Text style={styles.loadingText}>
                {t.search.searchResults}...
              </Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderProduct}
              keyExtractor={(item) =>
                (item.barcode || item.id)?.toString() ||
                Math.random().toString()
              }
              numColumns={2}
              contentContainerStyle={styles.resultsGrid}
              columnWrapperStyle={styles.resultRow}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color={Colors.primary900} />
                  </View>
                ) : null
              }
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="search-outline"
                  size={40}
                  color={Colors.neutralMedium}
                />
              </View>
              <Text style={styles.emptyTitle}>{t.search.noResults}</Text>
              <Text style={styles.emptyText}>{t.search.tryDifferent}</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    backgroundColor: Colors.neutralWhite,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    height: 44,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    fontFamily: "Poppins_400Regular",
    paddingVertical: 0,
  },
  clearIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.neutralMedium,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Category Chips Bar ────────────────────────────────────────
  categoryChipsBar: {
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutralGray,
    maxHeight: 52,
  },
  categoryChipsContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.neutralGray,
    backgroundColor: Colors.neutralWhite,
    marginRight: 4,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary900,
    borderColor: Colors.primary900,
  },
  categoryChipText: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
  },
  categoryChipTextActive: {
    color: Colors.neutralWhite,
  },

  // ── Content ───────────────────────────────────────────────────
  content: {
    flex: 1,
  },
  idleContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },

  // ── Section Cards (Idle State) ─────────────────────────────────
  sectionCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
  },
  clearText: {
    fontSize: Typography.bodySmall,
    color: Colors.accentRed,
    fontFamily: "Poppins_600SemiBold",
  },

  // ── Recent Search Chips ───────────────────────────────────────
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralLight,
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: Spacing.sm,
    paddingRight: 4,
    gap: 4,
  },
  recentChipContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  recentChipText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralCharcoal,
    fontFamily: "Poppins_400Regular",
  },
  chipRemove: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Trending List ─────────────────────────────────────────────
  trendingList: {
    gap: 2,
  },
  trendingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  trendingRank: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
  },
  trendingRankText: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralMedium,
  },
  trendingRankTextTop: {
    color: Colors.accentOrange,
  },
  trendingTermText: {
    flex: 1,
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralCharcoal,
  },

  // ── Top Categories Grid ───────────────────────────────────────
  topCategoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "space-between",
  },
  topCategoryCard: {
    width: (width - Spacing.md * 2 - Spacing.md * 2 - Spacing.sm * 2) / 3,
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  topCategoryImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.neutralLight,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  topCategoryImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  topCategoryPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  topCategoryName: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
    textAlign: "center",
    lineHeight: 16,
  },
  topCategoryCount: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
  },

  // ── Offers Banner ─────────────────────────────────────────────
  offersBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primary900,
    borderRadius: 16,
    gap: Spacing.sm,
  },
  offersBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  offersBannerText: {
    flex: 1,
  },
  offersBannerTitle: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralWhite,
  },
  offersBannerSubtitle: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },

  // ── Suggestions (Typing State) ────────────────────────────────
  suggestionsLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  suggestionsLoaderText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
  },
  suggestionSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutralGray,
  },
  suggestionSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  suggestionSectionTitle: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralMedium,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  seeAllText: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary900,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  suggestionImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.neutralLight,
  },
  suggestionImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionName: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
  },
  suggestionMeta: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    marginTop: 1,
  },
  suggestionPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 1,
  },
  suggestionPrice: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
  },
  suggestionSalePrice: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_700Bold",
    color: Colors.accentRed,
  },
  suggestionOldPrice: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    textDecorationLine: "line-through",
  },
  offerIconBg: {
    backgroundColor: Colors.accentOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  offerDiscount: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_700Bold",
    color: Colors.accentOrange,
    marginTop: 1,
  },
  noSuggestionsContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  noSuggestionsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  noSuggestionsText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
  },
  searchAnywayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  searchAnywayText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralWhite,
  },

  // ── Results (Results State) ───────────────────────────────────
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutralGray,
  },
  resultsCount: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    fontFamily: "Poppins_400Regular",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.primary100,
    borderRadius: 8,
  },
  sortText: {
    fontSize: Typography.bodySmall,
    color: Colors.primary900,
    fontFamily: "Poppins_600SemiBold",
  },

  // ── Sort Dropdown ─────────────────────────────────────────────
  sortDropdown: {
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutralGray,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutralLight,
  },
  sortOptionActive: {
    borderBottomColor: Colors.primary100,
  },
  sortOptionText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralCharcoal,
  },
  sortOptionTextActive: {
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary900,
  },

  // ── Results Grid ──────────────────────────────────────────────
  resultsGrid: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },
  resultRow: {
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  resultItem: {
    width: CARD_WIDTH,
  },

  // ── Loading / Empty ───────────────────────────────────────────
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
  loadingMoreContainer: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.h4,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
    lineHeight: 20,
  },
});
