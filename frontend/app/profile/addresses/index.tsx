import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MapPin,
  Plus,
  Check,
  Edit2,
  Trash2,
  ArrowLeft,
  Home,
  Briefcase,
  MapPinned,
} from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { Address } from "@/types";
import { authApi } from "@/services/api";
import { API_CONFIG } from "@/config/app.config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadAddresses();
    }, []),
  );

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/addresses`, {
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "ElBaraka-Mobile-App",
          Authorization: `Bearer ${await getToken()}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setAddresses(data.data);
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  const getToken = async () => {
    return await AsyncStorage.getItem("access_token");
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAddresses();
    setRefreshing(false);
  };

  const handleDelete = (address: Address) => {
    Alert.alert(
      "Delete Address",
      `Are you sure you want to delete this ${address.label} address?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_CONFIG.BASE_URL}/addresses/${address.id}`,
                {
                  method: "DELETE",
                  headers: {
                    Accept: "application/json",
                    "ngrok-skip-browser-warning": "true",
                    "User-Agent": "ElBaraka-Mobile-App",
                    Authorization: `Bearer ${await getToken()}`,
                  },
                },
              );
              if (response.ok) {
                await loadAddresses();
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete address");
            }
          },
        },
      ],
    );
  };

  const handleSetDefault = async (id: number) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/addresses/${id}/default`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "ElBaraka-Mobile-App",
            Authorization: `Bearer ${await getToken()}`,
          },
        },
      );
      if (response.ok) {
        await loadAddresses();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to set default address");
    }
  };

  const getLabelIcon = (label: string) => {
    switch (label) {
      case "Home":
        return <Home size={20} color={Colors.primary900} />;
      case "Work":
        return <Briefcase size={20} color={Colors.primary900} />;
      default:
        return <MapPinned size={20} color={Colors.primary900} />;
    }
  };

  const renderAddress = (address: Address) => (
    <View key={address.id} style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <View style={styles.labelContainer}>
          {getLabelIcon(address.label)}
          <Text style={styles.labelText}>{address.label}</Text>
          {address.is_default && (
            <View style={styles.defaultBadge}>
              <Check size={14} color={Colors.neutralWhite} />
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              router.push(`/profile/addresses/${address.id}` as any)
            }
            activeOpacity={0.7}
          >
            <Edit2 size={18} color={Colors.primary900} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(address)}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.addressDetails}>
        <Text style={styles.recipientName}>{address.recipient_name}</Text>
        <Text style={styles.phone}>{address.phone}</Text>

        <View style={styles.addressTextContainer}>
          <MapPin
            size={16}
            color={Colors.neutralMedium}
            style={styles.locationIcon}
          />
          <View style={styles.addressText}>
            <Text style={styles.street}>{address.street}</Text>
            {(address.building || address.floor || address.apartment) && (
              <Text style={styles.detailsText}>
                {[
                  address.building,
                  `Floor ${address.floor}`,
                  `Apt ${address.apartment}`,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            )}
            <Text style={styles.cityText}>
              {[address.area, address.city].filter(Boolean).join(", ")}
            </Text>
            {address.landmark && (
              <Text style={styles.landmarkText}>Near {address.landmark}</Text>
            )}
          </View>
        </View>

        {address.notes && (
          <Text style={styles.notesText}>Note: {address.notes}</Text>
        )}
      </View>

      {!address.is_default && (
        <TouchableOpacity
          style={styles.setDefaultButton}
          onPress={() => handleSetDefault(address.id)}
          activeOpacity={0.9}
        >
          <Text style={styles.setDefaultText}>Set as Default</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Addresses</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin size={64} color={Colors.neutralMedium} />
            <Text style={styles.emptyTitle}>No Addresses Yet</Text>
            <Text style={styles.emptyText}>
              Add your delivery addresses to checkout faster
            </Text>
          </View>
        ) : (
          addresses.map((address) => renderAddress(address))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/profile/addresses/new" as any)}
          activeOpacity={0.9}
        >
          <Plus size={24} color={Colors.neutralWhite} />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
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
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 24,
  },
  addressCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.neutralCharcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  labelText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  defaultText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
    color: Colors.neutralWhite,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutralCloud,
    alignItems: "center",
    justifyContent: "center",
  },
  addressDetails: {
    gap: Spacing.xs,
  },
  recipientName: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  phone: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  addressTextContainer: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  locationIcon: {
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    gap: 4,
  },
  street: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    lineHeight: 20,
  },
  detailsText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  cityText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  landmarkText: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary700,
    fontStyle: "italic",
  },
  notesText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    fontStyle: "italic",
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
  },
  setDefaultButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.neutralCloud,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary900,
  },
  setDefaultText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    gap: Spacing.sm,
  },
  addButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
});
