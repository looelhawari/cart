import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Linking,
    Platform,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
// @ts-ignore
import { ArrowLeft, Phone, MessageSquare } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/Colors";
import Spacing from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { trackingApi, type OrderTrackingData } from "@/services/api/trackingApi";
import OrderTrackingMap from "@/components/OrderTrackingMap";
import OrderStatusBar from "@/components/OrderStatusBar";
import { useTranslation } from "@/i18n";

const POLL_INTERVAL = 3000; // 3 seconds for near real-time tracking

export default function OrderTrackingScreen() {
    const { id } = useLocalSearchParams();
    const { t } = useTranslation();
    const orderId = Number(id);

    const [tracking, setTracking] = useState<OrderTrackingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Pulsing animation for live indicator
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.4,
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

    const fetchTracking = useCallback(
        async (silent = false) => {
            try {
                if (!silent) setLoading(true);
                const data = await trackingApi.getTracking(orderId);
                setTracking(data);
                setError(null);

                // Stop polling if order is delivered or cancelled
                if (["delivered", "cancelled", "failed"].includes(data.status)) {
                    if (pollRef.current) {
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                    }
                }
            } catch (err: any) {
                if (!silent) setError(err.message || "Failed to load tracking");
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [orderId]
    );

    // Initial fetch + polling
    useEffect(() => {
        fetchTracking();
        pollRef.current = setInterval(() => fetchTracking(true), POLL_INTERVAL);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchTracking]);

    const handleCallDriver = () => {
        if (tracking?.driver?.phone) {
            Linking.openURL(`tel:${tracking.driver.phone}`);
        }
    };

    const formatETA = (minutes: number) => {
        if (minutes < 1) return "Arriving now";
        if (minutes === 1) return "1 min";
        if (minutes < 60) return `${minutes} min`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary900} />
                    <Text style={styles.loadingText}>Loading tracking...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !tracking) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                        <ArrowLeft size={24} color={Colors.neutralCharcoal} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Track Order</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="location-outline" size={60} color={Colors.neutralGray} />
                    <Text style={styles.errorTitle}>Tracking Unavailable</Text>
                    <Text style={styles.errorText}>{error || "Could not load tracking data"}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => fetchTracking()}>
                        <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const isActive = !["delivered", "cancelled", "failed"].includes(tracking.status);
    const isOutForDelivery = tracking.status === "out_for_delivery";

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <ArrowLeft size={24} color={Colors.neutralCharcoal} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Track Order</Text>
                    {isActive && (
                        <View style={styles.liveRow}>
                            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    )}
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* ETA Banner */}
                {tracking.eta && isOutForDelivery && (
                    <LinearGradient
                        colors={[Colors.primary900, Colors.primary700]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.etaBanner}
                    >
                        <View style={styles.etaContent}>
                            <Text style={styles.etaLabel}>Estimated Arrival</Text>
                            <Text style={styles.etaTime}>{formatETA(tracking.eta.minutes_remaining)}</Text>
                        </View>
                        <View style={styles.etaProgress}>
                            <View style={styles.etaProgressBg}>
                                <View
                                    style={[
                                        styles.etaProgressFill,
                                        {
                                            width: `${Math.min(
                                                100,
                                                ((tracking.eta.total_minutes - tracking.eta.minutes_remaining) /
                                                    tracking.eta.total_minutes) *
                                                100
                                            )}%`,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={styles.etaProgressText}>
                                {tracking.eta.total_minutes - tracking.eta.minutes_remaining} of{" "}
                                {tracking.eta.total_minutes} min
                            </Text>
                        </View>
                    </LinearGradient>
                )}

                {/* Map */}
                <View style={styles.mapSection}>
                    <OrderTrackingMap
                        driver={tracking.driver}
                        delivery={tracking.delivery}
                        compact={!isOutForDelivery}
                    />
                </View>

                {/* Driver Card */}
                {tracking.driver && (
                    <View style={styles.driverCard}>
                        <View style={styles.driverInfo}>
                            <View style={styles.driverAvatar}>
                                <Ionicons name="person" size={24} color={Colors.primary900} />
                            </View>
                            <View style={styles.driverDetails}>
                                <Text style={styles.driverName}>{tracking.driver.name}</Text>
                                <Text style={styles.driverLabel}>Your delivery driver</Text>
                                {tracking.driver.rating && Number(tracking.driver.rating) > 0 && (
                                    <View style={styles.ratingRow}>
                                        <Ionicons name="star" size={12} color="#f59e0b" />
                                        <Text style={styles.ratingText}>{Number(tracking.driver.rating).toFixed(1)}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <View style={styles.driverActions}>
                            <TouchableOpacity style={styles.driverActionBtn} onPress={handleCallDriver}>
                                <Phone size={18} color={Colors.primary900} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Status Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Status</Text>
                    <View style={styles.card}>
                        <OrderStatusBar timeline={tracking.timeline} currentStatus={tracking.status} />
                    </View>
                </View>

                {/* Delivery Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Delivery Details</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={18} color={Colors.primary900} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Delivering to</Text>
                                {tracking.delivery.address && (
                                    <Text style={styles.infoValue}>
                                        {tracking.delivery.address.street}
                                        {tracking.delivery.address.area ? `, ${tracking.delivery.address.area}` : ""}
                                        {tracking.delivery.address.city ? `, ${tracking.delivery.address.city}` : ""}
                                    </Text>
                                )}
                            </View>
                        </View>
                        {tracking.delivery.zone_name && (
                            <View style={[styles.infoRow, { marginTop: 8 }]}>
                                <Ionicons name="map-outline" size={18} color={Colors.primary900} />
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>Delivery Zone</Text>
                                    <Text style={styles.infoValue}>{tracking.delivery.zone_name}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Order Number Footer */}
                <View style={styles.orderRef}>
                    <Text style={styles.orderRefText}>Order #{tracking.order_number}</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f7",
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: Colors.neutralMedium,
    },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        gap: 12,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: Colors.neutralCharcoal,
    },
    errorText: {
        fontSize: 14,
        color: Colors.neutralMedium,
        textAlign: "center",
    },
    retryButton: {
        borderWidth: 2,
        borderColor: Colors.primary900,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 8,
    },
    retryText: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.primary900,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    headerBtn: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
        backgroundColor: "#f5f5f5",
    },
    headerCenter: {
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: Colors.neutralCharcoal,
    },
    liveRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#ef4444",
    },
    liveText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#ef4444",
        letterSpacing: 1,
    },
    content: {
        flex: 1,
    },

    // ETA Banner
    etaBanner: {
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        padding: 16,
    },
    etaContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    etaLabel: {
        fontSize: 13,
        color: "rgba(255,255,255,0.8)",
        fontWeight: "500",
    },
    etaTime: {
        fontSize: 28,
        fontWeight: "800",
        color: "#fff",
    },
    etaProgress: {
        gap: 6,
    },
    etaProgressBg: {
        height: 4,
        backgroundColor: "rgba(255,255,255,0.25)",
        borderRadius: 2,
        overflow: "hidden",
    },
    etaProgressFill: {
        height: "100%",
        backgroundColor: "#fff",
        borderRadius: 2,
    },
    etaProgressText: {
        fontSize: 11,
        color: "rgba(255,255,255,0.7)",
    },

    // Map
    mapSection: {
        margin: 16,
    },

    // Driver Card
    driverCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    driverInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    driverAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primary900 + "15",
        alignItems: "center",
        justifyContent: "center",
    },
    driverDetails: {
        flex: 1,
    },
    driverName: {
        fontSize: 15,
        fontWeight: "700",
        color: Colors.neutralCharcoal,
    },
    driverLabel: {
        fontSize: 12,
        color: Colors.neutralMedium,
        marginTop: 1,
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        marginTop: 3,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: "600",
        color: Colors.neutralCharcoal,
    },
    driverActions: {
        flexDirection: "row",
        gap: 8,
    },
    driverActionBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: Colors.primary900 + "12",
        alignItems: "center",
        justifyContent: "center",
    },

    // Sections
    section: {
        marginHorizontal: 16,
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: Colors.neutralCharcoal,
        marginBottom: 10,
        letterSpacing: 0.2,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },

    // Info
    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        color: Colors.neutralMedium,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 13,
        color: Colors.neutralCharcoal,
        lineHeight: 18,
    },

    // Order ref
    orderRef: {
        alignItems: "center",
        marginTop: 20,
    },
    orderRefText: {
        fontSize: 12,
        color: Colors.neutralGray,
    },
});
