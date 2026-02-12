import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Linking,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    Phone,
    MapPin,
    Package,
    CircleCheck,
    Truck,
    Clock,
    CircleX,
    Navigation,
    DollarSign,
} from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { driverApi, DriverOrder } from '@/services/api/driverApi';

const STATUS_FLOW = ['confirmed', 'preparing', 'out_for_delivery', 'delivered'];

export default function DriverOrderDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [order, setOrder] = useState<DriverOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchOrder = useCallback(async () => {
        if (!id) return;
        try {
            const data = await driverApi.getOrderDetails(Number(id));
            setOrder(data);
        } catch (e) {
            Alert.alert('Error', 'Failed to load order');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    const handleAccept = async () => {
        if (!order) return;
        setActionLoading(true);
        try {
            const updated = await driverApi.acceptOrder(order.id);
            setOrder(updated);
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to accept order');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!order) return;
        Alert.alert('Reject Order', 'Are you sure you want to reject this order?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reject',
                style: 'destructive',
                onPress: async () => {
                    setActionLoading(true);
                    try {
                        const result = await driverApi.rejectOrder(order.id);
                        Alert.alert(
                            'Order Rejected',
                            result.reassigned
                                ? 'Order has been reassigned to another driver.'
                                : 'Order could not be reassigned. Admin will handle it.',
                            [{ text: 'OK', onPress: () => router.back() }]
                        );
                    } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to reject order');
                    } finally {
                        setActionLoading(false);
                    }
                },
            },
        ]);
    };

    const handlePickup = async () => {
        if (!order) return;
        Alert.alert('Confirm Pickup', 'Have you picked up the order from the store?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Yes, Picked Up',
                onPress: async () => {
                    setActionLoading(true);
                    try {
                        const updated = await driverApi.pickupOrder(order.id);
                        setOrder(updated);
                    } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to mark as picked up');
                    } finally {
                        setActionLoading(false);
                    }
                },
            },
        ]);
    };

    const handleDeliver = async () => {
        if (!order) return;
        Alert.alert(
            'Confirm Delivery',
            'Has the order been delivered to the customer?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Delivered',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const updated = await driverApi.deliverOrder(order.id);
                            setOrder(updated);
                            Alert.alert('Success', 'Order delivered successfully!', [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Failed to mark as delivered');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCallCustomer = () => {
        if (order?.user?.phone) {
            Linking.openURL(`tel:${order.user.phone}`);
        }
    };

    const handleNavigate = () => {
        if (order?.delivery_lat && order?.delivery_lng) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_lat},${order.delivery_lng}`;
            Linking.openURL(url);
        } else if (order?.delivery_address) {
            const addr = `${order.delivery_address.street}, ${order.delivery_address.area}, ${order.delivery_address.city}`;
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
            Linking.openURL(url);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary900} />
                </View>
            </SafeAreaView>
        );
    }

    if (!order) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={{ textAlign: 'center', marginTop: 40 }}>Order not found</Text>
            </SafeAreaView>
        );
    }

    const statusIndex = STATUS_FLOW.indexOf(order.status);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={22} color={Colors.neutralCharcoal} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order #{order.order_number}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Status Progress */}
                <View style={styles.progressRow}>
                    {STATUS_FLOW.map((s, i) => (
                        <View key={s} style={styles.progressItem}>
                            <View
                                style={[
                                    styles.progressDot,
                                    i <= statusIndex && styles.progressDotActive,
                                    i === statusIndex && styles.progressDotCurrent,
                                ]}
                            >
                                {i < statusIndex ? (
                                    <CircleCheck size={14} color="#fff" />
                                ) : i === statusIndex ? (
                                    <View style={styles.progressPulse} />
                                ) : null}
                            </View>
                            <Text
                                style={[
                                    styles.progressLabel,
                                    i <= statusIndex && styles.progressLabelActive,
                                ]}
                            >
                                {s === 'confirmed'
                                    ? 'Accept'
                                    : s === 'preparing'
                                        ? 'Prepare'
                                        : s === 'out_for_delivery'
                                            ? 'Pickup'
                                            : 'Deliver'}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Customer Info */}
                {order.user && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Customer</Text>
                        <Text style={styles.customerName}>
                            {order.user.first_name} {order.user.last_name}
                        </Text>
                        <TouchableOpacity style={styles.callButton} onPress={handleCallCustomer}>
                            <Phone size={16} color="#fff" />
                            <Text style={styles.callText}>Call {order.user.phone}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Delivery Address */}
                {order.delivery_address && (
                    <View style={styles.card}>
                        <View style={styles.cardTitleRow}>
                            <Text style={styles.cardTitle}>Delivery Address</Text>
                            <TouchableOpacity style={styles.navButton} onPress={handleNavigate}>
                                <Navigation size={14} color={Colors.primary900} />
                                <Text style={styles.navText}>Navigate</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.addressLine}>
                            {order.delivery_address.street}
                        </Text>
                        <Text style={styles.addressDetail}>
                            Bldg: {order.delivery_address.building}, Floor: {order.delivery_address.floor}, Apt: {order.delivery_address.apartment}
                        </Text>
                        <Text style={styles.addressDetail}>
                            {order.delivery_address.area}, {order.delivery_address.city}
                        </Text>
                        {order.delivery_notes && (
                            <Text style={styles.notes}>📝 {order.delivery_notes}</Text>
                        )}
                    </View>
                )}

                {/* Order Items */}
                {order.items && order.items.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Items ({order.items.length})</Text>
                        {order.items.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                                <Text style={styles.itemName} numberOfLines={1}>
                                    {item.quantity}x {item.product_name}
                                </Text>
                                <Text style={styles.itemPrice}>
                                    EGP {parseFloat(item.subtotal).toFixed(2)}
                                </Text>
                            </View>
                        ))}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalAmount}>
                                EGP {parseFloat(order.final_amount).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Payment Info */}
                <View style={styles.card}>
                    <View style={styles.paymentRow}>
                        <DollarSign size={16} color={Colors.neutralMedium} />
                        <Text style={styles.paymentLabel}>Delivery Fee</Text>
                        <Text style={styles.paymentValue}>
                            EGP {parseFloat(order.delivery_fee).toFixed(2)}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Action Button */}
            <View style={styles.actionBar}>
                {order.status === 'confirmed' && (
                    <View style={styles.dualActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={handleReject}
                            disabled={actionLoading}
                        >
                            <CircleX size={20} color="#fff" />
                            <Text style={styles.actionText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={handleAccept}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <CircleCheck size={20} color="#fff" />
                                    <Text style={styles.actionText}>Accept</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {order.status === 'preparing' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.pickupButton, styles.fullWidth]}
                        onPress={handlePickup}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Truck size={20} color="#fff" />
                                <Text style={styles.actionText}>Mark as Picked Up</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {order.status === 'out_for_delivery' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deliverButton, styles.fullWidth]}
                        onPress={handleDeliver}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <CircleCheck size={20} color="#fff" />
                                <Text style={styles.actionText}>Mark as Delivered</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {order.status === 'delivered' && (
                    <View style={[styles.deliveredBanner, styles.fullWidth]}>
                        <CircleCheck size={20} color={Colors.primary900} />
                        <Text style={styles.deliveredText}>Order Delivered</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.neutralCloud },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: Colors.neutralWhite,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutralLight,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.neutralCharcoal },
    content: { padding: 20, paddingBottom: 100 },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingHorizontal: 10,
        backgroundColor: Colors.neutralWhite,
        borderRadius: 14,
        padding: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    progressItem: { alignItems: 'center', gap: 6 },
    progressDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.neutralGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressDotActive: { backgroundColor: Colors.primary900 },
    progressDotCurrent: {
        backgroundColor: Colors.primary700,
        borderWidth: 3,
        borderColor: Colors.primary100,
    },
    progressPulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    progressLabel: { fontSize: 11, color: Colors.neutralMedium, fontWeight: '500' },
    progressLabelActive: { color: Colors.primary900, fontWeight: '700' },
    card: {
        backgroundColor: Colors.neutralWhite,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.neutralMedium,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    cardTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    customerName: { fontSize: 16, fontWeight: '600', color: Colors.neutralCharcoal, marginBottom: 10 },
    callButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#3b82f6',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    callText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.primary100,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    navText: { color: Colors.primary900, fontWeight: '600', fontSize: 12 },
    addressLine: { fontSize: 15, fontWeight: '600', color: Colors.neutralCharcoal, marginBottom: 4 },
    addressDetail: { fontSize: 13, color: Colors.neutralMedium, marginBottom: 2 },
    notes: {
        fontSize: 13,
        color: Colors.accentOrange,
        marginTop: 8,
        fontStyle: 'italic',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutralLight,
    },
    itemName: { fontSize: 14, color: Colors.neutralCharcoal, flex: 1, marginRight: 12 },
    itemPrice: { fontSize: 14, fontWeight: '600', color: Colors.neutralCharcoal },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 10,
        marginTop: 4,
    },
    totalLabel: { fontSize: 15, fontWeight: '700', color: Colors.neutralCharcoal },
    totalAmount: { fontSize: 15, fontWeight: '700', color: Colors.primary900 },
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    paymentLabel: { fontSize: 14, color: Colors.neutralMedium, flex: 1 },
    paymentValue: { fontSize: 14, fontWeight: '700', color: Colors.neutralCharcoal },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 32,
        backgroundColor: Colors.neutralWhite,
        borderTopWidth: 1,
        borderTopColor: Colors.neutralLight,
    },
    dualActions: { flexDirection: 'row', gap: 12 },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        flex: 1,
    },
    fullWidth: { flex: 1 },
    acceptButton: { backgroundColor: Colors.primary900 },
    rejectButton: { backgroundColor: Colors.accentRed },
    pickupButton: { backgroundColor: '#8b5cf6' },
    deliverButton: { backgroundColor: Colors.primary900 },
    actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    deliveredBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: Colors.primary100,
    },
    deliveredText: { fontSize: 16, fontWeight: '700', color: Colors.primary900 },
});
