import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Switch,
    Alert,
    AppState,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
    Package,
    Clock,
    CircleCheck,
    Truck,
    DollarSign,
    MapPin,
    LogOut,
    ChevronRight,
    ChartBar,
    Navigation,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import Colors from '@/constants/Colors';
import { useStore } from '@/store';
import { driverApi, DriverDashboard, DriverOrder } from '@/services/api/driverApi';

const STATUS_COLORS: Record<string, string> = {
    confirmed: '#3b82f6',
    preparing: '#f97316',
    out_for_delivery: '#8b5cf6',
    delivered: '#22c55e',
    cancelled: '#ef4444',
    pending: '#eab308',
};

const STATUS_LABELS: Record<string, string> = {
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    pending: 'Pending',
};

export default function DriverDashboardScreen() {
    const router = useRouter();
    const logout = useStore((s) => s.logout);
    const user = useStore((s) => s.user);

    const [dashboard, setDashboard] = useState<DriverDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    // GPS tracking
    const locationWatcher = useRef<Location.LocationSubscription | null>(null);
    const [locationEnabled, setLocationEnabled] = useState(false);

    const fetchDashboard = useCallback(async () => {
        try {
            const data = await driverApi.getDashboard();
            setDashboard(data);
        } catch (e: any) {
            console.error('Dashboard fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 15000); // refresh every 15s
        return () => clearInterval(interval);
    }, [fetchDashboard]);

    // GPS location tracking
    const startLocationTracking = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Location permission is needed to track deliveries.');
                return;
            }

            locationWatcher.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 15000, // every 15 seconds
                    distanceInterval: 20, // or 20 meters
                },
                async (location) => {
                    const activeOrder = dashboard?.active_orders.find(
                        (o) => o.status === 'out_for_delivery'
                    );
                    try {
                        await driverApi.updateLocation({
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            speed: location.coords.speed ?? undefined,
                            heading: location.coords.heading ?? undefined,
                            accuracy: location.coords.accuracy ?? undefined,
                            order_id: activeOrder?.id,
                        });
                    } catch (e) {
                        console.error('Location update failed:', e);
                    }
                }
            );
            setLocationEnabled(true);
        } catch (e) {
            console.error('Location tracking error:', e);
        }
    }, [dashboard]);

    const stopLocationTracking = useCallback(() => {
        locationWatcher.current?.remove();
        locationWatcher.current = null;
        setLocationEnabled(false);
    }, []);

    // Start/stop tracking based on availability
    useEffect(() => {
        if (dashboard?.is_available) {
            startLocationTracking();
        } else {
            stopLocationTracking();
        }
        return () => stopLocationTracking();
    }, [dashboard?.is_available]);

    const handleToggleAvailability = async () => {
        setToggling(true);
        try {
            const result = await driverApi.toggleAvailability();
            setDashboard((prev) =>
                prev ? { ...prev, is_available: result.is_available } : prev
            );
        } catch (e: any) {
            Alert.alert('Error', 'Failed to toggle availability');
        } finally {
            setToggling(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    stopLocationTracking();
                    await logout();
                    router.replace('/welcome');
                },
            },
        ]);
    };

    const renderOrderItem = ({ item }: { item: DriverOrder }) => (
        <TouchableOpacity
            style={styles.orderCard}
            onPress={() => router.push(`/driver/order-detail?id=${item.id}` as any)}
            activeOpacity={0.7}
        >
            <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>#{item.order_number}</Text>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: (STATUS_COLORS[item.status] || '#6b7280') + '20' },
                    ]}
                >
                    <Text
                        style={[
                            styles.statusText,
                            { color: STATUS_COLORS[item.status] || '#6b7280' },
                        ]}
                    >
                        {STATUS_LABELS[item.status] || item.status}
                    </Text>
                </View>
            </View>

            {item.user && (
                <Text style={styles.customerName}>
                    {item.user.first_name} {item.user.last_name}
                </Text>
            )}

            {item.delivery_address && (
                <View style={styles.addressRow}>
                    <MapPin size={14} color={Colors.neutralMedium} />
                    <Text style={styles.addressText} numberOfLines={1}>
                        {item.delivery_address.street}, {item.delivery_address.area}
                    </Text>
                </View>
            )}

            <View style={styles.orderFooter}>
                <Text style={styles.orderAmount}>
                    EGP {parseFloat(item.final_amount).toFixed(2)}
                </Text>
                <ChevronRight size={18} color={Colors.neutralMedium} />
            </View>
        </TouchableOpacity>
    );

    const isAvailable = dashboard?.is_available ?? false;
    const stats = dashboard?.today_stats;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>
                        Hello, {user?.first_name || 'Driver'}
                    </Text>
                    <Text style={styles.subGreeting}>
                        {dashboard?.assigned_zone?.name_en
                            ? `Zone: ${dashboard.assigned_zone.name_en}`
                            : 'No zone assigned'}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.statsBtn}
                        onPress={() => router.push('/driver/stats' as any)}
                    >
                        <ChartBar size={20} color={Colors.primary900} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <LogOut size={20} color={Colors.accentRed} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Availability Toggle */}
            <View style={[styles.availabilityCard, isAvailable && styles.availableCard]}>
                <View>
                    <Text style={[styles.availLabel, isAvailable && styles.availLabelActive]}>
                        {isAvailable ? 'You are Online' : 'You are Offline'}
                    </Text>
                    <Text style={styles.availSub}>
                        {isAvailable
                            ? locationEnabled
                                ? '📡 GPS tracking active'
                                : '⚠️ GPS not available'
                            : 'Go online to receive orders'}
                    </Text>
                </View>
                <Switch
                    value={isAvailable}
                    onValueChange={handleToggleAvailability}
                    disabled={toggling}
                    trackColor={{ false: '#cbd5e1', true: Colors.primary700 }}
                    thumbColor={isAvailable ? Colors.primary900 : '#f4f3f4'}
                />
            </View>

            {/* Today Stats */}
            {stats && (
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Package size={18} color="#3b82f6" />
                        <Text style={styles.statNum}>{stats.total_orders}</Text>
                        <Text style={styles.statLabel}>Orders</Text>
                    </View>
                    <View style={styles.statCard}>
                        <CircleCheck size={18} color="#22c55e" />
                        <Text style={styles.statNum}>{stats.delivered}</Text>
                        <Text style={styles.statLabel}>Delivered</Text>
                    </View>
                    <View style={styles.statCard}>
                        <DollarSign size={18} color="#f97316" />
                        <Text style={styles.statNum}>
                            {stats.total_earnings.toFixed(0)}
                        </Text>
                        <Text style={styles.statLabel}>EGP</Text>
                    </View>
                </View>
            )}

            {/* Active Orders */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Orders</Text>
                <Text style={styles.sectionCount}>
                    {dashboard?.active_orders.length || 0}
                </Text>
            </View>

            <FlatList
                data={dashboard?.active_orders || []}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderOrderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={() => {
                            setLoading(true);
                            fetchDashboard();
                        }}
                        colors={[Colors.primary900]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Truck size={48} color={Colors.neutralGray} />
                        <Text style={styles.emptyTitle}>No Active Orders</Text>
                        <Text style={styles.emptySubtitle}>
                            {isAvailable
                                ? 'New orders will appear here when assigned'
                                : 'Go online to start receiving orders'}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.neutralCloud },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    greeting: { fontSize: 22, fontWeight: '700', color: Colors.neutralCharcoal },
    subGreeting: { fontSize: 13, color: Colors.neutralMedium, marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 12 },
    statsBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fee2e2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    availabilityCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20,
        padding: 16,
        borderRadius: 16,
        backgroundColor: Colors.neutralWhite,
        borderWidth: 1,
        borderColor: Colors.neutralGray,
        marginBottom: 16,
    },
    availableCard: {
        backgroundColor: Colors.primary100,
        borderColor: Colors.primary700,
    },
    availLabel: { fontSize: 16, fontWeight: '700', color: Colors.neutralMedium },
    availLabelActive: { color: Colors.primary900 },
    availSub: { fontSize: 12, color: Colors.neutralMedium, marginTop: 2 },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.neutralWhite,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        gap: 4,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    statNum: { fontSize: 20, fontWeight: '700', color: Colors.neutralCharcoal },
    statLabel: { fontSize: 11, color: Colors.neutralMedium },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.neutralCharcoal,
    },
    sectionCount: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary900,
        backgroundColor: Colors.primary100,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    listContent: { paddingHorizontal: 20, paddingBottom: 20 },
    orderCard: {
        backgroundColor: Colors.neutralWhite,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderNumber: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.neutralCharcoal,
    },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 12, fontWeight: '600' },
    customerName: { fontSize: 14, color: Colors.neutralCharcoal, marginBottom: 4 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    addressText: { fontSize: 13, color: Colors.neutralMedium, flex: 1 },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Colors.neutralLight,
        paddingTop: 8,
    },
    orderAmount: { fontSize: 15, fontWeight: '700', color: Colors.primary900 },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 8,
    },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.neutralCharcoal },
    emptySubtitle: {
        fontSize: 14,
        color: Colors.neutralMedium,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
