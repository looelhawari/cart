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
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
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
    const [featuredPromotion, setFeaturedPromotion] = useState<Promotion | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>("all");
    const [error, setError] = useState<string | null>(null);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const headerScaleAnim = useRef(new Animated.Value(0.95)).current;

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
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    // Load promotions on mount
    useEffect(() => {
        loadPromotions();
    }, []);

    // Filter promotions dynamically
    useEffect(() => {
        filterPromotions(filter);
    }, [filter, allPromotions]);

    // Animate content when loading completes
    useEffect(() => {
        if (!loading && !error) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.spring(headerScaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [loading, error]);

    const filterPromotions = (currentFilter: FilterType) => {
        let filtered = allPromotions;

        if (currentFilter !== "all") {
            filtered = allPromotions.filter(
                (p: Promotion) => p.applies_to === currentFilter
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
            headerScaleAnim.setValue(0.95);

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
            marginHorizontal: wp(4),
            borderRadius: isSmallDevice ? 20 : 24,
            overflow: "hidden",
            marginBottom: Spacing.xl,
            shadowColor: Colors.primary900,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 12,
        },
        heroImage: {
            width: "100%",
            height: isSmallDevice ? hp(24) : hp(30),
        },
        heroOverlay: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: isSmallDevice ? Spacing.lg : Spacing.xl,
        },
        heroTitle: {
            fontSize: isSmallDevice ? 22 : 28,
            fontWeight: "800",
            color: Colors.neutralWhite,
            marginBottom: Spacing.xs,
            textShadowColor: "rgba(0,0,0,0.6)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 6,
        },
        heroSubtitle: {
            fontSize: isSmallDevice ? 14 : 16,
            color: Colors.neutralWhite,
            opacity: 0.95,
            textShadowColor: "rgba(0,0,0,0.5)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
        },
        gridContainer: {
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: wp(3),
        },
        gridItem: {
            width: isLargeDevice ? "50%" : "100%",
            padding: Spacing.xs,
        },
        promotionCard: {
            backgroundColor: Colors.neutralWhite,
            borderRadius: 16,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
            borderWidth: 1,
            borderColor: Colors.neutralGray + "30",
        },
        cardImage: {
            width: "100%",
            height: isSmallDevice ? 85 : 100,
            backgroundColor: Colors.neutralLight,
        },
        cardContent: {
            padding: isSmallDevice ? Spacing.sm : Spacing.md,
        },
        discountBadge: {
            position: "absolute",
            top: Spacing.xs,
            right: Spacing.xs,
            paddingVertical: 4,
            paddingHorizontal: isSmallDevice ? 8 : 10,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
        },
        discountText: {
            fontSize: isSmallDevice ? 10 : 12,
            fontWeight: "800",
            color: Colors.neutralWhite,
        },
        cardTitle: {
            fontSize: isSmallDevice ? 14 : 15,
            fontWeight: "700",
            color: Colors.neutralCharcoal,
            marginBottom: 4,
        },
        cardDescription: {
            fontSize: isSmallDevice ? 11 : 12,
            color: Colors.neutralMedium,
            lineHeight: isSmallDevice ? 15 : 17,
        },
        statsCard: {
            width: isLargeDevice ? wp(28) : wp(27),
            marginRight: Spacing.sm,
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
                <LinearGradient
                    colors={isActive ? [Colors.primary900, Colors.primary700] : ["transparent", "transparent"]}
                    style={styles.filterChipGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons
                        name={iconName}
                        size={isSmallDevice ? 16 : 18}
                        color={isActive ? Colors.neutralWhite : Colors.neutralMedium}
                    />
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                        {label}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    // Stat Card Component
    const StatCard = ({
        iconName,
        value,
        label,
        gradientColors,
    }: {
        iconName: keyof typeof Ionicons.glyphMap;
        value: string;
        label: string;
        gradientColors: [string, string];
    }) => (
        <View style={[dynamicStyles.statsCard, styles.statCard]}>
            <LinearGradient
                colors={gradientColors}
                style={styles.statIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Ionicons name={iconName} size={20} color={Colors.neutralWhite} />
            </LinearGradient>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    // Offer Card Component
    const OfferCard = ({ promotion, index }: { promotion: Promotion; index: number }) => {
        const getDiscountText = () => {
            if (promotion.discount_type === "percentage") {
                return `${promotion.discount_value}%`;
            } else if (promotion.discount_type === "fixed") {
                return `${promotion.discount_value} EGP`;
            }
            return "OFFER";
        };

        const getDiscountGradient = (): [string, string] => {
            if (promotion.discount_type === "percentage" && Number(promotion.discount_value) >= 30) {
                return [Colors.accentRed, "#c53030"];
            }
            return [Colors.primary900, Colors.primary700];
        };

        return (
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [
                        {
                            translateY: slideAnim.interpolate({
                                inputRange: [0, 30],
                                outputRange: [0, 30 + index * 10],
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
                            source={{ uri: promotion.image_url || promotion.banner_image_url }}
                            style={dynamicStyles.cardImage}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={getDiscountGradient()}
                            style={dynamicStyles.discountBadge}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="flash" size={12} color={Colors.neutralWhite} />
                            <Text style={dynamicStyles.discountText}>{getDiscountText()}</Text>
                        </LinearGradient>
                        {promotion.is_featured && (
                            <Animated.View
                                style={[styles.featuredTag, { transform: [{ scale: pulseAnim }] }]}
                            >
                                <Ionicons name="star" size={12} color={Colors.accentYellow} />
                                <Text style={styles.featuredTagText}>Featured</Text>
                            </Animated.View>
                        )}
                    </View>
                    <View style={dynamicStyles.cardContent}>
                        <Text style={dynamicStyles.cardTitle} numberOfLines={1}>
                            {promotion.title}
                        </Text>
                        <Text style={dynamicStyles.cardDescription} numberOfLines={1}>
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
                        <TouchableOpacity style={styles.viewDealButton} activeOpacity={0.8}>
                            <Text style={styles.viewDealText}>View Deal</Text>
                            <ChevronRight size={14} color={Colors.primary900} />
                        </TouchableOpacity>
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
                    <LinearGradient
                        colors={[Colors.accentRed + "20", Colors.accentOrange + "10"]}
                        style={styles.errorIconBg}
                    >
                        <AlertCircle size={48} color={Colors.accentRed} />
                    </LinearGradient>
                    <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={handleRefresh} activeOpacity={0.8}>
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
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header Skeleton */}
                    <LinearGradient
                        colors={[Colors.primary900, Colors.primary800]}
                        style={styles.headerGradient}
                    >
                        <View style={styles.headerContent}>
                            <SkeletonLoader width={56} height={56} borderRadius={28} />
                            <View style={{ height: 16 }} />
                            <SkeletonLoader width={220} height={36} borderRadius={8} />
                            <View style={{ height: 10 }} />
                            <SkeletonLoader width={280} height={18} borderRadius={4} />
                        </View>
                    </LinearGradient>

                    {/* Stats Skeleton */}
                    <View style={styles.statsContainer}>
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={[dynamicStyles.statsCard, styles.statCard]}>
                                <SkeletonLoader width={40} height={40} borderRadius={20} />
                                <View style={{ height: 10 }} />
                                <SkeletonLoader width={50} height={26} borderRadius={6} />
                                <View style={{ height: 6 }} />
                                <SkeletonLoader width={70} height={16} borderRadius={4} />
                            </View>
                        ))}
                    </View>

                    {/* Filter Skeleton */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterScrollContent}
                    >
                        {[1, 2, 3].map((i) => (
                            <SkeletonLoader key={i} width={110} height={44} borderRadius={22} />
                        ))}
                    </ScrollView>

                    {/* Hero Skeleton */}
                    <View style={dynamicStyles.heroCard}>
                        <SkeletonLoader width="100%" height={hp(30)} borderRadius={24} />
                    </View>

                    {/* Grid Skeleton */}
                    <View style={dynamicStyles.gridContainer}>
                        {[1, 2, 3, 4].map((i) => (
                            <View key={i} style={dynamicStyles.gridItem}>
                                <View style={dynamicStyles.promotionCard}>
                                    <SkeletonLoader width="100%" height={160} borderRadius={0} />
                                    <View style={{ padding: Spacing.lg }}>
                                        <SkeletonLoader width="85%" height={20} borderRadius={6} />
                                        <View style={{ height: 10 }} />
                                        <SkeletonLoader width="100%" height={16} borderRadius={4} />
                                        <View style={{ height: 6 }} />
                                        <SkeletonLoader width="70%" height={16} borderRadius={4} />
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <OfflineIndicator />
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
                {/* Premium Header */}
                <Animated.View style={{ transform: [{ scale: headerScaleAnim }] }}>
                    <LinearGradient
                        colors={[Colors.primary900, Colors.primary800, Colors.primary700]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerGradient}
                    >
                        <View style={styles.headerContent}>
                            <View style={styles.headerIconWrapper}>
                                <LinearGradient
                                    colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.15)"]}
                                    style={styles.headerIconBg}
                                >
                                    <Ionicons name="gift" size={isSmallDevice ? 26 : 30} color={Colors.neutralWhite} />
                                </LinearGradient>
                            </View>
                            <Text style={[styles.headerTitle, isSmallDevice && { fontSize: 28 }]}>
                                {t.offers?.specialOffers || "Special Offers"}
                            </Text>
                            <Text style={styles.headerSubtitle}>
                                {t.offers?.exclusiveDeals || "Discover amazing deals & exclusive discounts"}
                            </Text>
                        </View>

                        {/* Decorative Elements */}
                        <View style={styles.headerDecor1} />
                        <View style={styles.headerDecor2} />
                        <View style={styles.headerDecor3} />
                    </LinearGradient>
                </Animated.View>

                {/* Quick Stats */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statsContainer}
                >
                    <StatCard
                        iconName="flame"
                        value={`${promotions.length + (featuredPromotion ? 1 : 0)}`}
                        label={t.offers?.activeOffers || "Active"}
                        gradientColors={[Colors.accentRed, Colors.accentOrange]}
                    />
                    <StatCard
                        iconName="pricetag"
                        value={t.offers?.upTo50 || "Up to 50%"}
                        label={t.offers?.maxDiscount || "Max Discount"}
                        gradientColors={[Colors.primary900, Colors.primary700]}
                    />
                    <StatCard
                        iconName="trending-up"
                        value={t.offers?.limited || "Limited"}
                        label={t.offers?.timeDeals || "Time Deals"}
                        gradientColors={[Colors.accentOrange, Colors.accentYellow]}
                    />
                </ScrollView>

                {/* Filter Chips */}
                <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>{t.offers?.browseByType || "Browse by Type"}</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterContainer}
                    >
                        <FilterChip label={t.offers?.allOffers || "All Offers"} value="all" iconName="pricetags" />
                        <FilterChip label={t.nav?.categories || "Categories"} value="category" iconName="grid" />
                        <FilterChip label={t.offers?.products || "Products"} value="products" iconName="cube" />
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
                            activeOpacity={0.92}
                        >
                            <Image
                                source={{ uri: featuredPromotion.banner_image_url || featuredPromotion.image_url }}
                                style={dynamicStyles.heroImage}
                                resizeMode="cover"
                            />
                            <LinearGradient
                                colors={["transparent", "rgba(0,0,0,0.85)"]}
                                style={dynamicStyles.heroOverlay}
                            >
                                <View style={styles.heroBadgeRow}>
                                    <Animated.View style={[styles.heroBadge, { transform: [{ scale: pulseAnim }] }]}>
                                        <Ionicons name="sparkles" size={14} color={Colors.accentYellow} />
                                        <Text style={styles.heroBadgeText}>
                                            {t.offers?.featuredDeal || "Featured Deal"}
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
                                <Text style={dynamicStyles.heroTitle} numberOfLines={2}>
                                    {featuredPromotion.title}
                                </Text>
                                <Text style={dynamicStyles.heroSubtitle} numberOfLines={1}>
                                    {featuredPromotion.description || "Don't miss this exclusive offer!"}
                                </Text>
                                {featuredPromotion.end_date && (
                                    <View style={styles.heroTimer}>
                                        <Clock size={16} color={Colors.neutralWhite} />
                                        <Text style={styles.heroTimerText}>
                                            {t.offers?.endsSoon || "Ends Soon"}
                                        </Text>
                                        <View style={styles.heroTimerDivider} />
                                        <CountdownTimer endDate={featuredPromotion.end_date} compact light />
                                    </View>
                                )}
                                <View style={styles.heroShopNow}>
                                    <Text style={styles.heroShopNowText}>Shop Now</Text>
                                    <ChevronRight size={20} color={Colors.neutralWhite} />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {/* Section Header */}
                    {promotions.length > 0 && (
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <Ionicons name="flame" size={20} color={Colors.accentOrange} />
                                <Text style={styles.sectionTitle}>{t.offers?.moreOffers || "More Offers"}</Text>
                            </View>
                            <View style={styles.sectionCount}>
                                <Text style={styles.sectionCountText}>
                                    {promotions.length} {t.offers?.deals || "deals"}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Promotions Grid */}
                    {promotions.length > 0 ? (
                        <View style={dynamicStyles.gridContainer}>
                            {promotions.map((promotion, index) => (
                                <View key={promotion.id} style={dynamicStyles.gridItem}>
                                    <OfferCard promotion={promotion} index={index} />
                                </View>
                            ))}
                        </View>
                    ) : !featuredPromotion ? (
                        <View style={styles.emptyContainer}>
                            <LinearGradient
                                colors={[Colors.primary100, Colors.neutralCloud]}
                                style={styles.emptyIconContainer}
                            >
                                <Ionicons name="gift" size={56} color={Colors.primary900} />
                            </LinearGradient>
                            <Text style={styles.emptyTitle}>
                                {t.offers?.noOffers || "No Offers Available"}
                            </Text>
                            <Text style={styles.emptyText}>
                                Check back soon for amazing deals and exclusive promotions!
                            </Text>
                            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} activeOpacity={0.8}>
                                <LinearGradient
                                    colors={[Colors.primary900, Colors.primary700]}
                                    style={styles.refreshButtonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="refresh" size={18} color={Colors.neutralWhite} />
                                    <Text style={styles.refreshButtonText}>Refresh</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </Animated.View>

                {/* Bottom Spacing */}
                <View style={{ height: Spacing.xxxl + 20 }} />
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

    // Header
    headerGradient: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xxl,
        position: "relative",
        overflow: "hidden",
    },
    headerContent: {
        zIndex: 10,
        alignItems: "center",
    },
    headerIconWrapper: {
        marginBottom: Spacing.md,
    },
    headerIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: "800",
        color: Colors.neutralWhite,
        marginBottom: Spacing.xs,
        textAlign: "center",
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 15,
        color: Colors.neutralWhite,
        opacity: 0.9,
        textAlign: "center",
        paddingHorizontal: Spacing.lg,
    },
    headerDecor1: {
        position: "absolute",
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    headerDecor2: {
        position: "absolute",
        bottom: -60,
        left: -30,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    headerDecor3: {
        position: "absolute",
        top: 40,
        left: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(255,255,255,0.05)",
    },

    // Stats
    statsContainer: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    statCard: {
        backgroundColor: Colors.neutralWhite,
        borderRadius: 16,
        padding: Spacing.md,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: Colors.neutralGray + "40",
    },
    statIconGradient: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.sm,
    },
    statValue: {
        fontSize: 20,
        fontWeight: "800",
        color: Colors.neutralCharcoal,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.neutralMedium,
        marginTop: 2,
        textAlign: "center",
    },

    // Filters
    filterSection: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    filterLabel: {
        fontSize: 12,
        color: Colors.neutralMedium,
        marginBottom: Spacing.sm,
        textTransform: "uppercase",
        letterSpacing: 1,
        fontWeight: "600",
    },
    filterScrollContent: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
    },
    filterContainer: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    filterChip: {
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: Colors.neutralWhite,
        borderWidth: 1.5,
        borderColor: Colors.neutralGray,
        marginRight: Spacing.sm,
    },
    filterChipActive: {
        borderColor: Colors.primary900,
        borderWidth: 0,
    },
    filterChipGradient: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
    },
    filterChipText: {
        fontSize: 14,
        color: Colors.neutralMedium,
        fontWeight: "600",
    },
    filterChipTextActive: {
        color: Colors.neutralWhite,
        fontWeight: "700",
    },

    // Hero
    heroBadgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    heroBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    heroBadgeText: {
        fontSize: 13,
        color: Colors.neutralWhite,
        fontWeight: "700",
    },
    heroDiscountBadge: {
        backgroundColor: Colors.accentRed,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    heroDiscountText: {
        fontSize: 13,
        color: Colors.neutralWhite,
        fontWeight: "800",
    },
    heroTimer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: Spacing.md,
        backgroundColor: "rgba(255,255,255,0.15)",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        alignSelf: "flex-start",
    },
    heroTimerText: {
        fontSize: 13,
        color: Colors.neutralWhite,
        fontWeight: "600",
    },
    heroTimerDivider: {
        width: 1,
        height: 16,
        backgroundColor: "rgba(255,255,255,0.3)",
    },
    heroShopNow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: Spacing.md,
        backgroundColor: Colors.primary900,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        alignSelf: "flex-start",
    },
    heroShopNowText: {
        fontSize: 15,
        color: Colors.neutralWhite,
        fontWeight: "700",
    },

    // Cards
    featuredTag: {
        position: "absolute",
        top: Spacing.xs,
        left: Spacing.xs,
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "rgba(0,0,0,0.7)",
        paddingVertical: 3,
        paddingHorizontal: 7,
        borderRadius: 8,
    },
    featuredTagText: {
        fontSize: 9,
        color: Colors.accentYellow,
        fontWeight: "700",
    },
    timerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: Spacing.xs,
        paddingTop: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: Colors.neutralGray + "40",
    },
    timerIconBg: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.accentOrange + "15",
        alignItems: "center",
        justifyContent: "center",
    },
    viewDealButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        marginTop: Spacing.xs,
        paddingVertical: Spacing.xs,
        backgroundColor: Colors.primary100,
        borderRadius: 10,
    },
    viewDealText: {
        fontSize: 12,
        color: Colors.primary900,
        fontWeight: "700",
    },

    // Section
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
        marginTop: Spacing.sm,
    },
    sectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: Colors.neutralCharcoal,
    },
    sectionCount: {
        backgroundColor: Colors.primary100,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    sectionCountText: {
        fontSize: 13,
        color: Colors.primary900,
        fontWeight: "700",
    },

    // Empty State
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: Spacing.xxxl,
        paddingHorizontal: Spacing.xl,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.xl,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: Colors.neutralCharcoal,
        marginBottom: Spacing.sm,
        textAlign: "center",
    },
    emptyText: {
        fontSize: 15,
        color: Colors.neutralMedium,
        textAlign: "center",
        lineHeight: 24,
        marginBottom: Spacing.xl,
        paddingHorizontal: Spacing.lg,
    },
    refreshButton: {
        borderRadius: 28,
        overflow: "hidden",
        shadowColor: Colors.primary900,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    refreshButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
    },
    refreshButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: Colors.neutralWhite,
    },

    // Error State
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: Spacing.xl,
    },
    errorIconBg: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.xl,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: Colors.neutralCharcoal,
        marginBottom: Spacing.sm,
        textAlign: "center",
    },
    errorText: {
        fontSize: 15,
        color: Colors.neutralMedium,
        textAlign: "center",
        lineHeight: 24,
        marginBottom: Spacing.xl,
        paddingHorizontal: Spacing.md,
    },
    retryButton: {
        borderRadius: 28,
        overflow: "hidden",
        shadowColor: Colors.primary900,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    retryButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: Colors.neutralWhite,
    },
});
