import React, { useCallback, useRef, useState } from "react";
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
import { addressApi } from "@/services/api/addressApi";
import { useTranslation } from "@/i18n";

export default function AddressesScreen() {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  // First-mount loading. Subsequent focuses (e.g. user came back from
  // /profile/addresses/new) do a *background* refresh so the existing
  // list stays visible — wiping it on every focus is what made the new
  // address feel like it never appeared.
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  // Cancel any in-flight load when a newer one starts (focus → focus →
  // focus rapidly when navigating back/forth). Without this, an older
  // pending response could overwrite a fresh one and revert the UI.
  const inFlightAbortRef = useRef<AbortController | null>(null);

  const loadAddresses = useCallback(async () => {
    inFlightAbortRef.current?.abort();
    const controller = new AbortController();
    inFlightAbortRef.current = controller;

    try {
      const data = (await addressApi.getAddresses()) as any;
      if (controller.signal.aborted) return;

      if (data?.success && Array.isArray(data.data)) {
        setAddresses(data.data);
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      // On the very first load, surface the error. On background refreshes
      // we silently keep the previous list — it's better UX than wiping the
      // screen with an alert every time the network blips.
      if (!hasLoadedOnceRef.current) {
        Alert.alert(t.common.error, t.addresses.failedToLoad);
      }
    } finally {
      if (!controller.signal.aborted) {
        hasLoadedOnceRef.current = true;
        setInitialLoading(false);
      }
    }
  }, [t.common.error, t.addresses.failedToLoad]);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
      return () => {
        inFlightAbortRef.current?.abort();
      };
    }, [loadAddresses]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAddresses();
    setRefreshing(false);
  };

  const handleDelete = (address: Address) => {
    Alert.alert(
      t.addresses.deleteAddress,
      t.addresses.confirmDelete.replace("{label}", address.label),
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.delete,
          style: "destructive",
          onPress: async () => {
            // Optimistic remove — UI updates immediately. If the server
            // rejects the delete we re-fetch to roll back.
            const previous = addresses;
            setAddresses((curr) => curr.filter((a) => a.id !== address.id));
            try {
              await addressApi.deleteAddress(address.id);
              loadAddresses();
            } catch {
              setAddresses(previous);
              Alert.alert(t.common.error, t.addresses.failedToDelete);
            }
          },
        },
      ],
    );
  };

  const handleSetDefault = async (id: number) => {
    // Optimistic flip — only one default at a time.
    const previous = addresses;
    setAddresses((curr) =>
      curr.map((a) => ({ ...a, is_default: a.id === id })),
    );
    try {
      await addressApi.setDefaultAddress(id);
      loadAddresses();
    } catch {
      setAddresses(previous);
      Alert.alert(t.common.error, t.addresses.failedToSetDefault);
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
              <Text style={styles.defaultText}>{t.addresses.default}</Text>
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
                  address.building
                    ? `${t.addresses.building} ${address.building}`
                    : null,
                  address.floor
                    ? `${t.addresses.floorNumber} ${address.floor}`
                    : null,
                  address.apartment
                    ? `${t.addresses.apartment} ${address.apartment}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            )}
            {address.area && (
              <Text style={styles.cityText}>{address.area}</Text>
            )}
            <Text style={styles.cityText}>{address.city}</Text>
            {address.landmark && (
              <Text style={styles.landmarkText}>
                {t.addresses.near} {address.landmark}
              </Text>
            )}
          </View>
        </View>
      </View>

      {!address.is_default && (
        <TouchableOpacity
          style={styles.setDefaultButton}
          onPress={() => handleSetDefault(address.id)}
          activeOpacity={0.9}
        >
          <Text style={styles.setDefaultText}>{t.addresses.setAsDefault}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Only show the full-screen spinner on the very first mount. On later
  // focuses we keep showing the previous list (with a small RefreshControl
  // indicator at the top via pull-to-refresh) so a freshly-created address
  // can't be hidden behind a flash of "Loading…".
  if (initialLoading && addresses.length === 0) {
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
          <Text style={styles.headerTitle}>{t.addresses.title}</Text>
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
        <Text style={styles.headerTitle}>{t.addresses.title}</Text>
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
            <Text style={styles.emptyTitle}>{t.addresses.noAddresses}</Text>
            <Text style={styles.emptyText}>
              {t.addresses.addAddressToGetStarted}
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
          <Text style={styles.addButtonText}>{t.addresses.addAddress}</Text>
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
