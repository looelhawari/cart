import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    ScrollView,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Text,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Clock, Sparkles } from 'lucide-react-native';
import type { Promotion } from '@/types/promotion';
import { getFeaturedPromotion, getPromotions } from '@/services/api/promotionApi';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const CARD_HEIGHT = 180;

export const HeroBanner: React.FC = () => {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const scrollViewRef = useRef<ScrollView>(null);
    const router = useRouter();

    useEffect(() => {
        loadPromotions();
    }, []);

    const loadPromotions = async () => {
        try {
            setLoading(true);

            // Get all featured promotions
            const featuredResponse = await getFeaturedPromotion();
            if (featuredResponse.success && featuredResponse.data?.promotions) {
                const validPromotions = featuredResponse.data.promotions
                    .filter((promo: Promotion) => promo && promo.image_url);

                if (validPromotions.length > 0) {
                    setPromotions(validPromotions);
                    setLoading(false);
                    return;
                }
            }

            // If no featured promotions, get all active promotions as fallback
            const response = await getPromotions();
            if (response.success) {
                const validPromotions = response.data.promotions
                    .filter((promo: Promotion | null) => promo && promo.image_url)
                    .slice(0, 5);
                setPromotions(validPromotions);
            }
        } catch (error) {
            console.error('Failed to load promotions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (promotions.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => {
                const nextIndex = (prevIndex + 1) % promotions.length;
                scrollViewRef.current?.scrollTo({
                    x: nextIndex * width,
                    animated: true,
                });
                return nextIndex;
            });
        }, 5000); // Auto-scroll every 5 seconds

        return () => clearInterval(interval);
    }, [promotions.length]);

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
        if (promotion.discount_type === 'percentage') {
            return `${promotion.discount_value}% OFF`;
        } else if (promotion.discount_type === 'fixed') {
            return `${promotion.discount_value} EGP OFF`;
        }
        return 'Special Offer';
    };

    return (
        <View style={styles.container}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Hot Deals 🔥</Text>
                <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => router.push('/(tabs)/offers')}
                >
                    <Text style={styles.viewAllText}>View All</Text>
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
                {promotions.length > 0 ? (
                    promotions.filter(promo => promo && promo.image_url).map((promotion) => (
                        <TouchableOpacity
                            key={promotion.id}
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
                                colors={['transparent', 'rgba(0,0,0,0.8)']}
                                style={styles.gradient}
                            >
                                <View style={styles.discountBadge}>
                                    <Sparkles size={14} color={Colors.neutralWhite} />
                                    <Text style={styles.discountText}>{getDiscountText(promotion)}</Text>
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
                                        <Text style={styles.timerText}>Limited Time Only</Text>
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.slide}>
                        <LinearGradient
                            colors={[Colors.primary700, Colors.primary900]}
                            style={styles.placeholderGradient}
                        >
                            <Sparkles size={48} color={Colors.neutralWhite} strokeWidth={1.5} />
                            <Text style={styles.placeholderTitle}>Exciting Deals Coming Soon! 🎉</Text>
                            <Text style={styles.placeholderSubtitle}>
                                Stay tuned for amazing offers and exclusive promotions
                            </Text>
                        </LinearGradient>
                    </View>
                )}
            </ScrollView>

            {promotions.length > 1 && (
                <View style={styles.pagination}>
                    {promotions.map((_, index) => (
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
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: Spacing.md,
        backgroundColor: Colors.neutralLight,
        borderRadius: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: Typography.h4,
        fontWeight: Typography.bold,
        color: Colors.neutralCharcoal,
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
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
        overflow: 'hidden',
        backgroundColor: Colors.neutralLight,
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: Spacing.md,
        paddingTop: Spacing.xl,
    },
    discountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.accentRed,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        alignSelf: 'flex-start',
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
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    bannerSubtitle: {
        fontSize: Typography.bodySmall,
        color: Colors.neutralWhite,
        opacity: 0.9,
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: Spacing.xs,
    },
    timerText: {
        fontSize: Typography.bodySmall,
        color: Colors.neutralWhite,
        fontWeight: Typography.medium,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
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
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    placeholderTitle: {
        fontSize: Typography.h4,
        fontWeight: Typography.bold,
        color: Colors.neutralWhite,
        marginTop: Spacing.md,
        marginBottom: Spacing.xs,
        textAlign: 'center',
    },
    placeholderSubtitle: {
        fontSize: Typography.bodyBase,
        color: Colors.neutralWhite,
        opacity: 0.9,
        textAlign: 'center',
        lineHeight: 20,
    },
});
