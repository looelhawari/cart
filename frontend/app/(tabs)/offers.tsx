import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Tag,
  Percent,
  Clock,
  Gift,
  Sparkles,
  ChevronRight,
  Flame,
  TrendingUp,
} from "lucide-react-native";
import { useResponsive } from "@/hooks/useResponsive";
import { CountdownTimer } from "@/components/CountdownTimer";
import type { Promotion } from "@/types/promotion";
import { getPromotions } from "@/services/api/promotionApi";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { useTranslation, useLocalizedValue } from "@/i18n";

type FilterType = "all" | "category" | "products";

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

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  // Load promotions once on mount
  useEffect(() => {
    loadPromotions();
  }, []);

  // Filter promotions dynamically without reload
  useEffect(() => {
    filterPromotions(filter);
  }, [filter, allPromotions]);

  useEffect(() => {
    if (!loading) {
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
  }, [loading]);

  const filterPromotions = (currentFilter: FilterType) => {
    let filtered = allPromotions;

    // Filter by type if not 'all'
    if (currentFilter !== "all") {
      filtered = allPromotions.filter(
        (p: Promotion) =>
          p.applies_to === currentFilter || p.type === currentFilter,
      );
    }

    // Find featured promotion
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
      fadeAnim.setValue(0);
      slideAnim.setValue(30);

      const response = await getPromotions({});
      if (response.success) {
        const fetchedPromotions = response.data.promotions || [];
        setAllPromotions(fetchedPromotions);
      }
    } catch (error) {
      console.error("Failed to load promotions:", error);
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

  // Dynamic styles based on screen size
  const dynamicStyles = StyleSheet.create({
    heroCard: {
      marginHorizontal: wp(4),
      borderRadius: isSmallDevice ? 16 : 20,
      overflow: "hidden",
      marginBottom: Spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    heroImage: {
      width: "100%",
      height: isSmallDevice ? hp(22) : hp(28),
    },
    heroOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
    },
    heroTitle: {
      fontSize: isSmallDevice ? Typography.h4 : Typography.h3,
      fontWeight: Typography.bold,
      color: Colors.neutralWhite,
      marginBottom: Spacing.xs,
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    heroSubtitle: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      color: Colors.neutralWhite,
      opacity: 0.9,
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: wp(4) - Spacing.xs,
    },
    gridItem: {
      width: isLargeDevice ? "50%" : "100%",
      padding: Spacing.xs,
    },
    promotionCard: {
      backgroundColor: Colors.neutralWhite,
      borderRadius: isSmallDevice ? 12 : 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    cardImage: {
      width: "100%",
      height: isSmallDevice ? 120 : 140,
      backgroundColor: Colors.neutralLight,
    },
    cardContent: {
      padding: isSmallDevice ? Spacing.sm : Spacing.md,
    },
    discountBadge: {
      position: "absolute",
      top: Spacing.sm,
      right: Spacing.sm,
      backgroundColor: Colors.accentRed,
      paddingVertical: 4,
      paddingHorizontal: isSmallDevice ? 8 : 12,
      borderRadius: 8,
    },
    discountText: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      fontWeight: Typography.bold,
      color: Colors.neutralWhite,
    },
    cardTitle: {
      fontSize: isSmallDevice ? Typography.bodyMedium : Typography.bodyLarge,
      fontWeight: Typography.semibold,
      color: Colors.neutralCharcoal,
      marginBottom: 4,
    },
    cardDescription: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      color: Colors.neutralMedium,
      lineHeight: isSmallDevice ? 16 : 18,
    },
    statsCard: {
      width: isLargeDevice ? wp(28) : wp(26),
      marginRight: Spacing.sm,
    },
  });

  // Filter button component
  const FilterChip = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: FilterType;
    icon: React.ComponentType<any>;
  }) => (
    <TouchableOpacity
      style={[styles.filterChip, filter === value && styles.filterChipActive]}
      onPress={() => setFilter(value)}
      activeOpacity={0.7}
    >
      <Icon
        size={isSmallDevice ? 14 : 16}
        color={filter === value ? Colors.primary900 : Colors.neutralMedium}
      />
      <Text
        style={[
          styles.filterChipText,
          filter === value && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Quick stats cards
  const StatCard = ({
    icon: Icon,
    value,
    label,
    color,
  }: {
    icon: React.ComponentType<any>;
    value: string;
    label: string;
    color: string;
  }) => (
    <View
      style={[
        dynamicStyles.statsCard,
        styles.statCard,
        { borderLeftColor: color },
      ]}
    >
      <View
        style={[styles.statIconContainer, { backgroundColor: color + "15" }]}
      >
        <Icon size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // Promotion card component
  const OfferCard = ({ promotion }: { promotion: Promotion }) => {
    const getDiscountText = () => {
      if (promotion.discount_type === "percentage") {
        return `${promotion.discount_value}% OFF`;
      } else if (promotion.discount_type === "fixed") {
        return `${promotion.discount_value} EGP OFF`;
      }
      return "Special Offer";
    };

    return (
      <TouchableOpacity
        style={dynamicStyles.promotionCard}
        onPress={() => navigateToPromotion(promotion.id)}
        activeOpacity={0.8}
      >
        <View>
          <Image
            source={{ uri: promotion.image_url }}
            style={dynamicStyles.cardImage}
            resizeMode="cover"
          />
          <View style={dynamicStyles.discountBadge}>
            <Text style={dynamicStyles.discountText}>{getDiscountText()}</Text>
          </View>
          {promotion.is_featured && (
            <View style={styles.featuredTag}>
              <Sparkles size={12} color={Colors.accentYellow} />
              <Text style={styles.featuredTagText}>Featured</Text>
            </View>
          )}
        </View>
        <View style={dynamicStyles.cardContent}>
          <Text style={dynamicStyles.cardTitle} numberOfLines={1}>
            {promotion.title}
          </Text>
          <Text style={dynamicStyles.cardDescription} numberOfLines={2}>
            {promotion.description}
          </Text>
          {promotion.end_date && (
            <View style={styles.timerRow}>
              <Clock size={12} color={Colors.accentOrange} />
              <CountdownTimer endDate={promotion.end_date} compact />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconContainer}>
            <Tag size={40} color={Colors.primary900} />
          </View>
          <ActivityIndicator
            size="large"
            color={Colors.primary900}
            style={{ marginTop: Spacing.lg }}
          />
          <Text style={styles.loadingText}>{t.offers.findingDeals}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
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
        {/* Header Section */}
        <LinearGradient
          colors={[Colors.primary900, Colors.primary800]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerIconBg}>
              <Gift
                size={isSmallDevice ? 24 : 28}
                color={Colors.neutralWhite}
              />
            </View>
            <Text
              style={[
                styles.headerTitle,
                isSmallDevice && { fontSize: Typography.h3 },
              ]}
            >
              {t.offers.specialOffers}
            </Text>
            <Text style={styles.headerSubtitle}>{t.offers.exclusiveDeals}</Text>
          </View>

          {/* Decorative elements */}
          <View style={styles.headerDecor1} />
          <View style={styles.headerDecor2} />
        </LinearGradient>

        {/* Quick Stats */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsContainer}
        >
          <StatCard
            icon={Flame}
            value={`${promotions.length + (featuredPromotion ? 1 : 0)}`}
            label={t.offers.activeOffers}
            color={Colors.accentRed}
          />
          <StatCard
            icon={Percent}
            value={t.offers.upTo50}
            label={t.offers.maxDiscount}
            color={Colors.primary900}
          />
          <StatCard
            icon={TrendingUp}
            value={t.offers.limited}
            label={t.offers.timeDeals}
            color={Colors.accentOrange}
          />
        </ScrollView>

        {/* Filter Chips */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>{t.offers.browseByType}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            <FilterChip label={t.offers.allOffers} value="all" icon={Tag} />
            <FilterChip
              label={t.nav.categories}
              value="category"
              icon={Sparkles}
            />
            <FilterChip
              label={t.offers.products}
              value="products"
              icon={Gift}
            />
          </ScrollView>
        </View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Featured Hero Card */}
          {featuredPromotion && (
            <TouchableOpacity
              style={dynamicStyles.heroCard}
              onPress={() => navigateToPromotion(featuredPromotion.id)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: featuredPromotion.image_url }}
                style={dynamicStyles.heroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)"]}
                style={dynamicStyles.heroOverlay}
              >
                <View style={styles.heroBadge}>
                  <Sparkles size={14} color={Colors.accentYellow} />
                  <Text style={styles.heroBadgeText}>
                    {t.offers.featuredDeal}
                  </Text>
                </View>
                <Text style={dynamicStyles.heroTitle} numberOfLines={2}>
                  {featuredPromotion.title}
                </Text>
                <Text style={dynamicStyles.heroSubtitle} numberOfLines={1}>
                  {featuredPromotion.description}
                </Text>
                {featuredPromotion.end_date && (
                  <View style={styles.heroTimer}>
                    <Clock size={14} color={Colors.neutralWhite} />
                    <Text style={styles.heroTimerText}>
                      {t.offers.endsSoon}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Section Title */}
          {promotions.length > 0 && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.offers.moreOffers}</Text>
              <Text style={styles.sectionCount}>
                {promotions.length} {t.offers.deals}
              </Text>
            </View>
          )}

          {/* Promotions Grid */}
          {promotions.length > 0 ? (
            <View style={dynamicStyles.gridContainer}>
              {promotions.map((promotion) => (
                <View key={promotion.id} style={dynamicStyles.gridItem}>
                  <OfferCard promotion={promotion} />
                </View>
              ))}
            </View>
          ) : !featuredPromotion ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Gift size={48} color={Colors.neutralGray} />
              </View>
              <Text style={styles.emptyTitle}>No Offers Available</Text>
              <Text style={styles.emptyText}>
                Check back soon for amazing deals and exclusive promotions!
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefresh}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </Animated.View>

        {/* Bottom Spacing */}
        <View style={{ height: Spacing.xxxl }} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary900 + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
  },

  // Header
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    position: "relative",
    overflow: "hidden",
  },
  headerContent: {
    zIndex: 10,
  },
  headerIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralWhite,
    opacity: 0.85,
  },
  headerDecor1: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerDecor2: {
    position: "absolute",
    bottom: -50,
    right: 50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  // Stats
  statsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  statCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 12,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  statLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 2,
  },

  // Filters
  filterSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 24,
    backgroundColor: Colors.neutralWhite,
    borderWidth: 1.5,
    borderColor: Colors.neutralGray,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary100,
    borderColor: Colors.primary900,
  },
  filterChipText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    fontWeight: Typography.medium,
  },
  filterChipTextActive: {
    color: Colors.primary900,
    fontWeight: Typography.semibold,
  },

  // Hero
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: Spacing.sm,
  },
  heroBadgeText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralWhite,
    fontWeight: Typography.semibold,
  },
  heroTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.sm,
  },
  heroTimerText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralWhite,
    fontWeight: Typography.medium,
  },

  // Cards
  featuredTag: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  featuredTagText: {
    fontSize: 10,
    color: Colors.accentYellow,
    fontWeight: Typography.bold,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.sm,
  },

  // Section
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  sectionCount: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    backgroundColor: Colors.neutralLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  refreshButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: 24,
  },
  refreshButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralWhite,
  },
});
