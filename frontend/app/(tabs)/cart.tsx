import React, { useState, useCallback, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    TextInput,
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, X, ChevronRight } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import Colors from "@/constants/Colors";
import Spacing from "@/constants/Spacing";
import { Button } from "@/components/Button";
import { useStore } from "@/store";
import { GuestModal } from "@/components/GuestModal";
import { useTranslation, useLocalizedValue } from "@/i18n";

const { width } = Dimensions.get("window");

export default function CartScreen() {
    const { t } = useTranslation();
    const { getName } = useLocalizedValue();
    const {
        cart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyPromoCodeToCart,
        removePromoCodeFromCart,
        fetchCart,
        user,
        cartLoading,
    } = useStore();
    const [promoCode, setPromoCode] = useState("");
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        useCallback(() => {
            fetchCart().then(() => {
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            }).catch((error) => {
                console.error("Failed to refresh cart:", error);
            });
        }, []),
    );

    const cartItems = cart?.items || [];
    const subtotal = cart?.subtotal || 0;
    const discount = cart?.discount || 0;
    const deliveryFee = cart?.delivery_fee || 0;
    const tax = cart?.tax || 0;
    const total = cart?.total || 0;
    const appliedPromo = cart?.promo_code || null;

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;

        setIsApplyingPromo(true);
        try {
            await applyPromoCodeToCart(promoCode.trim());
            setPromoCode("");
            Alert.alert(t.common?.success || "Success", "Promo code applied successfully!");
        } catch (error: any) {
            Alert.alert(
                "Invalid Code",
                error.message || "This promo code is not valid or has expired.",
            );
        } finally {
            setIsApplyingPromo(false);
        }
    };

    const handleRemovePromo = async () => {
        try {
            await removePromoCodeFromCart();
        } catch (error) {
            console.error("Failed to remove promo:", error);
        }
    };

    const handleCheckout = () => {
        if (!user) {
            setShowGuestModal(true);
            return;
        }
        router.push("/checkout/address" as any);
    };

    // Loading state
    if (cartLoading && (!cart || !cart.items || cart.items.length === 0)) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingIcon}>
                        <Ionicons name="bag" size={32} color={Colors.primary900} />
                    </View>
                    <Text style={styles.loadingText}>{t.common?.loading || "Loading..."}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Empty cart state
    if (cartItems.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                {/* Header */}
                <View style={styles.header}>
                    <LinearGradient
                        colors={[Colors.primary900, Colors.primary800]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerGradient}
                    >
                        <View style={styles.headerTop}>
                            <View style={styles.brandContainer}>
                                <View style={styles.brandIcon}>
                                    <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
                                </View>
                                <Text style={styles.brandName}>ElBaraka</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="bag-outline" size={60} color={Colors.neutralGray} />
                    </View>
                    <Text style={styles.emptyTitle}>{t.cart?.emptyCart || "Your Cart is Empty"}</Text>
                    <Text style={styles.emptyText}>{t.cart?.emptyCartDesc || "Add items to get started"}</Text>
                    <TouchableOpacity
                        style={styles.shopButton}
                        onPress={() => router.push("/(tabs)/categories")}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={[Colors.primary700, Colors.primary900]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.shopButtonGradient}
                        >
                            <Text style={styles.shopButtonText}>{t.cart?.continueShopping || "Start Shopping"}</Text>
                            <ChevronRight size={18} color={Colors.neutralWhite} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* ═══════════════════════════════════════════════════════════════════════════
          BRANDED HEADER
      ═══════════════════════════════════════════════════════════════════════════ */}
            <View style={styles.header}>
                <LinearGradient
                    colors={[Colors.primary900, Colors.primary800]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <View style={styles.headerTop}>
                        <View style={styles.brandContainer}>
                            <View style={styles.brandIcon}>
                                <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
                            </View>
                            <Text style={styles.brandName}>ElBaraka</Text>
                        </View>

                        <TouchableOpacity
                            onPress={async () => {
                                try {
                                    await clearCart();
                                } catch (error) {
                                    console.error("Failed to clear cart:", error);
                                }
                            }}
                            style={styles.clearButton}
                        >
                            <Ionicons name="trash" size={16} color={Colors.neutralWhite} />
                            <Text style={styles.clearText}>{t.cart?.clearCart || "Clear"}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Cart Summary Strip */}
                    <View style={styles.cartSummaryStrip}>
                        <View style={styles.cartSummaryItem}>
                            <Ionicons name="bag" size={16} color={Colors.neutralWhite} />
                            <Text style={styles.cartSummaryText}>{cartItems.length} {t.common?.items || "items"}</Text>
                        </View>
                        <View style={styles.cartSummaryDivider} />
                        <View style={styles.cartSummaryItem}>
                            <Text style={styles.cartSummaryTotal}>{parseFloat(total?.toString() || "0").toFixed(2)} {t.common?.currency || "EGP"}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                {/* ═══════════════════════════════════════════════════════════════════════════
            CART ITEMS
        ═══════════════════════════════════════════════════════════════════════════ */}
                <Text style={styles.sectionTitle}>{t.cart?.title || "Shopping Cart"}</Text>

                {cartItems.map((item: any, index: number) => (
                    <Animated.View
                        key={item.id}
                        style={[
                            styles.cartItem,
                            { opacity: fadeAnim }
                        ]}
                    >
                        <Image
                            source={{ uri: item.product?.image }}
                            style={styles.itemImage}
                        />

                        <View style={styles.itemDetails}>
                            <Text style={styles.itemName} numberOfLines={2}>
                                {getName(item.product)}
                            </Text>
                            <Text style={styles.itemPrice}>
                                {parseFloat(item.price?.toString() || "0").toFixed(2)} {t.common?.currency || "EGP"}
                            </Text>

                            <View style={styles.quantityRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.quantityButton,
                                        item.quantity === 1 && styles.quantityButtonDanger
                                    ]}
                                    onPress={async () => {
                                        try {
                                            if (item.quantity > 1) {
                                                await updateQuantity(item.id, item.quantity - 1);
                                            } else {
                                                await removeFromCart(item.id);
                                            }
                                        } catch (error) {
                                            console.error("Failed to update cart:", error);
                                        }
                                    }}
                                >
                                    {item.quantity === 1 ? (
                                        <Ionicons name="trash" size={14} color={Colors.accentRed} />
                                    ) : (
                                        <Ionicons name="remove" size={14} color={Colors.primary900} />
                                    )}
                                </TouchableOpacity>

                                <View style={styles.quantityDisplay}>
                                    <Text style={styles.quantity}>{item.quantity}</Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.quantityButton}
                                    onPress={async () => {
                                        try {
                                            await updateQuantity(item.id, item.quantity + 1);
                                        } catch (error) {
                                            console.error("Failed to update cart:", error);
                                        }
                                    }}
                                >
                                    <Plus size={14} color={Colors.primary900} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={async () => {
                                try {
                                    await removeFromCart(item.id);
                                } catch (error) {
                                    console.error("Failed to remove item:", error);
                                }
                            }}
                        >
                            <X size={18} color={Colors.neutralMedium} />
                        </TouchableOpacity>
                    </Animated.View>
                ))}

                {/* ═══════════════════════════════════════════════════════════════════════════
            PROMO CODE SECTION
        ═══════════════════════════════════════════════════════════════════════════ */}
                <View style={styles.promoContainer}>
                    <View style={styles.promoHeader}>
                        <View style={styles.promoIcon}>
                            <Ionicons name="pricetag" size={16} color={Colors.primary900} />
                        </View>
                        <Text style={styles.promoTitle}>{t.cart?.havePromoCode || "Have a Promo Code?"}</Text>
                    </View>

                    {appliedPromo ? (
                        <View style={styles.appliedPromoCard}>
                            <LinearGradient
                                colors={[Colors.primary100, Colors.primary100]}
                                style={styles.appliedPromoGradient}
                            >
                                <View style={styles.appliedPromoLeft}>
                                    <View style={styles.appliedPromoIconBg}>
                                        <Ionicons name="pricetag" size={16} color={Colors.primary900} />
                                    </View>
                                    <View style={styles.appliedPromoText}>
                                        <Text style={styles.appliedPromoCode}>{appliedPromo}</Text>
                                        <Text style={styles.appliedPromoSaved}>
                                            You saved {parseFloat(discount?.toString() || "0").toFixed(2)} {t.common?.currency || "EGP"}!
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={handleRemovePromo}
                                    style={styles.removePromoButton}
                                >
                                    <X size={18} color={Colors.neutralMedium} />
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    ) : (
                        <View style={styles.promoInputRow}>
                            <TextInput
                                style={styles.promoInput}
                                placeholder={t.cart?.enterPromoCode || "Enter code"}
                                placeholderTextColor={Colors.neutralMedium}
                                value={promoCode}
                                onChangeText={setPromoCode}
                                autoCapitalize="characters"
                                editable={!isApplyingPromo}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.applyButton,
                                    (!promoCode.trim() || isApplyingPromo) && styles.applyButtonDisabled,
                                ]}
                                onPress={handleApplyPromo}
                                disabled={!promoCode.trim() || isApplyingPromo}
                                activeOpacity={0.9}
                            >
                                {isApplyingPromo ? (
                                    <ActivityIndicator size="small" color={Colors.neutralWhite} />
                                ) : (
                                    <Text style={styles.applyButtonText}>{t.cart?.apply || "Apply"}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ═══════════════════════════════════════════════════════════════════════════
            ORDER SUMMARY
        ═══════════════════════════════════════════════════════════════════════════ */}
                <View style={styles.summary}>
                    <Text style={styles.summaryTitle}>Order Summary</Text>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t.orders?.subtotal || "Subtotal"}</Text>
                        <Text style={styles.summaryValue}>
                            {parseFloat(subtotal?.toString() || "0").toFixed(2)} {t.common?.currency || "EGP"}
                        </Text>
                    </View>

                    {discount > 0 && (
                        <View style={styles.summaryRow}>
                            <View style={styles.discountLabelRow}>
                                <Ionicons name="pricetag" size={12} color={Colors.primary900} />
                                <Text style={[styles.summaryLabel, styles.discountLabel]}>{t.orders?.discount || "Discount"}</Text>
                            </View>
                            <Text style={[styles.summaryValue, styles.discountValue]}>
                                -{parseFloat(discount?.toString() || "0").toFixed(2)} {t.common?.currency || "EGP"}
                            </Text>
                        </View>
                    )}

                    <View style={styles.summaryRow}>
                        <View style={styles.deliveryLabelRow}>
                            <Ionicons name="car" size={12} color={Colors.neutralMedium} />
                            <Text style={styles.summaryLabel}>{t.orders?.deliveryFee || "Delivery"}</Text>
                        </View>
                        <Text style={[styles.summaryValue, deliveryFee === 0 && styles.freeDelivery]}>
                            {deliveryFee === 0 ? t.common?.free || "FREE" : `${parseFloat(deliveryFee?.toString() || "0").toFixed(2)} ${t.common?.currency || "EGP"}`}
                        </Text>
                    </View>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t.orders?.tax || "Tax"} (14%)</Text>
                        <Text style={styles.summaryValue}>
                            {parseFloat(tax?.toString() || "0").toFixed(2)} {t.common?.currency || "EGP"}
                        </Text>
                    </View>

                    <View style={styles.totalDivider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{t.orders?.total || "Total"}</Text>
                        <Text style={styles.totalValue}>
                            {parseFloat(total?.toString() || "0").toFixed(2)} {t.common?.currency || "EGP"}
                        </Text>
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ═══════════════════════════════════════════════════════════════════════════
          CHECKOUT FOOTER
      ═══════════════════════════════════════════════════════════════════════════ */}
            <View style={styles.footer}>
                <View style={styles.footerContent}>
                    <View style={styles.footerLeft}>
                        <Text style={styles.footerLabel}>{t.orders?.total || "Total"}</Text>
                        <Text style={styles.footerTotal}>
                            {parseFloat(total?.toString() || "0").toFixed(2)} {t.common?.currency || "EGP"}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.checkoutButton}
                        onPress={handleCheckout}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={[Colors.primary700, Colors.primary900]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.checkoutButtonGradient}
                        >
                            <Text style={styles.checkoutButtonText}>{t.cart?.checkout || "Checkout"}</Text>
                            <ChevronRight size={20} color={Colors.neutralWhite} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>

            <GuestModal
                visible={showGuestModal}
                onClose={() => setShowGuestModal(false)}
                message={t.cart?.signInToCheckout || "Sign in to checkout"}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.neutralCloud,
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════════════════════════════════════
    header: {
        overflow: "hidden",
    },
    headerGradient: {
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 16,
        borderBottomLeftRadius: 26,
        borderBottomRightRadius: 26,
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    brandContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    brandIcon: {
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    brandName: {
        fontSize: 22,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralWhite,
        letterSpacing: 0.3,
    },
    clearButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 6,
    },
    clearText: {
        fontSize: 12,
        fontFamily: "Poppins-SemiBold",
        color: Colors.neutralWhite,
    },
    cartSummaryStrip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    cartSummaryItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    cartSummaryText: {
        fontSize: 13,
        fontFamily: "Poppins-Medium",
        color: "rgba(255,255,255,0.9)",
    },
    cartSummaryDivider: {
        width: 1,
        height: 16,
        backgroundColor: "rgba(255,255,255,0.3)",
        marginHorizontal: 16,
    },
    cartSummaryTotal: {
        fontSize: 16,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralWhite,
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CONTENT
    // ═══════════════════════════════════════════════════════════════════════════
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralCharcoal,
        marginTop: 18,
        marginBottom: 14,
    },
    cartItem: {
        flexDirection: "row",
        backgroundColor: Colors.neutralWhite,
        padding: 14,
        borderRadius: 18,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    itemImage: {
        width: 75,
        height: 75,
        borderRadius: 14,
        backgroundColor: Colors.neutralLight,
    },
    itemDetails: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "space-between",
    },
    itemName: {
        fontSize: 14,
        fontFamily: "Poppins-SemiBold",
        color: Colors.neutralCharcoal,
        marginBottom: 2,
    },
    itemPrice: {
        fontSize: 15,
        fontFamily: "Poppins-Bold",
        color: Colors.primary900,
    },
    quantityRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 6,
    },
    quantityButton: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: Colors.primary100,
        alignItems: "center",
        justifyContent: "center",
    },
    quantityButtonDanger: {
        backgroundColor: Colors.accentRed + "15",
    },
    quantityDisplay: {
        backgroundColor: Colors.neutralLight,
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 8,
    },
    quantity: {
        fontSize: 14,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralCharcoal,
    },
    removeButton: {
        padding: 6,
        alignSelf: "flex-start",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // PROMO CODE
    // ═══════════════════════════════════════════════════════════════════════════
    promoContainer: {
        backgroundColor: Colors.neutralWhite,
        borderRadius: 18,
        padding: 16,
        marginTop: 6,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    promoHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
        gap: 8,
    },
    promoIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: Colors.primary100,
        alignItems: "center",
        justifyContent: "center",
    },
    promoTitle: {
        fontSize: 14,
        fontFamily: "Poppins-SemiBold",
        color: Colors.neutralCharcoal,
    },
    promoInputRow: {
        flexDirection: "row",
        gap: 10,
    },
    promoInput: {
        flex: 1,
        height: 46,
        borderWidth: 1.5,
        borderColor: Colors.neutralGray,
        borderRadius: 14,
        paddingHorizontal: 14,
        fontSize: 14,
        fontFamily: "Poppins-Medium",
        color: Colors.neutralCharcoal,
        backgroundColor: Colors.neutralCloud,
    },
    applyButton: {
        backgroundColor: Colors.primary900,
        paddingHorizontal: 22,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    applyButtonDisabled: {
        backgroundColor: Colors.neutralGray,
    },
    applyButtonText: {
        color: Colors.neutralWhite,
        fontSize: 14,
        fontFamily: "Poppins-SemiBold",
    },
    appliedPromoCard: {
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1.5,
        borderColor: Colors.primary900,
    },
    appliedPromoGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
    },
    appliedPromoLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    appliedPromoIconBg: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: Colors.primary900 + "20",
        alignItems: "center",
        justifyContent: "center",
    },
    appliedPromoText: {
        flex: 1,
    },
    appliedPromoCode: {
        fontSize: 14,
        fontFamily: "Poppins-Bold",
        color: Colors.primary900,
    },
    appliedPromoSaved: {
        fontSize: 12,
        fontFamily: "Poppins-Regular",
        color: Colors.primary700,
    },
    removePromoButton: {
        padding: 6,
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════
    summary: {
        backgroundColor: Colors.neutralWhite,
        borderRadius: 18,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    summaryTitle: {
        fontSize: 16,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralCharcoal,
        marginBottom: 14,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    summaryLabel: {
        fontSize: 13,
        fontFamily: "Poppins-Regular",
        color: Colors.neutralMedium,
    },
    summaryValue: {
        fontSize: 14,
        fontFamily: "Poppins-SemiBold",
        color: Colors.neutralCharcoal,
    },
    discountLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    discountLabel: {
        color: Colors.primary900,
    },
    discountValue: {
        color: Colors.primary900,
    },
    deliveryLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    freeDelivery: {
        color: Colors.primary900,
        fontFamily: "Poppins-Bold",
    },
    totalDivider: {
        height: 1,
        backgroundColor: Colors.neutralGray,
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: {
        fontSize: 16,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralCharcoal,
    },
    totalValue: {
        fontSize: 20,
        fontFamily: "Poppins-Bold",
        color: Colors.primary900,
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════════════════════════════════
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.neutralWhite,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    footerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingVertical: 16,
        paddingBottom: 28,
    },
    footerLeft: {},
    footerLabel: {
        fontSize: 12,
        fontFamily: "Poppins-Regular",
        color: Colors.neutralMedium,
    },
    footerTotal: {
        fontSize: 22,
        fontFamily: "Poppins-Bold",
        color: Colors.primary900,
    },
    checkoutButton: {
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: Colors.primary900,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    checkoutButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 28,
        paddingVertical: 14,
        gap: 6,
    },
    checkoutButtonText: {
        fontSize: 16,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralWhite,
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // EMPTY & LOADING STATES
    // ═══════════════════════════════════════════════════════════════════════════
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingIcon: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: Colors.primary100,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: "Poppins-Medium",
        color: Colors.neutralMedium,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.neutralLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralCharcoal,
        marginBottom: 8,
        textAlign: "center",
    },
    emptyText: {
        fontSize: 14,
        fontFamily: "Poppins-Regular",
        color: Colors.neutralMedium,
        textAlign: "center",
        marginBottom: 24,
    },
    shopButton: {
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: Colors.primary900,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    shopButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 28,
        paddingVertical: 14,
        gap: 6,
    },
    shopButtonText: {
        fontSize: 16,
        fontFamily: "Poppins-Bold",
        color: Colors.neutralWhite,
    },
});
