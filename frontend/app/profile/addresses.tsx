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
import { MapPin, Plus, Check, Edit2, Trash2 } from "lucide-react-native";

import { router, useFocusEffect } from "expo-router";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { addressApi } from "@/services/api";

interface Address {
  id: number;
  label: string;
  street: string;
  city: string;
  is_default: boolean;
}

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh when screen is focused (e.g., after adding/editing)
  useFocusEffect(
    React.useCallback(() => {
      loadAddresses();
    }, [])
  );

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const response: any = await addressApi.getAddresses();
      setAddresses(response.data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load addresses"
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAddresses();
    setRefreshing(false);
  };

  const handleDelete = (id: number, label: string) => {
    Alert.alert(
      "Delete Address",
      `Are you sure you want to delete "${label}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await addressApi.deleteAddress(id);
              await loadAddresses();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete address"
              );
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (id: number) => {
    try {
      await addressApi.setDefaultAddress(id);
      await loadAddresses();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to set default address"
      );
    }
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin size={64} color={Colors.neutralMedium} />
            <Text style={styles.emptyTitle}>No Addresses</Text>
            <Text style={styles.emptyText}>
              You haven't added any delivery addresses yet.
            </Text>
          </View>
        ) : (
          addresses.map((address) => (
            <View key={address.id} style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <View style={styles.addressLeft}>
                  <View style={styles.iconContainer}>
                    <MapPin size={20} color={Colors.primary900} />
                  </View>
                  <View style={styles.addressInfo}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>{address.label}</Text>
                      {address.is_default && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultText}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.addressText}>{address.street}</Text>
                    <Text style={styles.cityText}>{address.city}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actions}>
                {!address.is_default && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSetDefault(address.id)}
                  >
                    <Check size={16} color={Colors.primary900} />
                    <Text style={styles.actionText}>Set as Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    router.push(`/profile/add-address?id=${address.id}`)
                  }
                >
                  <Edit2 size={16} color={Colors.primary900} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(address.id, address.label)}
                >
                  <Trash2 size={16} color={Colors.accentRed} />
                  <Text style={[styles.actionText, styles.deleteText]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => router.push("/profile/add-address")}
        >
          <Plus size={24} color={Colors.primary900} />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  addressCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  addressLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary900}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  addressInfo: {
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: 4,
  },
  label: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  defaultBadge: {
    backgroundColor: Colors.primary700,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultText: {
    fontSize: 10,
    color: Colors.neutralWhite,
    fontWeight: Typography.bold,
  },
  addressText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginBottom: 2,
  },
  cityText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    backgroundColor: `${Colors.primary900}10`,
  },
  deleteButton: {
    backgroundColor: `${Colors.accentRed}10`,
  },
  actionText: {
    fontSize: Typography.bodySmall,
    color: Colors.primary900,
    fontWeight: Typography.semibold,
  },
  deleteText: {
    color: Colors.accentRed,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary900,
    borderStyle: "dashed",
    marginBottom: Spacing.lg,
  },
  addButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
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
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: Typography.h2,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
  },
});
