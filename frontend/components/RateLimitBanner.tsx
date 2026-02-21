import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { onRateLimitChange, isEndpointLimited, getEndpointCooldown, type RateLimitInfo } from '../services/rateLimiter';

interface RateLimitBannerProps {
    /** Optional: only show banner for a specific endpoint pattern */
    endpoint?: string;
    /** Optional: custom message */
    message?: string;
}

/**
 * RateLimitBanner
 * 
 * Drop-in component that shows a warning banner when the app is being rate limited.
 * Place it at the top of screens that make frequent API calls.
 * 
 * @example
 * ```tsx
 * <RateLimitBanner endpoint="/api/products" />
 * <FlatList ... />
 * ```
 */
export function RateLimitBanner({ endpoint, message }: RateLimitBannerProps) {
    const [isLimited, setIsLimited] = useState(false);
    const [retryAfter, setRetryAfter] = useState(0);
    const [slideAnim] = useState(new Animated.Value(-80));

    useEffect(() => {
        const unsubscribe = onRateLimitChange((state: Map<string, RateLimitInfo>) => {
            if (endpoint) {
                const limited = isEndpointLimited(endpoint);
                const cooldown = getEndpointCooldown(endpoint);
                setIsLimited(limited);
                setRetryAfter(Math.ceil(cooldown / 1000));
            } else {
                // Check if ANY endpoint is limited
                let worstRetry = 0;
                let anyLimited = false;
                state.forEach((info) => {
                    if (info.isLimited) {
                        anyLimited = true;
                        worstRetry = Math.max(worstRetry, info.retryAfter);
                    }
                });
                setIsLimited(anyLimited);
                setRetryAfter(worstRetry);
            }
        });

        return unsubscribe;
    }, [endpoint]);

    // Animate in/out
    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: isLimited ? 0 : -80,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
        }).start();
    }, [isLimited]);

    // Countdown timer
    useEffect(() => {
        if (!isLimited || retryAfter <= 0) return;

        const interval = setInterval(() => {
            setRetryAfter((prev) => {
                if (prev <= 1) {
                    setIsLimited(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isLimited, retryAfter]);

    if (!isLimited && retryAfter <= 0) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] },
            ]}
        >
            <View style={styles.content}>
                <Text style={styles.icon}>⏳</Text>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        {message || 'Slow down — too many requests'}
                    </Text>
                    {retryAfter > 0 && (
                        <Text style={styles.subtitle}>
                            Try again in {retryAfter}s
                        </Text>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FEF3C7',
        borderBottomWidth: 1,
        borderBottomColor: '#F59E0B',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        fontSize: 20,
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400E',
    },
    subtitle: {
        fontSize: 12,
        color: '#B45309',
        marginTop: 2,
    },
});

export default RateLimitBanner;
