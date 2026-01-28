/**
 * Payment Methods Management Screen (Phase 5)
 *
 * Located at: /profile/payment-methods
 *
 * Features:
 * - List all saved cards (including expired with disabled state)
 * - Set default card (with validation)
 * - Delete card (with confirmation)
 * - Auto-refresh after actions
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  formatCardDisplay,
} from "@/services/paymentMethodsApi";
import { PaymentMethod } from "@/types";
import { Colors } from "@/constants/Colors";
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
    // Validate card is eligible
    if (method.is_expired) {
      Alert.alert(
        t.common.error,
        "This card has expired. Please add a new card.",
        [{ text: t.common.ok }],
      );
      return;
    }

    if (!method.is_verified) {
      Alert.alert(
        t.common.error,
        "This card has not been verified yet. Please use it for a payment first.",
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

      // Refresh list to show updated default
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
              if (response.data.new_default) {
                message += `\nYour new default card is •••• ${response.data.new_default.card_last_four}`;
              }

              setToastType("success");
              setToastMessage(message);
              setShowToast(true);

              // Refresh list
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
   * Render individual card item
   */
  const renderCard = ({ item }: { item: PaymentMethod }) => {
    const isActionLoading = actionLoading === item.id;
    const isDisabled = item.is_expired || !item.is_verified;

    return (
      <View style={[styles.cardContainer, isDisabled && styles.cardDisabled]}>
        {/* Card Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Ionicons
              name="card-outline"
              size={24}
              color={isDisabled ? Colors.textSecondary : Colors.primary}
            />
            <Text
              style={[styles.cardNumber, isDisabled && styles.textDisabled]}
            >
              {item.masked_card}
            </Text>
          </View>

          <View style={styles.cardMeta}>
            <Text style={[styles.cardBrand, isDisabled && styles.textDisabled]}>
              {item.card_brand.toUpperCase()}
            </Text>
            {item.expires_at && (
              <Text
                style={[styles.expiryDate, isDisabled && styles.textDisabled]}
              >
                Exp: {item.expires_at}
              </Text>
            )}
          </View>

          {/* Status Badges */}
          <View style={styles.badges}>
            {item.is_default && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>DEFAULT</Text>
              </View>
            )}
            {item.is_expired && (
              <View style={[styles.badge, styles.badgeExpired]}>
                <Text style={styles.badgeTextExpired}>EXPIRED</Text>
              </View>
            )}
            {!item.is_verified && (
              <View style={[styles.badge, styles.badgeUnverified]}>
                <Text style={styles.badgeTextUnverified}>UNVERIFIED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isActionLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              {/* Set Default Button */}
              {!item.is_default && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    isDisabled && styles.actionButtonDisabled,
                  ]}
                  onPress={() => handleSetDefault(item)}
                  disabled={isDisabled}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={isDisabled ? Colors.textSecondary : Colors.primary}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      isDisabled && styles.textDisabled,
                    ]}
                  >
                    Set Default
                  </Text>
                </TouchableOpacity>
              )}

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text
                  style={[styles.actionButtonText, { color: Colors.error }]}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <OfflineIndicator />
        {/* Header Skeleton */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Methods</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={{ padding: Spacing.lg }}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                marginBottom: Spacing.md,
                backgroundColor: Colors.neutralWhite,
                borderRadius: 12,
                padding: Spacing.md,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: Spacing.sm,
                }}
              >
                <SkeletonLoader width={50} height={32} borderRadius={8} />
                <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                  <SkeletonLoader width="60%" height={18} borderRadius={4} />
                  <View style={{ height: 6 }} />
                  <SkeletonLoader width="40%" height={14} borderRadius={4} />
                </View>
              </View>
              <View style={{ height: 12 }} />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <SkeletonLoader width={100} height={32} borderRadius={16} />
                <SkeletonLoader width={80} height={32} borderRadius={16} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Empty State */}
      {paymentMethods.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="card-outline"
            size={64}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyText}>No saved cards yet</Text>
          <Text style={styles.emptySubtext}>
            Add a card during checkout by selecting "Save this card for future
            use"
          </Text>
        </View>
      ) : (
        <FlatList
          data={paymentMethods}
          renderItem={renderCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}

      {/* Info Footer */}
      {paymentMethods.length > 0 && (
        <View style={styles.footer}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={Colors.textSecondary}
          />
          <Text style={styles.footerText}>
            Expired or unverified cards cannot be set as default
          </Text>
        </View>
      )}

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  headerRight: {
    width: 40, // Balance the back button
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.md,
  },
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardInfo: {
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: Spacing.sm,
    color: Colors.text,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 32, // Align with card number
  },
  cardBrand: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  expiryDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: Spacing.md,
  },
  textDisabled: {
    color: Colors.textSecondary,
  },
  badges: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    flexWrap: "wrap",
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: Spacing.xs,
    marginTop: Spacing.xs,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  badgeExpired: {
    backgroundColor: Colors.error,
  },
  badgeTextExpired: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  badgeUnverified: {
    backgroundColor: "#ff9800",
  },
  badgeTextUnverified: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    marginLeft: Spacing.xs,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  footerText: {
    marginLeft: Spacing.xs,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
