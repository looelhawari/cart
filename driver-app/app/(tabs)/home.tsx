import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
    Alert,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { driverService, DashboardData, Order } from "@/services/driver";
import { locationService } from "@/services/location";
import { router } from "expo-router";
import {
    Power,
    Package,
    DollarSign,
    CircleCheck,
    CircleX,
    MapPin,
    ChevronRight,
    Navigation,
    Phone,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Linking } from "react-native";

export default function HomeScreen() {
    const { driver, refreshProfile } = useAuth();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [isAvailable, setIsAvailable] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchDashboard = useCallback(async () => {
        try {
            const data = await driverService.getDashboard();
            setDashboard(data);
            setIsAvailable(data.is_available);
        } catch (err: any) {
            console.log("Dashboard error:", err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
        // Refresh every 30 seconds
        const interval = setInterval(fetchDashboard, 30000);
        return () => clearInterval(interval);
    }, [fetchDashboard]);

    // Start/stop location tracking based on availability
    useEffect(() => {
        if (isAvailable) {
            locationService.requestPermissions().then((granted) => {
                if (granted) {
                    locationService.startTracking();
                    locationService.sendCurrentLocation();
                } else {
                    Alert.alert(
                        "Location Permission",
                        "Location access is required to receive orders. Please enable it in Settings.",
                    );
                }
            });
        } else {
            locationService.stopTracking();
        }
    }, [isAvailable]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchDashboard();
        setRefreshing(false);
    }, [fetchDashboard]);

    const toggleOnline = async () => {
        setToggling(true);
        try {
            const res = await driverService.toggleAvailability();
            setIsAvailable(res.is_available);
            Haptics.notificationAsync(
                res.is_available
                    ? Haptics.NotificationFeedbackType.Success
                    : Haptics.NotificationFeedbackType.Warning,
            );
        } catch (err: any) {
            Alert.alert("Error", err.message);
        } finally {
            setToggling(false);
        }
    };

    const stats = dashboard?.today_stats;
    const activeOrders = dashboard?.active_orders || [];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed": return "#f59e0b";
            case "preparing": return "#3b82f6";
            case "out_for_delivery": return "#8b5cf6";
            default: return "#6b7280";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "confirmed": return "New Order";
            case "preparing": return "Preparing";
            case "out_for_delivery": return "Out for Delivery";
            default: return status.replace(/_/g, " ");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Top bar */}
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.greeting}>
                        Hello, {driver?.first_name || "Driver"} 👋
                    </Text>
                    {dashboard?.assigned_zone && (
                        <View style={styles.zoneRow}>
                            <MapPin size={12} color="#6b7280" />
                            <Text style={styles.zoneName}>{dashboard.assigned_zone.name}</Text>
                        </View>
                    )}
                </View>

                {/* Online toggle */}
                <TouchableOpacity
                    style={[styles.toggleBtn, isAvailable ? styles.toggleOnline : styles.toggleOffline]}
                    onPress={toggleOnline}
                    disabled={toggling}
                    activeOpacity={0.7}
                >
                    <Power size={18} color="#fff" />
                    <Text style={styles.toggleText}>
                        {toggling ? "..." : isAvailable ? "Online" : "Offline"}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
                showsVerticalScrollIndicator={false}
            >
                {/* Today's Stats Cards */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: "#eff6ff" }]}>
                        <Package size={20} color="#3b82f6" />
                        <Text style={styles.statValue}>{stats?.total_orders || 0}</Text>
                        <Text style={styles.statLabel}>Total Orders</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: "#f0fdf4" }]}>
                        <CircleCheck size={20} color="#16a34a" />
                        <Text style={styles.statValue}>{stats?.delivered || 0}</Text>
                        <Text style={styles.statLabel}>Delivered</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: "#fef2f2" }]}>
                        <CircleX size={20} color="#ef4444" />
                        <Text style={styles.statValue}>{stats?.cancelled || 0}</Text>
                        <Text style={styles.statLabel}>Cancelled</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: "#fefce8" }]}>
                        <DollarSign size={20} color="#eab308" />
                        <Text style={styles.statValue}>{(stats?.total_earnings || 0).toFixed(0)}</Text>
                        <Text style={styles.statLabel}>Earnings (EGP)</Text>
                    </View>
                </View>

                {/* Active Orders */}
                <Text style={styles.sectionTitle}>
                    Active Orders ({activeOrders.length})
                </Text>

                {activeOrders.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Package size={40} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>
                            {isAvailable ? "No active orders" : "You are offline"}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {isAvailable
                                ? "New orders will appear here when assigned"
                                : "Go online to start receiving orders"}
                        </Text>
                    </View>
                ) : (
                    activeOrders.map((order) => (
                        <TouchableOpacity
                            key={order.id}
                            style={styles.orderCard}
                            onPress={() => router.push(`/order/${order.id}` as any)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.orderHeader}>
                                <View>
                                    <Text style={styles.orderNumber}>{order.order_number}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + "20" }]}>
                                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
                                        <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                                            {getStatusLabel(order.status)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.orderAmount}>
                                    <Text style={styles.amountLabel}>Delivery Fee</Text>
                                    <Text style={styles.amountValue}>EGP {Number(order.delivery_fee || 0).toFixed(0)}</Text>
                                </View>
                            </View>

                            {/* Customer info */}
                            {order.user && (
                                <View style={styles.customerRow}>
                                    <Text style={styles.customerName}>
                                        {order.user.first_name} {order.user.last_name}
                                    </Text>
                                    {order.user.phone && (
                                        <TouchableOpacity
                                            onPress={() => Linking.openURL(`tel:${order.user!.phone}`)}
                                            style={styles.callBtn}
                                        >
                                            <Phone size={14} color="#16a34a" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {/* Address */}
                            {(() => {
                                let addressStr = "";
                                if (typeof order.delivery_address === "string") {
                                    addressStr = order.delivery_address;
                                } else if (order.address && typeof order.address === "object") {
                                    addressStr = [order.address.building, order.address.street, order.address.area].filter(Boolean).join(", ");
                                }
                                return addressStr ? (
                                    <View style={styles.addressRow}>
                                        <Navigation size={14} color="#6b7280" />
                                        <Text style={styles.addressText} numberOfLines={1}>
                                            {addressStr}
                                        </Text>
                                    </View>
                                ) : null;
                            })()}

                            <View style={styles.orderFooter}>
                                <Text style={styles.orderTime}>
                                    {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </Text>
                                <ChevronRight size={18} color="#9ca3af" />
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    topBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    greeting: { fontSize: 20, fontWeight: "700", color: "#111827" },
    zoneRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    zoneName: { fontSize: 13, color: "#6b7280" },
    toggleBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
    },
    toggleOnline: { backgroundColor: "#16a34a" },
    toggleOffline: { backgroundColor: "#6b7280" },
    toggleText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    scroll: { flex: 1, paddingHorizontal: 16 },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 16,
    },
    statCard: {
        width: "48%",
        flexGrow: 1,
        borderRadius: 14,
        padding: 14,
        gap: 6,
    },
    statValue: { fontSize: 24, fontWeight: "800", color: "#111827" },
    statLabel: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
    sectionTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#111827",
        marginTop: 24,
        marginBottom: 12,
    },
    emptyCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 40,
        alignItems: "center",
        gap: 8,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
    emptySubtitle: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
    orderCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    orderNumber: { fontSize: 15, fontWeight: "700", color: "#111827" },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 6,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontWeight: "600" },
    orderAmount: { alignItems: "flex-end" },
    amountLabel: { fontSize: 11, color: "#9ca3af" },
    amountValue: { fontSize: 16, fontWeight: "700", color: "#16a34a" },
    customerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
    },
    customerName: { fontSize: 14, fontWeight: "500", color: "#374151" },
    callBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#f0fdf4",
        justifyContent: "center",
        alignItems: "center",
    },
    addressRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
    },
    addressText: { fontSize: 13, color: "#6b7280", flex: 1 },
    orderFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
    },
    orderTime: { fontSize: 12, color: "#9ca3af" },
});
