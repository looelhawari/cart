import React, { useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { ArrowLeft, MapPin, Plus, Check } from "lucide-react-native";
import { getAddresses, CheckoutAddress } from "@/services/api/checkoutApi";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";

export default function CheckoutAddressScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<CheckoutAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null
  );

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await getAddresses();
      setAddresses(response.data.addresses || []);

      // Auto-select default address
      const defaultAddress = response.data.addresses?.find(
        (addr) => addr.is_default
      );
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedAddressId) {
      Alert.alert("Select Address", "Please select a delivery address");
      return;
    }
    router.push({
      pathname: "/checkout/confirmation" as any,
      params: { addressId: selectedAddressId },
    });
  };

  const handleAddNewAddress = () => {
    router.push("/profile/add-address" as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.loadingText}>Loading addresses...</Text>
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
        <Text style={styles.headerTitle}>Delivery Address</Text>
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
          {addresses.length === 0 ? "No Saved Addresses" : "Saved Addresses"}
        </Text>

        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MapPin size={64} color={Colors.neutralGray} />
            <Text style={styles.emptyTitle}>No addresses saved</Text>
            <Text style={styles.emptyText}>
              Add a delivery address to continue with checkout
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddNewAddress}
            >
              <Plus size={20} color={Colors.neutralWhite} />
              <Text style={styles.addButtonText}>Add Address</Text>
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
                onPress={() => setSelectedAddressId(address.id)}
              >
                <View style={styles.addressHeader}>
                  <View style={styles.addressLabelRow}>
                    <MapPin size={16} color={Colors.primary900} />
                    <Text style={styles.addressLabel}>{address.label}</Text>
                    {address.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                  {selectedAddressId === address.id && (
                    <View style={styles.checkCircle}>
                      <Check size={16} color={Colors.neutralWhite} />
                    </View>
                  )}
                </View>
                <Text style={styles.addressName}>{address.recipient_name}</Text>
                <Text style={styles.addressPhone}>{address.phone_number}</Text>
                <Text style={styles.addressText}>
                  {address.street_address}
                  {address.building_number
                    ? `, Building ${address.building_number}`
                    : ""}
                  {address.floor ? `, Floor ${address.floor}` : ""}
                  {address.apartment ? `, Apt ${address.apartment}` : ""}
                </Text>
                <Text style={styles.addressText}>
                  {address.city}, {address.governorate}
                  {address.postal_code ? `, ${address.postal_code}` : ""}
                </Text>
                {address.landmark && (
                  <Text style={styles.addressLandmark}>
                    Near: {address.landmark}
                  </Text>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={handleAddNewAddress}
            >
              <Plus size={20} color={Colors.primary900} />
              <Text style={styles.addAddressText}>Add New Address</Text>
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
            <Text style={styles.continueText}>Continue to Order Review</Text>
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
  addressName: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginBottom: 4,
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
});
