import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Sparkles } from 'lucide-react-native';
import type { Promotion } from '@/types/promotion';
import { CountdownTimer } from './CountdownTimer';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

interface PromotionCardProps {
    promotion: Promotion;
    horizontal?: boolean;
}

const { width } = Dimensions.get('window');

export const PromotionCard: React.FC<PromotionCardProps> = ({
    promotion,
    horizontal = false
}) => {
    const router = useRouter();

    const handlePress = () => {
        router.push(`/promotions/${promotion.id}` as any);
    };

    const getDiscountText = () => {
        if (promotion.discount_type === 'percentage') {
            return `${promotion.discount_value}% OFF`;
        } else if (promotion.discount_type === 'fixed') {
            return `$${promotion.discount_value} OFF`;
        } else if (promotion.discount_type === 'buy_x_get_y') {
            return `Buy X Get Y`;
        }
        return 'Special Offer';
    };

    if (horizontal) {
        return (
            <TouchableOpacity
                style={styles.horizontalCard}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: promotion.image_url }}
                    style={styles.horizontalImage}
                    resizeMode="cover"
                />
                <View style={styles.horizontalContent}>
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{getDiscountText()}</Text>
                    </View>
                    <Text style={styles.horizontalTitle} numberOfLines={2}>
                        {promotion.title}
                    </Text>
                    <Text style={styles.horizontalDescription} numberOfLines={2}>
                        {promotion.description}
                    </Text>
                    {promotion.end_date && (
                        <View style={styles.timerContainer}>
                            <Clock size={12} color={Colors.accentOrange} />
                            <CountdownTimer endDate={promotion.end_date} compact />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: promotion.image_url }}
                style={styles.image}
                resizeMode="cover"
            />
            {promotion.is_featured && (
                <View style={styles.featuredBadge}>
                    <Sparkles size={12} color={Colors.neutralCharcoal} />
                    <Text style={styles.featuredText}>Featured</Text>
                </View>
            )}
            <View style={styles.content}>
                <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{getDiscountText()}</Text>
                </View>
                <Text style={styles.title} numberOfLines={2}>{promotion.title}</Text>
                <Text style={styles.description} numberOfLines={3}>
                    {promotion.description}
                </Text>
                {promotion.end_date && (
                    <View style={styles.timerContainer}>
                        <Clock size={12} color={Colors.accentOrange} />
                        <CountdownTimer endDate={promotion.end_date} compact />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        width: width * 0.85,
        backgroundColor: Colors.neutralWhite,
        borderRadius: 16,
        marginHorizontal: Spacing.sm,
        marginVertical: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    horizontalCard: {
        flexDirection: 'row',
        backgroundColor: Colors.neutralWhite,
        borderRadius: 16,
        marginHorizontal: Spacing.md,
        marginVertical: Spacing.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 180,
        backgroundColor: Colors.neutralLight,
    },
    horizontalImage: {
        width: 120,
        height: 120,
        backgroundColor: Colors.neutralLight,
    },
    content: {
        padding: Spacing.md,
    },
    horizontalContent: {
        flex: 1,
        padding: Spacing.sm,
        justifyContent: 'space-between',
    },
    featuredBadge: {
        position: 'absolute',
        top: Spacing.sm,
        left: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.accentYellow,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        zIndex: 10,
    },
    featuredText: {
        color: Colors.neutralCharcoal,
        fontSize: Typography.bodySmall,
        fontWeight: Typography.bold,
    },
    discountBadge: {
        backgroundColor: Colors.accentRed,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: Spacing.sm,
    },
    discountText: {
        color: Colors.neutralWhite,
        fontSize: Typography.bodyMedium,
        fontWeight: Typography.bold,
    },
    title: {
        fontSize: Typography.bodyLarge,
        fontWeight: Typography.bold,
        color: Colors.neutralCharcoal,
        marginBottom: 6,
    },
    horizontalTitle: {
        fontSize: Typography.bodyBase,
        fontWeight: Typography.bold,
        color: Colors.neutralCharcoal,
        marginBottom: 4,
    },
    description: {
        fontSize: Typography.bodyMedium,
        color: Colors.neutralMedium,
        lineHeight: 20,
        marginBottom: Spacing.sm,
    },
    horizontalDescription: {
        fontSize: Typography.bodySmall,
        color: Colors.neutralMedium,
        lineHeight: 16,
        marginBottom: Spacing.xs,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: Spacing.xs,
    },
});
