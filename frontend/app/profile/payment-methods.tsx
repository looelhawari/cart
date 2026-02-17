/**
 * Payment Methods Management Screen
 *
 * Located at: /profile/payment-methods
 *
 * Features:
 * - List all saved cards with premium UI
 * - Set default card (with validation)
 * - Delete card (with confirmation)
 * - Empty state with guidance
 * - Pull-to-refresh
 * - Skeleton loading
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  CreditCard,
  Trash,
  CheckCircle,
  ShieldCheck,
  Star,
  AlertCircle,
  Clock,
  Info,
} from "lucide-react-native";
import {
  getPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
} from "@/services/paymentMethodsApi";
import { PaymentMethod } from "@/types";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { Toast } from "@/components/Toast";
import { useTranslation } from "@/i18n";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import OfflineIndicator from "@/components/OfflineIndicator";

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "info",
  );

  /**
   * Fetch payment methods from API
   */
  const fetchPaymentMethods = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const methods = await getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error: any) {
      console.error("[PaymentMethods] Error fetching:", error);
      setToastType("error");
      setToastMessage(
        error.message || t.paymentMethods.failedToLoadPaymentMethods,
      );
      setShowToast(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPaymentMethods(false);
  }, []);

  /**
   * Handle set default card
   */
  const handleSetDefault = async (method: PaymentMethod) => {
    if (method.is_expired) {
      Alert.alert(
        t.common.error,
        "This card has expired and cannot be set as default.",
        [{ text: t.common.ok }],
      );
      return;
    }

    if (!method.is_verified) {
      Alert.alert(
        t.common.error,
        "This card is not verified yet. Use it for a payment first.",
        [{ text: t.common.ok }],
      );
      return;
    }

    try {
      setActionLoading(method.id);
      await setDefaultPaymentMethod(method.id);

      setToastType("success");
      setToastMessage(t.paymentMethods.cardSetAsDefault);
      setShowToast(true);

      await fetchPaymentMethods(false);
    } catch (error: any) {
      console.error("[PaymentMethods] Error setting default:", error);
      setToastType("error");
      setToastMessage(error.message || t.paymentMethods.failedToSetDefault);
      setShowToast(true);
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Handle delete card
   */
  const handleDelete = (method: PaymentMethod) => {
    Alert.alert(
      t.paymentMethods.deleteCard,
      `${t.paymentMethods.confirmDeleteCard}`,
      [
        {
          text: t.common.cancel,
          style: "cancel",
        },
        {
          text: t.common.delete,
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(method.id);
              const response = await deletePaymentMethod(method.id);

              let message = t.paymentMethods.cardDeleted;
              if (response.data?.new_default) {
                message += `\nNew default: •••• ${response.data.new_default.card_last_four}`;
              }

              setToastType("success");
              setToastMessage(message);
              setShowToast(true);

              await fetchPaymentMethods(false);
            } catch (error: any) {
              console.error("[PaymentMethods] Error deleting:", error);
              setToastType("error");
              setToastMessage(
                error.message || t.paymentMethods.failedToDeleteCard,
              );
              setShowToast(true);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  /**
   * Get card brand display icon
   */
  const getCardBrandColor = (brand: string) => {
    switch (brand?.toLowerCase()) {
      case "visa":
        return "#1A1F71";
      case "mastercard":
        return "#EB001B";
      case "amex":
        return "#006FCF";
      default:
        return Colors.primary900;
    }
  };

  /**
   * Render individual card item
   */
  const renderCard = ({ item }: { item: PaymentMethod }) => {
    const isActionLoading = actionLoading === item.id;
    const isDisabled = item.is_expired || !item.is_verified;
    const brandColor = getCardBrandColor(item.card_brand);

    return (
      <View style={[styles.cardContainer, isDisabled && styles.cardDisabled]}>
        {/* Default badge */}
        {item.is_default && (
          <View style={styles.defaultRibbon}>
            <Star size={12} color={Colors.neutralWhite} />
            <Text style={styles.defaultRibbonText}>Default</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          {/* Card visual strip */}
          <View style={[styles.cardStrip, { backgroundColor: brandColor }]}>
            <CreditCard size={22} color={Colors.neutralWhite} />
          </View>

          {/* Card details */}
          <View style={styles.cardDetails}>
            <Text style={[styles.cardNumber, isDisabled && styles.textMuted]}>
              {item.masked_card}
            </Text>
            <View style={styles.cardMetaRow}>
              <Text style={[styles.cardBrand, isDisabled && styles.textMuted]}>
                {item.card_brand?.toUpperCase()}
              </Text>
              {item.expires_at && (
                <>
                  <View style={styles.metaDot} />
                  <Text
                    style={[
                      styles.cardExpiry,
                      isDisabled && styles.textMuted,
                      item.is_expired && styles.textDanger,
                    ]}
                  >
                    {item.is_expired ? "Expired" : `Exp: ${item.expires_at}`}
                  </Text>
                </>
              )}
            </View>

            {/* Status badges */}
            <View style={styles.badgesRow}>
              {item.is_expired && (
                <View style={[styles.badge, styles.badgeExpired]}>
                  <Clock size={10} color={Colors.neutralWhite} />
                  <Text style={styles.badgeText}>EXPIRED</Text>
                </View>
              )}
              {!item.is_verified && (
                <View style={[styles.badge, styles.badgeWarning]}>
                  <AlertCircle size={10} color={Colors.neutralWhite} />
                  <Text style={styles.badgeText}>UNVERIFIED</Text>
                </View>
              )}
              {item.is_verified && !item.is_expired && (
                <View style={[styles.badge, styles.badgeVerified]}>
                  <CheckCircle size={10} color={Colors.neutralWhite} />
                  <Text style={styles.badgeText}>VERIFIED</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          {isActionLoading ? (
            <View style={styles.actionLoadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary900} />
            </View>
          ) : (
            <>
              {/* Set Default Button */}
              {!item.is_default && !isDisabled && (
                <TouchableOpacity
                  style={styles.setDefaultButton}
                  onPress={() => handleSetDefault(item)}
                  activeOpacity={0.7}
                >
                  <CheckCircle size={16} color={Colors.primary900} />
                  <Text style={styles.setDefaultText}>Set as Default</Text>
                </TouchableOpacity>
              )}

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
                activeOpacity={0.7}
              >
                <Trash size={16} color={Colors.accentRed} />
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  /**
   * Render skeleton loading
   */
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonContent}>
            <SkeletonLoader width={44} height={44} borderRadius={12} />
            <View style={{ marginLeft: Spacing.md, flex: 1 }}>
              <SkeletonLoader width="70%" height={18} borderRadius={4} />
              <View style={{ height: 8 }} />
              <SkeletonLoader width="45%" height={14} borderRadius={4} />
              <View style={{ height: 8 }} />
              <SkeletonLoader width={70} height={20} borderRadius={10} />
            </View>
          </View>
          <View style={styles.skeletonActions}>
            <SkeletonLoader width={110} height={34} borderRadius={10} />
            <SkeletonLoader width={80} height={34} borderRadius={10} />
          </View>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <OfflineIndicator />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t.paymentMethods?.title || "Payment Methods"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        {renderSkeleton()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineIndicator />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.paymentMethods?.title || "Payment Methods"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Empty State */}
      {paymentMethods.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <CreditCard size={40} color={Colors.primary900} />
          </View>
          <Text style={styles.emptyTitle}>No Saved Cards</Text>
          <Text style={styles.emptySubtext}>
            When you save a card during checkout, it will appear here for quick
            access.
          </Text>

          <View style={styles.emptySteps}>
            <View style={styles.emptyStepRow}>
              <View style={styles.emptyStepNumber}>
                <Text style={styles.emptyStepNumberText}>1</Text>
              </View>
              <Text style={styles.emptyStepText}>
                Choose Card payment at checkout
              </Text>
            </View>
            <View style={styles.emptyStepRow}>
              <View style={styles.emptyStepNumber}>
                <Text style={styles.emptyStepNumberText}>2</Text>
              </View>
              <Text style={styles.emptyStepText}>
                {'Check "Save this card for future purchases"'}
              </Text>
            </View>
            <View style={styles.emptyStepRow}>
              <View style={styles.emptyStepNumber}>
                <Text style={styles.emptyStepNumberText}>3</Text>
              </View>
              <Text style={styles.emptyStepText}>
                Complete payment — card is saved automatically
              </Text>
            </View>
          </View>

          <View style={styles.emptySecurityNote}>
            <ShieldCheck size={16} color={Colors.primary900} />
            <Text style={styles.emptySecurityText}>
              Your cards are stored securely encrypted
            </Text>
          </View>
        </View>
      ) : (
        /* Cards List */
        <FlatList
          data={paymentMethods}
          renderItem={renderCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary900}
              colors={[Colors.primary900]}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.cardCount}>
                {paymentMethods.length} saved card
                {paymentMethods.length !== 1 ? "s" : ""}
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <View style={styles.footerInfo}>
                <Info size={14} color={Colors.neutralMedium} />
                <Text style={styles.footerText}>
                  Expired or unverified cards cannot be set as default
                </Text>
              </View>
              <View style={styles.footerSecurity}>
                <ShieldCheck size={14} color={Colors.primary900} />
                <Text style={styles.footerSecurityText}>
                  All cards are stored securely encrypted
                </Text>
              </View>
            </View>
          }
        />
      )}

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },

  /* ── Header ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },

  /* ── Card Item ── */
  cardContainer: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    marginBottom: Spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.neutralLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  cardDisabled: {
    opacity: 0.65,
  },

  defaultRibbon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary900,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    gap: 4,
  },

  defaultRibbonText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.neutralWhite,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },

  cardStrip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  cardDetails: {
    flex: 1,
  },

  cardNumber: {
    fontSize: Typography.bodyBase,
    fontWeight: "700",
    color: Colors.neutralCharcoal,
    letterSpacing: 0.5,
  },

  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  cardBrand: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    fontWeight: "600",
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.neutralGray,
    marginHorizontal: Spacing.xs,
  },

  cardExpiry: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },

  textMuted: {
    color: Colors.neutralMedium,
  },

  textDanger: {
    color: Colors.accentRed,
    fontWeight: "600",
  },

  badgesRow: {
    flexDirection: "row",
    marginTop: Spacing.xs,
    gap: 6,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },

  badgeText: {
    color: Colors.neutralWhite,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  badgeExpired: {
    backgroundColor: Colors.accentRed,
  },

  badgeWarning: {
    backgroundColor: Colors.accentOrange,
  },

  badgeVerified: {
    backgroundColor: Colors.primary900,
  },

  /* ── Actions ── */
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },

  actionLoadingContainer: {
    paddingVertical: Spacing.sm,
  },

  setDefaultButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },

  setDefaultText: {
    fontSize: Typography.bodySmall,
    fontWeight: "600",
    color: Colors.primary900,
  },

  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },

  deleteText: {
    fontSize: Typography.bodySmall,
    fontWeight: "600",
    color: Colors.accentRed,
  },

  /* ── List ── */
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  listHeader: {
    marginBottom: Spacing.sm,
  },

  cardCount: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    fontWeight: "500",
  },

  /* ── Empty State ── */
  emptyContainer: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },

  emptyTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },

  emptySubtext: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },

  emptySteps: {
    alignSelf: "stretch",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
    marginBottom: Spacing.lg,
  },

  emptyStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },

  emptyStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary900,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyStepNumberText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodySmall,
    fontWeight: "700",
  },

  emptyStepText: {
    flex: 1,
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    fontWeight: "500",
  },

  emptySecurityNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    gap: Spacing.xs,
  },

  emptySecurityText: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.primary900,
    fontWeight: "500",
  },

  /* ── Footer ── */
  footer: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },

  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },

  footerText: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },

  footerSecurity: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },

  footerSecurityText: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.primary900,
    fontWeight: "500",
  },

  /* ── Skeleton ── */
  skeletonContainer: {
    padding: Spacing.md,
  },

  skeletonCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },

  skeletonContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },

  skeletonActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  },
});
