import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronRight,
  Clock,
  Sparkles,
  Tag,
  Truck,
  Gift,
} from "lucide-react-native";
import type { Promotion } from "@/types/promotion";
import {
  getFeaturedPromotion,
  getPromotions,
} from "@/services/api/promotionApi";
import { getOffers } from "@/services/api/offersApi";
import type { Offer } from "@/services/api/types";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { useTranslation } from "@/i18n";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;
const CARD_HEIGHT = 180;

// Unified slide item: either a promotion or a promo code offer
type SlideItem =
  | { kind: "promotion"; data: Promotion }
  | { kind: "offer"; data: Offer };

export const HeroBanner: React.FC = () => {
  const { t } = useTranslation();
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const allSlides: SlideItem[] = [];

      // 1. Load ALL active promotions (featured first, then remaining)
      try {
        const seenIds = new Set<number>();

        // Add featured promotions first
        const featuredResponse = await getFeaturedPromotion();
        if (featuredResponse.success && featuredResponse.data?.promotions) {
          featuredResponse.data.promotions
            .filter((promo: Promotion) => promo)
            .forEach((p: Promotion) => {
              seenIds.add(p.id);
              allSlides.push({ kind: "promotion", data: p });
            });
        }

        // Then add remaining promotions (avoid duplicates)
        const response = await getPromotions();
        if (response.success) {
          response.data.promotions
            .filter(
              (promo: Promotion | null) => promo && !seenIds.has(promo!.id),
            )
            .forEach((p: Promotion) =>
              allSlides.push({ kind: "promotion", data: p }),
            );
        }
      } catch (err) {
        console.error("Failed to load promotions:", err);
      }

      // 2. Load ALL active offers (not just promo code ones)
      try {
        const offersResponse = await getOffers({ status: "active" });
        if (offersResponse.success && offersResponse.data?.offers) {
          const activeOffers = offersResponse.data.offers.filter(
            (o) => o.is_active,
          );
          activeOffers.forEach((o) =>
            allSlides.push({ kind: "offer", data: o }),
          );
        }
      } catch (err) {
        console.error("Failed to load promo code offers:", err);
      }

      setSlides(allSlides);
    } catch (error) {
      console.error("Failed to load deals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % slides.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * width,
          animated: true,
        });
        return nextIndex;
      });
    }, 5000); // Auto-scroll every 5 seconds

    return () => clearInterval(interval);
  }, [slides.length]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary900} />
      </View>
    );
  }

  const getDiscountText = (promotion: Promotion) => {
    if (promotion.discount_type === "percentage") {
      return `${promotion.discount_value}% ${t.products.off}`;
    } else if (promotion.discount_type === "fixed") {
      return `${promotion.discount_value} ${t.ui.egpOff}`;
    }
    return t.ui.specialOfferBanner;
  };

  const getOfferDiscountText = (offer: Offer) => {
    switch (offer.type) {
      case "percentage":
        return `${offer.value}% ${t.products.off}`;
      case "fixed_amount":
        return `${offer.value} ${t.ui.egpOff}`;
      case "free_delivery":
        return t.ui.freeDeliveryUpper;
      case "bogo":
        return t.ui.buyOneGetOneBadge;
      default:
        return t.ui.specialOfferBanner;
    }
  };

  const getOfferGradient = (type: Offer["type"]): readonly [string, string] => {
    switch (type) {
      case "percentage":
        return ["#7C3AED", "#4C1D95"] as const;
      case "fixed_amount":
        return [Colors.primary700, Colors.primary900] as const;
      case "free_delivery":
        return ["#0EA5E9", "#0369A1"] as const;
      case "bogo":
        return ["#EC4899", "#BE185D"] as const;
      default:
        return [Colors.primary700, Colors.primary900] as const;
    }
  };

  const getOfferIcon = (type: Offer["type"]) => {
    switch (type) {
      case "free_delivery":
        return (
          <Truck size={40} color={Colors.neutralWhite} strokeWidth={1.5} />
        );
      case "bogo":
        return <Gift size={40} color={Colors.neutralWhite} strokeWidth={1.5} />;
      default:
        return <Tag size={40} color={Colors.neutralWhite} strokeWidth={1.5} />;
    }
  };

  const renderSlide = (slide: SlideItem, index: number) => {
    if (slide.kind === "promotion") {
      const promotion = slide.data;

      // Promotion without image — render gradient card like offers
      if (!promotion.image_url) {
        const promoGradient: readonly [string, string] =
          promotion.discount_type === "percentage"
            ? (["#7C3AED", "#4C1D95"] as const)
            : (["#F97316", "#C2410C"] as const);

        return (
          <TouchableOpacity
            key={`promo-${promotion.id}`}
            style={styles.slide}
            onPress={() => router.push(`/promotions/${promotion.id}` as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={promoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.offerSlideGradient}
            >
              <View style={styles.offerSlideContent}>
                <View style={styles.offerSlideLeft}>
                  <View style={styles.offerCodeBadge}>
                    <Sparkles size={12} color={Colors.neutralWhite} />
                    <Text style={styles.offerCodeText}>
                      {getDiscountText(promotion)}
                    </Text>
                  </View>
                  <Text style={styles.offerSlideTitle} numberOfLines={2}>
                    {promotion.title}
                  </Text>
                  <Text style={styles.offerSlideSubtitle} numberOfLines={1}>
                    {promotion.description}
                  </Text>
                  {promotion.end_date && (
                    <View style={styles.timerRow}>
                      <Clock size={12} color={Colors.neutralWhite} />
                      <Text style={styles.timerText}>
                        {t.ui.limitedTimeOnly}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.offerSlideRight}>
                  <Sparkles
                    size={40}
                    color={Colors.neutralWhite}
                    strokeWidth={1.5}
                  />
                  <View style={styles.offerDiscountCircle}>
                    <Text style={styles.offerDiscountValue}>
                      {promotion.discount_type === "percentage"
                        ? `${promotion.discount_value}%`
                        : `${promotion.discount_value}`}
                    </Text>
                    {promotion.discount_type === "fixed" && (
                      <Text style={styles.offerDiscountUnit}>
                        {t.common.currency}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      }

      // Promotion with image — original render
      return (
        <TouchableOpacity
          key={`promo-${promotion.id}`}
          style={styles.slide}
          onPress={() => router.push(`/promotions/${promotion.id}` as any)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: promotion.image_url }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={styles.gradient}
          >
            <View style={styles.discountBadge}>
              <Sparkles size={14} color={Colors.neutralWhite} />
              <Text style={styles.discountText}>
                {getDiscountText(promotion)}
              </Text>
            </View>
            <Text style={styles.bannerTitle} numberOfLines={2}>
              {promotion.title}
            </Text>
            <Text style={styles.bannerSubtitle} numberOfLines={1}>
              {promotion.description}
            </Text>
            {promotion.end_date && (
              <View style={styles.timerRow}>
                <Clock size={12} color={Colors.neutralWhite} />
                <Text style={styles.timerText}>{t.ui.limitedTimeOnly}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    // Promo code offer slide
    const offer = slide.data;
    return (
      <TouchableOpacity
        key={`offer-${offer.id}`}
        style={styles.slide}
        onPress={() => router.push("/(tabs)/offers" as any)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={getOfferGradient(offer.type)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.offerSlideGradient}
        >
          <View style={styles.offerSlideContent}>
            <View style={styles.offerSlideLeft}>
              {offer.code ? (
                <View style={styles.offerCodeBadge}>
                  <Tag size={12} color={Colors.neutralWhite} />
                  <Text style={styles.offerCodeText}>{offer.code}</Text>
                </View>
              ) : (
                <View style={styles.offerCodeBadge}>
                  <Sparkles size={12} color={Colors.neutralWhite} />
                  <Text style={styles.offerCodeText}>
                    {getOfferDiscountText(offer)}
                  </Text>
                </View>
              )}
              <Text style={styles.offerSlideTitle} numberOfLines={2}>
                {offer.title || getOfferDiscountText(offer)}
              </Text>
              <Text style={styles.offerSlideSubtitle} numberOfLines={1}>
                {offer.subtitle ||
                  (offer.minimum_order > 0
                    ? t.ui.minOrderAmount.replace(
                        "{amount}",
                        String(offer.minimum_order),
                      )
                    : t.ui.noMinimumOrder)}
              </Text>
              {offer.ending_soon && (
                <View style={styles.timerRow}>
                  <Clock size={12} color={Colors.neutralWhite} />
                  <Text style={styles.timerText}>{t.ui.endingSoon}</Text>
                </View>
              )}
            </View>
            <View style={styles.offerSlideRight}>
              {getOfferIcon(offer.type)}
              <View style={styles.offerDiscountCircle}>
                <Text style={styles.offerDiscountValue}>
                  {offer.type === "percentage"
                    ? `${offer.value}%`
                    : offer.type === "fixed_amount"
                      ? `${offer.value}`
                      : offer.type === "free_delivery"
                        ? "FREE"
                        : "B1G1"}
                </Text>
                {offer.type === "fixed_amount" && (
                  <Text style={styles.offerDiscountUnit}>
                    {t.common.currency}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t.ui.hotDeals}</Text>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push("/(tabs)/offers")}
        >
          <Text style={styles.viewAllText}>{t.ui.viewAll}</Text>
          <ChevronRight size={16} color={Colors.primary900} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + Spacing.md}
      >
        {slides.length > 0 ? (
          slides.map((slide, index) => renderSlide(slide, index))
        ) : (
          <View style={styles.slide}>
            <LinearGradient
              colors={[Colors.primary700, Colors.primary900]}
              style={styles.placeholderGradient}
            >
              <Sparkles
                size={48}
                color={Colors.neutralWhite}
                strokeWidth={1.5}
              />
              <Text style={styles.placeholderTitle}>
                {t.ui.excitingDealsComingSoon}
              </Text>
              <Text style={styles.placeholderSubtitle}>
                {t.ui.stayTunedDeals}
              </Text>
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      {slides.length > 1 && (
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  loadingContainer: {
    height: CARD_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.neutralLight,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  slide: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: Spacing.md,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.neutralLight,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    paddingTop: Spacing.xl,
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.accentRed,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: Spacing.xs,
  },
  discountText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  bannerTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
    marginBottom: 2,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerSubtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralWhite,
    opacity: 0.9,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.xs,
  },
  timerText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralWhite,
    fontWeight: Typography.medium,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutralGray,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: Colors.primary900,
    width: 24,
  },
  placeholderGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  placeholderTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  placeholderSubtitle: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralWhite,
    opacity: 0.9,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Promo Code Offer Slide ──────────────────────────────────
  offerSlideGradient: {
    width: "100%",
    height: "100%",
    padding: Spacing.md,
    justifyContent: "center",
  },
  offerSlideContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  offerSlideLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  offerCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: Spacing.xs,
  },
  offerCodeText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
    letterSpacing: 1,
  },
  offerSlideTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
    marginBottom: 2,
  },
  offerSlideSubtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralWhite,
    opacity: 0.85,
  },
  offerSlideRight: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  offerDiscountCircle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  offerDiscountValue: {
    fontSize: 18,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  offerDiscountUnit: {
    fontSize: 10,
    fontWeight: Typography.semibold,
    color: Colors.neutralWhite,
    opacity: 0.8,
  },
});
