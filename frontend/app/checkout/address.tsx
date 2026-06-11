import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  Plus,
  Check,
  AlertTriangle,
} from "lucide-react-native";
import { getAddresses, CheckoutAddress } from "@/services/api/checkoutApi";
import {
  deliveryZoneApi,
  type CoverageResult,
} from "@/services/api/deliveryZoneApi";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { useTranslation } from "@/i18n";

export default function CheckoutAddressScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<CheckoutAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null,
  );
  const [zoneValidation, setZoneValidation] = useState<{
    checking: boolean;
    result: CoverageResult | null;
  }>({ checking: false, result: null });

  // Refetch on every focus, not just on mount: this screen stays mounted
  // while the user pushes the add-address screen, so a newly created
  // address has to be picked up when focus returns here.
  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const fetchAddresses = async () => {
    try {
      // Full-screen loader only before the first load; focus-triggered
      // refreshes keep the current list on screen while updating silently.
      setLoading((prev) => prev && addresses.length === 0);
      console.log("📍 Fetching checkout addresses...");
      const response = await getAddresses();
      console.log(
        "📍 Addresses response:",
        JSON.stringify(response).substring(0, 300),
      );

      // apiRequest returns the full Laravel response: { success, data: { addresses: [...] } }
      // So we need to access response.data.addresses
      const addressList = response.data?.addresses || response.addresses || [];
      setAddresses(addressList);
      console.log("📍 Set addresses count:", addressList.length);

      // Keep the user's current selection if it still exists; otherwise
      // auto-select the default address.
      setSelectedAddressId((current) => {
        if (
          current !== null &&
          addressList.some((addr: CheckoutAddress) => addr.id === current)
        ) {
          return current;
        }
        const defaultAddress = addressList.find(
          (addr: CheckoutAddress) => addr.is_default,
        );
        return defaultAddress ? defaultAddress.id : null;
      });
    } catch (error: any) {
      console.error("📍 Error fetching addresses:", error);
      Alert.alert(
        t.common.error,
        error.message || t.checkout.failedToLoadAddresses,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = async (addressId: number) => {
    setSelectedAddressId(addressId);

    // Validate zone coverage for the selected address
    try {
      setZoneValidation({ checking: true, result: null });
      const response = await deliveryZoneApi.validateAddress(addressId);
      const data = response.data || response;
      setZoneValidation({
        checking: false,
        result: {
          covered: data.valid,
          zone: data.zone,
          delivery_fee: data.delivery_fee || 0,
          message: data.message || "",
        },
      });
    } catch (error) {
      // If zone validation fails (e.g., API not available yet), allow checkout
      setZoneValidation({ checking: false, result: null });
    }
  };

  const handleContinue = () => {
    if (!selectedAddressId) {
      Alert.alert(t.checkout.selectAddress, t.checkout.pleaseSelectAddress);
      return;
    }

    // Warn if address is outside delivery zone (but allow to continue)
    if (zoneValidation.result && !zoneValidation.result.covered) {
      Alert.alert(
        t.checkout?.outsideZoneTitle || "Outside Delivery Area",
        t.checkout?.outsideZoneMessage ||
          "This address may be outside our delivery area. Delivery may not be available.",
        [
          { text: t.common?.cancel || "Cancel", style: "cancel" },
          {
            text: t.checkout?.continueAnyway || "Continue Anyway",
            onPress: () => {
              router.push({
                pathname: "/checkout/payment" as any,
                params: { addressId: selectedAddressId },
              });
            },
          },
        ],
      );
      return;
    }

    router.push({
      pathname: "/checkout/payment" as any,
      params: { addressId: selectedAddressId },
    });
  };

  const handleAddNewAddress = () => {
    router.push("/profile/addresses/new" as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.loadingText}>{t.checkout.loadingAddresses}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.checkout.deliveryAddress}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressBar}>
          <View style={[styles.progressDot, styles.progressDotActive]}>
            <Text style={styles.progressText}>1</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressDot}>
            <Text style={[styles.progressText, styles.progressTextInactive]}>
              2
            </Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressDot}>
            <Text style={[styles.progressText, styles.progressTextInactive]}>
              3
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {addresses.length === 0
            ? t.checkout.noSavedAddresses
            : t.checkout.savedAddresses}
        </Text>

        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MapPin size={64} color={Colors.neutralGray} />
            <Text style={styles.emptyTitle}>{t.checkout.noAddressesSaved}</Text>
            <Text style={styles.emptyText}>
              {t.checkout.addAddressToCheckout}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddNewAddress}
            >
              <Plus size={20} color={Colors.neutralWhite} />
              <Text style={styles.addButtonText}>{t.checkout.addAddress}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {addresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[
                  styles.addressCard,
                  selectedAddressId === address.id &&
                    styles.addressCardSelected,
                ]}
                onPress={() => handleSelectAddress(address.id)}
              >
                <View style={styles.addressHeader}>
                  <View style={styles.addressLabelRow}>
                    <MapPin size={16} color={Colors.primary900} />
                    <Text style={styles.addressLabel}>{address.label}</Text>
                    {address.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>
                          {t.checkout.defaultAddress}
                        </Text>
                      </View>
                    )}
                  </View>
                  {selectedAddressId === address.id && (
                    <View style={styles.checkCircle}>
                      <Check size={16} color={Colors.neutralWhite} />
                    </View>
                  )}
                </View>
                <Text style={styles.addressText}>
                  {address.street}
                  {address.building
                    ? `, ${t.checkout.building} ${address.building}`
                    : ""}
                  {address.floor
                    ? `, ${t.checkout.floor} ${address.floor}`
                    : ""}
                  {address.apartment
                    ? `, ${t.checkout.apt} ${address.apartment}`
                    : ""}
                </Text>
                <Text style={styles.addressText}>
                  {[address.area, address.city].filter(Boolean).join(", ")}
                </Text>
                {address.landmark && (
                  <Text style={styles.addressLandmark}>
                    {t.checkout.near}: {address.landmark}
                  </Text>
                )}

                {/* Zone validation status */}
                {selectedAddressId === address.id &&
                  zoneValidation.checking && (
                    <View style={styles.zoneStatusRow}>
                      <ActivityIndicator
                        size="small"
                        color={Colors.primary900}
                      />
                      <Text style={styles.zoneCheckingText}>
                        {t.checkout?.checkingDeliveryZone ||
                          "Checking delivery zone..."}
                      </Text>
                    </View>
                  )}
                {selectedAddressId === address.id &&
                  !zoneValidation.checking &&
                  zoneValidation.result && (
                    <View
                      style={[
                        styles.zoneStatusRow,
                        zoneValidation.result.covered
                          ? styles.zoneOkBg
                          : styles.zoneNotOkBg,
                      ]}
                    >
                      {zoneValidation.result.covered ? (
                        <>
                          <Check size={14} color="#16a34a" />
                          <Text style={styles.zoneOkText}>
                            {zoneValidation.result.zone?.name || "In zone"} —{" "}
                            {t.common.currency}{" "}
                            {zoneValidation.result.delivery_fee} {t.ui.delivery}
                            {zoneValidation.result.zone
                              ?.estimated_delivery_time &&
                              ` • ${zoneValidation.result.zone.estimated_delivery_time}`}
                          </Text>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={14} color="#dc2626" />
                          <Text style={styles.zoneNotOkText}>
                            {t.checkout?.outsideDeliveryArea ||
                              "Outside delivery area"}
                          </Text>
                        </>
                      )}
                    </View>
                  )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={handleAddNewAddress}
            >
              <Plus size={20} color={Colors.primary900} />
              <Text style={styles.addAddressText}>
                {t.checkout.addNewAddress}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {addresses.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedAddressId && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedAddressId}
          >
            <Text style={styles.continueText}>
              {t.checkout.continueToReview}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
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
  scrollView: {
    flex: 1,
  },
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.neutralWhite,
    marginBottom: Spacing.md,
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutralGray,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: {
    backgroundColor: Colors.primary900,
  },
  progressText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  progressTextInactive: {
    color: Colors.neutralMedium,
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: Colors.neutralGray,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl * 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.neutralWhite,
  },
  addressCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  addressCardSelected: {
    borderColor: Colors.primary900,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  addressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  addressLabel: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  defaultBadge: {
    backgroundColor: Colors.primary900 + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultText: {
    fontSize: Typography.bodySmall,
    color: Colors.primary900,
    fontWeight: Typography.semibold,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary900,
    alignItems: "center",
    justifyContent: "center",
  },
  addressText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    marginBottom: 2,
  },
  addressLandmark: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralGray,
    marginTop: 4,
    fontStyle: "italic",
  },
  addAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderStyle: "dashed",
  },
  addAddressText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  bottomBar: {
    backgroundColor: Colors.neutralWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
    padding: Spacing.md,
  },
  continueButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
  },
  continueButtonDisabled: {
    backgroundColor: Colors.neutralGray,
  },
  continueText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  zoneStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  zoneCheckingText: {
    fontSize: 12,
    color: Colors.neutralGray,
  },
  zoneOkBg: {
    backgroundColor: "#f0fdf4",
  },
  zoneOkText: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "500" as any,
  },
  zoneNotOkBg: {
    backgroundColor: "#fef2f2",
  },
  zoneNotOkText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "500" as any,
  },
});
