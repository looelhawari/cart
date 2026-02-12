import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Linking,
    RefreshControl,
    Modal,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { driverService, Order, OrderAddress } from "@/services/driver";
import {
    ArrowLeft,
    Phone,
    MapPin,
    Navigation,
    Clock,
    Package,
    CheckCircle2,
    XCircle,
    Truck,
    User,
    ShoppingBag,
    CreditCard,
    Star,
    Map,
} from "lucide-react-native";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Pending", color: "#f59e0b", bg: "#fffbeb" },
    confirmed: { label: "New Order", color: "#3b82f6", bg: "#eff6ff" },
    preparing: { label: "Preparing", color: "#8b5cf6", bg: "#f5f3ff" },
    ready_for_pickup: { label: "Ready for Pickup", color: "#06b6d4", bg: "#ecfeff" },
    out_for_delivery: { label: "Out for Delivery", color: "#f97316", bg: "#fff7ed" },
    delivered: { label: "Delivered", color: "#16a34a", bg: "#f0fdf4" },
    cancelled: { label: "Cancelled", color: "#ef4444", bg: "#fef2f2" },
    rejected: { label: "Rejected", color: "#ef4444", bg: "#fef2f2" },
};

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Customer rating state
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [custRating, setCustRating] = useState(0);
    const [custComment, setCustComment] = useState("");
    const [submittingRating, setSubmittingRating] = useState(false);
    const [customerRated, setCustomerRated] = useState(false);

    const fetchOrder = useCallback(async () => {
        try {
            const data = await driverService.getOrderDetails(Number(id));
            setOrder(data);
            // Check if already rated
            if (data.customer_rating) {
                setCustomerRated(true);
            }
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to load order");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrder();
    };

    const handleAction = async (
        action: "accept" | "pickup" | "deliver" | "reject",
        confirmMsg?: string
    ) => {
        if (confirmMsg) {
            const confirmed = await new Promise<boolean>((resolve) =>
                Alert.alert("Confirm", confirmMsg, [
                    { text: "Cancel", onPress: () => resolve(false) },
                    { text: "Yes", onPress: () => resolve(true) },
                ])
            );
            if (!confirmed) return;
        }

        setActionLoading(true);
        try {
            switch (action) {
                case "accept":
                    await driverService.acceptOrder(Number(id));
                    break;
                case "pickup":
                    await driverService.pickupOrder(Number(id));
                    break;
                case "deliver":
                    await driverService.deliverOrder(Number(id));
                    break;
                case "reject":
                    await driverService.rejectOrder(Number(id));
                    break;
            }
            await fetchOrder();
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Action failed");
        } finally {
            setActionLoading(false);
        }
    };

    const openMaps = (address: string) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        Linking.openURL(url);
    };

    const callCustomer = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const handleSubmitCustomerRating = async () => {
        if (custRating === 0) {
            Alert.alert("Error", "Please select a rating");
            return;
        }
        setSubmittingRating(true);
        try {
            await driverService.rateCustomer(Number(id), {
                rating: custRating,
                comment: custComment.trim() || undefined,
            });
            setCustomerRated(true);
            setShowRatingModal(false);
            setCustRating(0);
            setCustComment("");
            Alert.alert("Success", "Thank you for rating the customer!");
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to submit rating");
        } finally {
            setSubmittingRating(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#16a34a" />
                </View>
            </SafeAreaView>
        );
    }

    if (!order) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text style={{ color: "#6b7280" }}>Order not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={22} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order #{order.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16a34a"]} />}
            >
                {/* Customer Info */}
                {(() => {
                    const cust = order.customer || order.user;
                    return (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <User size={16} color="#16a34a" />
                                <Text style={styles.cardTitle}>Customer</Text>
                            </View>
                            <Text style={styles.customerName}>
                                {cust?.first_name} {cust?.last_name}
                            </Text>
                            {cust?.phone && (
                                <TouchableOpacity
                                    style={styles.callRow}
                                    onPress={() => callCustomer(cust.phone!)}
                                >
                                    <View style={styles.callIcon}>
                                        <Phone size={14} color="#16a34a" />
                                    </View>
                                    <Text style={styles.callText}>{cust.phone}</Text>
                                    <Text style={styles.callAction}>Call</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })()}

                {/* Delivery Address */}
                {(() => {
                    const addr = order.address;
                    let addrStr = "No address provided";

                    if (typeof order.delivery_address === "string") {
                        addrStr = order.delivery_address;
                    } else if (order.delivery_address && typeof order.delivery_address === "object") {
                        // delivery_address is actually an address object
                        const da = order.delivery_address as any;
                        addrStr = `${da.building || ""} ${da.street || ""}, ${da.area || ""}, ${da.city || ""}`.trim();
                    } else if (addr && typeof addr === "object") {
                        addrStr = `${addr.building} ${addr.street}, ${addr.area}, ${addr.city}`;
                    }

                    return (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <MapPin size={16} color="#16a34a" />
                                <Text style={styles.cardTitle}>Delivery Address</Text>
                            </View>
                            <Text style={styles.address}>{addrStr}</Text>
                            {addrStr !== "No address provided" && (
                                <TouchableOpacity style={styles.navigateBtn} onPress={() => openMaps(addrStr)}>
                                    <Navigation size={16} color="#fff" />
                                    <Text style={styles.navigateBtnText}>Navigate</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })()}

                {/* Order Items */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <ShoppingBag size={16} color="#16a34a" />
                        <Text style={styles.cardTitle}>
                            Items ({order.items?.length || 0})
                        </Text>
                    </View>
                    {order.items?.map((item: any, idx: number) => (
                        <View key={idx} style={styles.itemRow}>
                            <View style={styles.itemQty}>
                                <Text style={styles.itemQtyText}>{item.quantity}x</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{item.product_name || item.name || `Item #${idx + 1}`}</Text>
                                {item.variant && <Text style={styles.itemVariant}>{item.variant}</Text>}
                            </View>
                            <Text style={styles.itemPrice}>
                                {Number(item.total || item.price * item.quantity).toFixed(2)} EGP
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Payment Summary */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <CreditCard size={16} color="#16a34a" />
                        <Text style={styles.cardTitle}>Payment</Text>
                    </View>
                    <SummaryRow label="Subtotal" value={`${Number(order.subtotal || 0).toFixed(2)} EGP`} />
                    <SummaryRow label="Delivery Fee" value={`${Number(order.delivery_fee || 0).toFixed(2)} EGP`} />
                    {Number(order.discount || 0) > 0 && (
                        <SummaryRow label="Discount" value={`-${Number(order.discount).toFixed(2)} EGP`} color="#16a34a" />
                    )}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{Number(order.total || 0).toFixed(2)} EGP</Text>
                    </View>
                    <View style={styles.paymentMethod}>
                        <Text style={styles.pmLabel}>Method:</Text>
                        <Text style={styles.pmValue}>{order.payment_method || "Cash"}</Text>
                    </View>
                </View>

                {/* Order Timeline */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Clock size={16} color="#16a34a" />
                        <Text style={styles.cardTitle}>Timeline</Text>
                    </View>
                    {order.created_at && (
                        <TimelineItem label="Order Placed" time={order.created_at} />
                    )}
                    {order.confirmed_at && (
                        <TimelineItem label="Confirmed" time={order.confirmed_at} />
                    )}
                    {order.picked_up_at && (
                        <TimelineItem label="Picked Up" time={order.picked_up_at} />
                    )}
                    {order.delivered_at && (
                        <TimelineItem label="Delivered" time={order.delivered_at} />
                    )}
                </View>
            </ScrollView>

            {/* Action Buttons */}
            {renderActions(order, actionLoading, handleAction)}

            {/* Delivery Map Button */}
            {["preparing", "ready_for_pickup", "out_for_delivery"].includes(order.status) && (
                <View style={styles.mapBar}>
                    <TouchableOpacity
                        style={styles.mapBtn}
                        onPress={() => router.push(`/order/map?id=${order.id}`)}
                        activeOpacity={0.8}
                    >
                        <Map size={18} color="#fff" />
                        <Text style={styles.mapBtnText}>Delivery Map</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Rate Customer Banner (shown for delivered orders) */}
            {order.status === "delivered" && !customerRated && (
                <View style={styles.rateBar}>
                    <TouchableOpacity
                        style={styles.rateBtn}
                        onPress={() => setShowRatingModal(true)}
                        activeOpacity={0.8}
                    >
                        <Star size={18} color="#fff" fill="#fff" />
                        <Text style={styles.rateBtnText}>Rate Customer</Text>
                    </TouchableOpacity>
                </View>
            )}

            {order.status === "delivered" && customerRated && (
                <View style={styles.rateBar}>
                    <View style={styles.ratedBadge}>
                        <CheckCircle2 size={16} color="#16a34a" />
                        <Text style={styles.ratedText}>Customer rated — thank you!</Text>
                    </View>
                </View>
            )}

            {/* Customer Rating Modal */}
            <Modal
                visible={showRatingModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRatingModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Rate Customer</Text>
                        {(() => {
                            const cust = order.customer || order.user;
                            return cust ? (
                                <Text style={styles.modalSubtitle}>
                                    How was your experience with {cust.first_name} {cust.last_name}?
                                </Text>
                            ) : null;
                        })()}

                        {/* Stars */}
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <TouchableOpacity key={s} onPress={() => setCustRating(s)} activeOpacity={0.7}>
                                    <Star
                                        size={36}
                                        color={s <= custRating ? "#f59e0b" : "#d1d5db"}
                                        fill={s <= custRating ? "#f59e0b" : "transparent"}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.modalLabel}>Comment (optional)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Was the customer easy to find? Any notes?"
                            placeholderTextColor="#9ca3af"
                            value={custComment}
                            onChangeText={setCustComment}
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => {
                                    setShowRatingModal(false);
                                    setCustRating(0);
                                    setCustComment("");
                                }}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSubmitBtn, custRating === 0 && { opacity: 0.5 }]}
                                onPress={handleSubmitCustomerRating}
                                disabled={submittingRating || custRating === 0}
                            >
                                {submittingRating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalSubmitText}>Submit</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function renderActions(
    order: Order,
    loading: boolean,
    onAction: (action: "accept" | "pickup" | "deliver" | "reject", msg?: string) => void
) {
    const status = order.status;

    if (["delivered", "cancelled", "rejected"].includes(status)) return null;

    return (
        <View style={styles.actionBar}>
            {loading ? (
                <ActivityIndicator size="large" color="#16a34a" />
            ) : (
                <>
                    {status === "confirmed" && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.rejectBtn]}
                                onPress={() => onAction("reject", "Reject this order?")}
                            >
                                <XCircle size={20} color="#ef4444" />
                                <Text style={styles.rejectBtnText}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.acceptBtn]}
                                onPress={() => onAction("accept")}
                            >
                                <CheckCircle2 size={20} color="#fff" />
                                <Text style={styles.acceptBtnText}>Accept Order</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {(status === "preparing" || status === "ready_for_pickup") && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.pickupBtn]}
                            onPress={() => onAction("pickup")}
                        >
                            <Package size={20} color="#fff" />
                            <Text style={styles.pickupBtnText}>Mark Picked Up</Text>
                        </TouchableOpacity>
                    )}

                    {status === "out_for_delivery" && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.deliverBtn]}
                            onPress={() => onAction("deliver", "Confirm delivery to customer?")}
                        >
                            <Truck size={20} color="#fff" />
                            <Text style={styles.deliverBtnText}>Mark Delivered</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
        </View>
    );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={[styles.summaryValue, color ? { color } : null]}>{value}</Text>
        </View>
    );
}

function TimelineItem({ label, time }: { label: string; time: string }) {
    const d = new Date(time);
    const formatted = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
    return (
        <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={{ flex: 1 }}>
                <Text style={styles.timelineLabel}>{label}</Text>
                <Text style={styles.timelineTime}>{formatted}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#f8fafc",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: "700",
        color: "#111827",
        marginLeft: 12,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: { fontSize: 12, fontWeight: "700" },
    card: {
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 14,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    cardTitle: { fontSize: 14, fontWeight: "700", color: "#374151" },
    customerName: { fontSize: 16, fontWeight: "600", color: "#111827" },
    callRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
        backgroundColor: "#f0fdf4",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    callIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#dcfce7",
        justifyContent: "center",
        alignItems: "center",
    },
    callText: { flex: 1, fontSize: 14, color: "#374151" },
    callAction: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
    address: { fontSize: 14, color: "#374151", lineHeight: 20 },
    navigateBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#3b82f6",
        borderRadius: 10,
        paddingVertical: 10,
        marginTop: 12,
    },
    navigateBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f8fafc",
    },
    itemQty: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: "#f0fdf4",
        justifyContent: "center",
        alignItems: "center",
    },
    itemQtyText: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
    itemName: { fontSize: 14, fontWeight: "500", color: "#111827" },
    itemVariant: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
    itemPrice: { fontSize: 14, fontWeight: "600", color: "#111827" },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
    },
    summaryLabel: { fontSize: 13, color: "#6b7280" },
    summaryValue: { fontSize: 13, fontWeight: "500", color: "#374151" },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
        paddingTop: 10,
        borderTopWidth: 1.5,
        borderTopColor: "#f1f5f9",
    },
    totalLabel: { fontSize: 16, fontWeight: "800", color: "#111827" },
    totalValue: { fontSize: 16, fontWeight: "800", color: "#16a34a" },
    paymentMethod: {
        flexDirection: "row",
        gap: 6,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#f8fafc",
    },
    pmLabel: { fontSize: 13, color: "#9ca3af" },
    pmValue: { fontSize: 13, fontWeight: "600", color: "#374151" },
    timelineItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 6,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#16a34a",
    },
    timelineLabel: { fontSize: 13, fontWeight: "500", color: "#374151" },
    timelineTime: { fontSize: 12, color: "#9ca3af" },
    actionBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 14,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
    },
    actionRow: { flexDirection: "row", gap: 12 },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
    },
    rejectBtn: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
    rejectBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },
    acceptBtn: { backgroundColor: "#16a34a" },
    acceptBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    pickupBtn: { backgroundColor: "#8b5cf6" },
    pickupBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    deliverBtn: { backgroundColor: "#16a34a" },
    deliverBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    // Delivery Map button
    mapBar: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
    },
    mapBtn: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#3b82f6",
        paddingVertical: 14,
        borderRadius: 14,
    },
    mapBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    // Rating UI styles
    rateBar: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 28,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
    },
    rateBtn: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#f59e0b",
        paddingVertical: 14,
        borderRadius: 14,
    },
    rateBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    ratedBadge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#f0fdf4",
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#bbf7d0",
    },
    ratedText: { fontSize: 14, color: "#16a34a", fontWeight: "600" },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        width: "100%",
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#111827",
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: "#6b7280",
        marginBottom: 20,
    },
    starsRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 14,
        color: "#6b7280",
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: "#f9fafb",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: "#111827",
        minHeight: 80,
        textAlignVertical: "top",
        marginBottom: 20,
    },
    modalBtns: {
        flexDirection: "row",
        gap: 12,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#f3f4f6",
        alignItems: "center",
    },
    modalCancelText: { color: "#6b7280", fontWeight: "700", fontSize: 15 },
    modalSubmitBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#f59e0b",
        alignItems: "center",
    },
    modalSubmitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
