import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { driverService, DriverStats } from "@/services/driver";
import { useFocusEffect } from "@react-navigation/native";
import {
    TrendingUp,
    Package,
    CircleCheck,
    CircleX,
    DollarSign,
    Star,
    Clock,
} from "lucide-react-native";

const PERIODS = [
    { key: "1d", label: "Today" },
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "all", label: "All Time" },
];

export default function StatsScreen() {
    const [stats, setStats] = useState<DriverStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("7d");
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const data = await driverService.getStats(period);
            setStats(data);
        } catch {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchStats();
        }, [fetchStats]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const rating = Number(stats?.average_rating || 0);
    const deliveryRate = stats?.total_orders
        ? Math.round((stats.delivered / stats.total_orders) * 100)
        : 0;

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Earnings & Stats</Text>

            {/* Period tabs */}
            <View style={styles.periodRow}>
                {PERIODS.map((p) => (
                    <TouchableOpacity
                        key={p.key}
                        style={[styles.periodTab, period === p.key && styles.periodActive]}
                        onPress={() => setPeriod(p.key)}
                    >
                        <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                            {p.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#16a34a" />
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Earnings Hero */}
                    <View style={styles.earningsCard}>
                        <DollarSign size={24} color="#16a34a" />
                        <Text style={styles.earningsLabel}>Total Earnings</Text>
                        <Text style={styles.earningsValue}>
                            EGP {(stats?.total_earnings || 0).toFixed(2)}
                        </Text>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.grid}>
                        <StatCard
                            icon={<Package size={22} color="#3b82f6" />}
                            label="Total Orders"
                            value={String(stats?.total_orders || 0)}
                            bg="#eff6ff"
                        />
                        <StatCard
                            icon={<CircleCheck size={22} color="#16a34a" />}
                            label="Delivered"
                            value={String(stats?.delivered || 0)}
                            bg="#f0fdf4"
                        />
                        <StatCard
                            icon={<CircleX size={22} color="#ef4444" />}
                            label="Cancelled"
                            value={String(stats?.cancelled || 0)}
                            bg="#fef2f2"
                        />
                        <StatCard
                            icon={<TrendingUp size={22} color="#8b5cf6" />}
                            label="Delivery Rate"
                            value={`${deliveryRate}%`}
                            bg="#f5f3ff"
                        />
                    </View>

                    {/* Additional Info */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                                <Star size={18} color="#eab308" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>Rating</Text>
                                <Text style={styles.infoValue}>
                                    {rating > 0 ? `${rating.toFixed(1)} / 5.0` : "No ratings yet"}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                                <Clock size={18} color="#6366f1" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>All-Time Deliveries</Text>
                                <Text style={styles.infoValue}>
                                    {stats?.total_deliveries_all_time || 0} orders
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 30 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

function StatCard({
    icon,
    label,
    value,
    bg,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    bg: string;
}) {
    return (
        <View style={[styles.statCard, { backgroundColor: bg }]}>
            {icon}
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
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
        paddingBottom: 12,
    },
    periodRow: {
        flexDirection: "row",
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 8,
    },
    periodTab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
    },
    periodActive: { backgroundColor: "#16a34a" },
    periodText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
    periodTextActive: { color: "#fff" },
    scroll: { flex: 1, paddingHorizontal: 16 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    earningsCard: {
        backgroundColor: "#f0fdf4",
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#dcfce7",
    },
    earningsLabel: { fontSize: 14, color: "#16a34a", fontWeight: "600", marginTop: 8 },
    earningsValue: { fontSize: 36, fontWeight: "900", color: "#111827", marginTop: 4 },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 16,
    },
    statCard: {
        width: "48%",
        flexGrow: 1,
        borderRadius: 14,
        padding: 16,
        gap: 6,
    },
    statValue: { fontSize: 26, fontWeight: "800", color: "#111827" },
    statLabel: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
    infoCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#f8fafc",
        justifyContent: "center",
        alignItems: "center",
    },
    infoLabel: { fontSize: 12, color: "#9ca3af" },
    infoValue: { fontSize: 15, fontWeight: "600", color: "#111827" },
    divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 4 },
});
