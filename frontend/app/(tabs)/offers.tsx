import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Animated,
  Dimensions,
  TextInput,
  InteractionManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Clock, ChevronRight, AlertCircle } from "lucide-react-native";
import { useResponsive } from "@/hooks/useResponsive";
import { CountdownTimer } from "@/components/CountdownTimer";
import type { Promotion } from "@/types/promotion";
import { getPromotions } from "@/services/api/promotionApi";
import Colors from "@/constants/Colors";
import Spacing from "@/constants/Spacing";
import { useTranslation, useLocalizedValue } from "@/i18n";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import OfflineIndicator from "@/components/OfflineIndicator";

type FilterType = "all" | "category" | "products";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function OffersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { getName, getDescription } = useLocalizedValue();
  const { wp, hp, isSmallDevice, isLargeDevice } = useResponsive();

  const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [featuredPromotion, setFeaturedPromotion] = useState<Promotion | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Start pulse animation for featured badge
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Load promotions on mount (after navigation animation)
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadPromotions();
    });
    return () => task.cancel();
  }, []);

  // Filter promotions dynamically
  useEffect(() => {
    filterPromotions(filter);
  }, [filter, allPromotions, searchQuery]);

  // Animate content when loading completes
  useEffect(() => {
    if (!loading && !error) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, error]);

  const filterPromotions = (currentFilter: FilterType) => {
    let filtered = allPromotions;

    // Filter by type
    if (currentFilter !== "all") {
      filtered = allPromotions.filter(
        (p: Promotion) => p.applies_to === currentFilter,
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p: Promotion) =>
          p.title?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query),
      );
    }

    const featured = filtered.find((p: Promotion) => p.is_featured);
    if (featured) {
      setFeaturedPromotion(featured);
      setPromotions(filtered.filter((p: Promotion) => p.id !== featured.id));
    } else if (filtered.length > 0) {
      setFeaturedPromotion(filtered[0]);
      setPromotions(filtered.slice(1));
    } else {
      setFeaturedPromotion(null);
      setPromotions([]);
    }
  };

  const loadPromotions = async () => {
    try {
      setLoading(true);
      setError(null);
      fadeAnim.setValue(0);
      slideAnim.setValue(30);

      const response = await getPromotions({});
      if (response.success) {
        const fetchedPromotions = response.data.promotions || [];
        setAllPromotions(fetchedPromotions);
      } else {
        setError("Unable to load offers at the moment");
      }
    } catch (err: any) {
      console.error("Failed to load promotions:", err);
      setError(err.message || "Unable to load offers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPromotions();
    setRefreshing(false);
  }, []);

  const navigateToPromotion = (id: number) => {
    router.push(`/promotions/${id}` as any);
  };

  // Dynamic styles
  const dynamicStyles = StyleSheet.create({
    heroCard: {
      marginHorizontal: 16,
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 20,
      shadowColor: Colors.primary900,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    heroImage: {
      width: "100%",
      height: isSmallDevice ? 180 : 220,
    },
    heroOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
    },
    promotionCard: {
      backgroundColor: Colors.neutralWhite,
      borderRadius: 18,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    cardImage: {
      width: "100%",
      height: isSmallDevice ? 100 : 120,
      backgroundColor: Colors.neutralLight,
    },
  });

  // Filter Chip Component
  const FilterChip = ({
    label,
    value,
    iconName,
  }: {
    label: string;
    value: FilterType;
    iconName: keyof typeof Ionicons.glyphMap;
  }) => {
    const isActive = filter === value;
    return (
      <TouchableOpacity
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => setFilter(value)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={iconName}
          size={16}
          color={isActive ? Colors.neutralWhite : Colors.neutralMedium}
        />
        <Text
          style={[
            styles.filterChipText,
            isActive && styles.filterChipTextActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Offer Card Component
  const OfferCard = ({
    promotion,
    index,
  }: {
    promotion: Promotion;
    index: number;
  }) => {
    const getDiscountText = () => {
      if (promotion.discount_type === "percentage") {
        return `${promotion.discount_value}%`;
      } else if (promotion.discount_type === "fixed") {
        return `${promotion.discount_value} EGP`;
      }
      return "OFFER";
    };

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 30],
                outputRange: [0, 30 + index * 8],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity
          style={dynamicStyles.promotionCard}
          onPress={() => navigateToPromotion(promotion.id)}
          activeOpacity={0.85}
        >
          <View>
            <Image
              source={{
                uri: promotion.image_url || promotion.banner_image_url,
              }}
              style={dynamicStyles.cardImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[Colors.primary900, Colors.primary700]}
              style={styles.discountBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="flash" size={12} color={Colors.neutralWhite} />
              <Text style={styles.discountText}>{getDiscountText()}</Text>
            </LinearGradient>
            {promotion.is_featured && (
              <Animated.View
                style={[
                  styles.featuredTag,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Ionicons name="star" size={10} color={Colors.accentYellow} />
              </Animated.View>
            )}
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {promotion.title}
            </Text>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {promotion.description || "Exclusive offer - Don't miss out!"}
            </Text>
            {promotion.end_date && (
              <View style={styles.timerRow}>
                <View style={styles.timerIconBg}>
                  <Clock size={10} color={Colors.accentOrange} />
                </View>
                <CountdownTimer endDate={promotion.end_date} compact />
              </View>
            )}
            <View style={styles.viewDealButton}>
              <Text style={styles.viewDealText}>{"View Deal"}</Text>
              <ChevronRight size={14} color={Colors.primary900} />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Error State
  if (error && !loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <OfflineIndicator />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconBg}>
            <AlertCircle size={48} color={Colors.accentRed} />
          </View>
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary900, Colors.primary700]}
              style={styles.retryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="refresh" size={18} color={Colors.neutralWhite} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading State
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <OfflineIndicator />
        <View style={styles.header}>
          <LinearGradient
            colors={[Colors.primary900, Colors.primary800]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerTop}>
              <View style={styles.brandContainer}>
                <View style={styles.brandIcon}>
                  <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
                </View>
                <Text style={styles.brandName}>
                  {t.nav?.offers || "Offers"}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ padding: 16 }}>
            <SkeletonLoader width="100%" height={200} borderRadius={20} />
            <View style={{ height: 20 }} />
            <SkeletonLoader width="100%" height={180} borderRadius={18} />
            <View style={{ height: 14 }} />
            <SkeletonLoader width="100%" height={180} borderRadius={18} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineIndicator />

      {/* ═══════════════════════════════════════════════════════════════════════════
          BRANDED HEADER
      ═══════════════════════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <LinearGradient
          colors={[Colors.primary900, Colors.primary800]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View style={styles.brandContainer}>
              <View style={styles.brandIcon}>
                <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
              </View>
              <Text style={styles.brandName}>{t.nav?.offers || "Offers"}</Text>
            </View>

            <View style={styles.offersCountBadge}>
              <Ionicons name="gift" size={14} color={Colors.neutralWhite} />
              <Text style={styles.offersCountText}>
                {allPromotions.length} {t.offers?.deals || "Deals"}
              </Text>
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.headerTitle}>
              {t.offers?.specialOffers || "Special Offers"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t.offers?.exclusiveDeals ||
                "Discover amazing deals & exclusive discounts"}
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.neutralMedium} />
            <TextInput
              style={styles.searchInput}
              placeholder={"Search offers..."}
              placeholderTextColor={Colors.neutralMedium}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={Colors.neutralMedium}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            <FilterChip
              label={t.offers?.allOffers || "All"}
              value="all"
              iconName="pricetags"
            />
            <FilterChip
              label={t.nav?.categories || "Categories"}
              value="category"
              iconName="grid"
            />
            <FilterChip
              label={t.offers?.products || "Products"}
              value="products"
              iconName="cube"
            />
          </ScrollView>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary900]}
            tintColor={Colors.primary900}
          />
        }
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* ═══════════════════════════════════════════════════════════════════════════
              FEATURED HERO CARD
          ═══════════════════════════════════════════════════════════════════════════ */}
          {featuredPromotion && (
            <TouchableOpacity
              style={dynamicStyles.heroCard}
              onPress={() => navigateToPromotion(featuredPromotion.id)}
              activeOpacity={0.92}
            >
              <Image
                source={{
                  uri:
                    featuredPromotion.banner_image_url ||
                    featuredPromotion.image_url,
                }}
                style={dynamicStyles.heroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.85)"]}
                style={dynamicStyles.heroOverlay}
              >
                <View style={styles.heroBadgeRow}>
                  <Animated.View
                    style={[
                      styles.heroBadge,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  >
                    <Ionicons
                      name="sparkles"
                      size={12}
                      color={Colors.accentYellow}
                    />
                    <Text style={styles.heroBadgeText}>
                      {t.offers?.featuredDeal || "Featured"}
                    </Text>
                  </Animated.View>
                  {featuredPromotion.discount_type === "percentage" && (
                    <View style={styles.heroDiscountBadge}>
                      <Text style={styles.heroDiscountText}>
                        {featuredPromotion.discount_value}% OFF
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {featuredPromotion.title}
                </Text>
                <Text style={styles.heroSubtitle} numberOfLines={1}>
                  {featuredPromotion.description ||
                    "Don't miss this exclusive offer!"}
                </Text>
                {featuredPromotion.end_date && (
                  <View style={styles.heroTimer}>
                    <Clock size={14} color={Colors.neutralWhite} />
                    <CountdownTimer
                      endDate={featuredPromotion.end_date}
                      compact
                      light
                    />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════════
              MORE OFFERS SECTION
          ═══════════════════════════════════════════════════════════════════════════ */}
          {promotions.length > 0 && (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="flame" size={18} color={Colors.accentOrange} />
                <Text style={styles.sectionTitle}>
                  {t.offers?.moreOffers || "More Offers"}
                </Text>
              </View>
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>
                  {promotions.length} {t.offers?.deals || "deals"}
                </Text>
              </View>
            </View>
          )}

          {/* Promotions List */}
          <View style={styles.promotionsList}>
            {promotions.map((promotion, index) => (
              <View key={promotion.id} style={styles.promotionItem}>
                <OfferCard promotion={promotion} index={index} />
              </View>
            ))}
          </View>

          {/* Empty State */}
          {!featuredPromotion && promotions.length === 0 && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="gift" size={56} color={Colors.primary900} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? "No offers found"
                  : t.offers?.noOffers || "No Offers Available"}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "Try a different search term"
                  : "Check back soon for amazing deals!"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={handleRefresh}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[Colors.primary900, Colors.primary700]}
                    style={styles.refreshButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons
                      name="refresh"
                      size={18}
                      color={Colors.neutralWhite}
                    />
                    <Text style={styles.refreshButtonText}>Refresh</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  scrollView: {
    flex: 1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  header: {
    overflow: "hidden",
  },
  headerGradient: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  brandName: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    letterSpacing: 0.3,
  },
  offersCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  offersCountText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },
  titleSection: {
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "rgba(255,255,255,0.8)",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH BAR
  // ═══════════════════════════════════════════════════════════════════════════
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralCharcoal,
    padding: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER CHIPS
  // ═══════════════════════════════════════════════════════════════════════════
  filterContainer: {
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.neutralWhite,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "rgba(255,255,255,0.8)",
  },
  filterChipTextActive: {
    color: Colors.primary900,
    fontFamily: "Poppins-SemiBold",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO CARD
  // ═══════════════════════════════════════════════════════════════════════════
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },
  heroDiscountBadge: {
    backgroundColor: Colors.accentRed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroDiscountText: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 10,
  },
  heroTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
  },
  sectionCount: {
    backgroundColor: Colors.primary100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: Colors.primary900,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMOTION CARDS
  // ═══════════════════════════════════════════════════════════════════════════
  promotionsList: {
    paddingHorizontal: 16,
  },
  promotionItem: {
    marginBottom: 14,
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  discountText: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },
  featuredTag: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    lineHeight: 17,
    marginBottom: 10,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  timerIconBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accentOrange + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  viewDealButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary100,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  viewDealText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: Colors.primary900,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY & ERROR STATES
  // ═══════════════════════════════════════════════════════════════════════════
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    marginBottom: 24,
  },
  refreshButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  refreshButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  errorIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.accentRed + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  retryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },
});
