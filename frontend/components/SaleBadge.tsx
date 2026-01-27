import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SaleBadgeProps {
    discountPercentage?: number;
    discountAmount?: number;
    small?: boolean;
    position?: 'top-left' | 'top-right';
}

export const SaleBadge: React.FC<SaleBadgeProps> = ({
    discountPercentage,
    discountAmount,
    small = false,
    position = 'top-right'
}) => {
    if (!discountPercentage && !discountAmount) return null;

    const displayText = discountPercentage
        ? `-${discountPercentage}%`
        : `-$${discountAmount?.toFixed(2)}`;

    return (
        <View style={[
            styles.badge,
            small ? styles.badgeSmall : styles.badgeLarge,
            position === 'top-left' ? styles.topLeft : styles.topRight
        ]}>
            <Text style={[
                styles.text,
                small ? styles.textSmall : styles.textLarge
            ]}>
                {displayText}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        position: 'absolute',
        backgroundColor: '#FF3B30',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 5,
    },
    badgeSmall: {
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 6,
    },
    badgeLarge: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    topLeft: {
        top: 8,
        left: 8,
    },
    topRight: {
        top: 8,
        right: 8,
    },
    text: {
        color: '#fff',
        fontWeight: 'bold',
    },
    textSmall: {
        fontSize: 10,
    },
    textLarge: {
        fontSize: 14,
    },
});
