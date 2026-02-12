import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { driverService, Order } from "@/services/driver";
import { router } from "expo-router";
import { Package, ChevronRight, MapPin, Clock } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";

const TABS = [
    { key: "", label: "All" },
    { key: "confirmed", label: "New" },
    { key: "preparing", label: "Preparing" },
    { key: "out_for_delivery", label: "Delivering" },
    { key: "delivered", label: "Delivered" },
];

export default function OrdersScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState("");
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchOrders = useCallback(
        async (p = 1, append = false) => {
            try {
                const res = await driverService.getOrders({
                    status: activeTab || undefined,
                    page: p,
                });
                if (append) {
                    setOrders((prev) => [...prev, ...res.data]);
                } else {
                    setOrders(res.data);
                }
                setPage(res.current_page);
                setLastPage(res.last_page);
            } catch {
                // silently fail
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        [activeTab],
    );

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchOrders(1);
        }, [fetchOrders]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders(1);
    };

    const onLoadMore = () => {
        if (page < lastPage && !loadingMore) {
            setLoadingMore(true);
            fetchOrders(page + 1, true);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed": return "#f59e0b";
            case "preparing": return "#3b82f6";
            case "out_for_delivery": return "#8b5cf6";
            case "delivered": return "#16a34a";
            case "cancelled": case "failed": return "#ef4444";
            default: return "#6b7280";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "confirmed": return "New";
            case "preparing": return "Preparing";
            case "out_for_delivery": return "Delivering";
            case "delivered": return "Delivered";
            case "cancelled": return "Cancelled";
            case "failed": return "Failed";
            default: return status.replace(/_/g, " ");
        }
    };

    const formatDate = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) return `Today ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
            " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const renderOrder = ({ item: order }: { item: Order }) => (
        <TouchableOpacity
            style={styles.orderCard}
            onPress={() => router.push(`/order/${order.id}` as any)}
            activeOpacity={0.7}
        >
            <View style={styles.orderRow}>
                <View style={{ flex: 1 }}>
                    <View style={styles.orderTopRow}>
                        <Text style={styles.orderNumber}>{order.order_number}</Text>
                        <View style={[styles.badge, { backgroundColor: getStatusColor(order.status) + "18" }]}>
                            <Text style={[styles.badgeText, { color: getStatusColor(order.status) }]}>
                                {getStatusLabel(order.status)}
                            </Text>
                        </View>
                    </View>

                    {order.user && (
                        <Text style={styles.customerName}>
                            {order.user.first_name} {order.user.last_name}
                        </Text>
                    )}

                    {(() => {
                        let addressStr = "";
                        if (typeof order.delivery_address === "string") {
                            addressStr = order.delivery_address;
                        } else if (order.address && typeof order.address === "object") {
                            addressStr = [order.address.area, order.address.city].filter(Boolean).join(", ");
                        }
                        return addressStr ? (
                            <View style={styles.addressRow}>
                                <MapPin size={12} color="#9ca3af" />
                                <Text style={styles.addressText} numberOfLines={1}>
                                    {addressStr}
                                </Text>
                            </View>
                        ) : null;
                    })()}

                    <View style={styles.bottomRow}>
                        <View style={styles.timeRow}>
                            <Clock size={12} color="#9ca3af" />
                            <Text style={styles.timeText}>{formatDate(order.created_at)}</Text>
                        </View>
                        <Text style={styles.fee}>EGP {Number(order.delivery_fee || 0).toFixed(0)}</Text>
                    </View>
                </View>
                <ChevronRight size={20} color="#d1d5db" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>My Orders</Text>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={TABS}
                    keyExtractor={(t) => t.key}
                    contentContainerStyle={styles.tabsContent}
                    renderItem={({ item: tab }) => (
                        <TouchableOpacity
                            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                            onPress={() => {
                                setActiveTab(tab.key);
                                setLoading(true);
                            }}
                        >
                            <Text
                                style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#16a34a" />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderOrder}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#16a34a" /> : null}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Package size={48} color="#d1d5db" />
                            <Text style={styles.emptyTitle}>No orders found</Text>
                            <Text style={styles.emptySubtitle}>
                                {activeTab ? "Try a different filter" : "Orders will appear here when assigned to you"}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#111827",
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
    },
    tabsContainer: { paddingBottom: 8 },
    tabsContent: { paddingHorizontal: 16, gap: 8 },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#f1f5f9",
    },
    tabActive: { backgroundColor: "#16a34a" },
    tabText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
    tabTextActive: { color: "#fff" },
    list: { paddingHorizontal: 16, paddingBottom: 20 },
    orderCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    orderRow: { flexDirection: "row", alignItems: "center" },
    orderTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    orderNumber: { fontSize: 14, fontWeight: "700", color: "#111827" },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: "700" },
    customerName: { fontSize: 13, color: "#374151", marginTop: 4, fontWeight: "500" },
    addressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    addressText: { fontSize: 12, color: "#9ca3af", flex: 1 },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },
    timeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    timeText: { fontSize: 11, color: "#9ca3af" },
    fee: { fontSize: 14, fontWeight: "700", color: "#16a34a" },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    empty: { alignItems: "center", paddingTop: 80, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
    emptySubtitle: { fontSize: 13, color: "#9ca3af", textAlign: "center", paddingHorizontal: 40 },
});
