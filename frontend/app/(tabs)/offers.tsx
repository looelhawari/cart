import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Animated,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  Tag,
  Clock,
  Filter,
  Search,
  Copy,
  LogIn,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useStore } from "@/store";
import { getOffers, OffersQueryParams } from "@/services/api/offersApi";
import type { Offer } from "@/services/api/types";

const statusFilters: Array<OffersQueryParams["status"]> = [
  "all",
  "active",
  "upcoming",
  "expired",
];

const statusLabels: Record<string, string> = {
  all: "All",
  active: "Active",
  upcoming: "Upcoming",
  expired: "Expired",
};

const typeFilters: Array<{
  key: OffersQueryParams["type"] | "cart" | "category" | "product" | "all";
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "free_delivery", label: "Free delivery" },
  { key: "bogo", label: "Buy X Get Y" },
  { key: "cart", label: "Whole cart" },
  { key: "category", label: "Category deals" },
  { key: "product", label: "Product deals" },
];

export default function OffersScreen() {
  const { isAuthenticated, applyPromoCodeToCart } = useStore();
  const params = useLocalSearchParams();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OffersQueryParams["status"]>("all");
  const [typeFilter, setTypeFilter] = useState<OffersQueryParams["type"]>();
  const [appliesTo, setAppliesTo] = useState<OffersQueryParams["applies_to"]>();
  const [endingSoon, setEndingSoon] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftType, setDraftType] = useState<
    OffersQueryParams["type"] | "cart" | "category" | "product" | "all"
  >("all");
  const [draftEndingSoon, setDraftEndingSoon] = useState(false);

  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (params?.status && typeof params.status === "string") {
      const nextStatus = params.status as OffersQueryParams["status"];
      if (statusFilters.includes(nextStatus)) {
        setStatus(nextStatus);
      }
    }
  }, [params, params?.status]);

  const paramsToSend = useMemo(
    () => ({
      status,
      type: typeFilter,
      applies_to: appliesTo,
      ending_soon: endingSoon,
      search: search.trim() || undefined,
      sort: "recommended" as const,
    }),
    [status, typeFilter, appliesTo, endingSoon, search],
  );

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getOffers(paramsToSend);
      setOffers(response.data.offers || []);
    } catch (error: any) {
      Alert.alert("Offers", error.message || "Failed to load offers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [paramsToSend]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchOffers();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchOffers]);

  useEffect(() => {
    if (!loading) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [loading, shimmerAnim]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const openFilters = () => {
    setDraftStatus(status);
    setDraftType(
      typeFilter ??
        (appliesTo === "category"
          ? "category"
          : appliesTo === "product"
            ? "product"
            : "all"),
    );
    setDraftEndingSoon(endingSoon);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setStatus(draftStatus);
    setEndingSoon(draftEndingSoon);

    if (draftType === "all") {
      setTypeFilter(undefined);
      setAppliesTo(undefined);
    } else if (draftType === "category") {
      setTypeFilter(undefined);
      setAppliesTo("category");
    } else if (draftType === "product") {
      setTypeFilter(undefined);
      setAppliesTo("product");
    } else if (draftType === "cart") {
      setTypeFilter(undefined);
      setAppliesTo("order");
    } else {
      setTypeFilter(draftType as OffersQueryParams["type"]);
      setAppliesTo(undefined);
    }

    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftStatus("all");
    setDraftType("all");
    setDraftEndingSoon(false);
  };

  const handleApply = async (offer: Offer) => {
    if (!isAuthenticated) {
      router.push("/(auth)/login");
      return;
    }

    if (!offer.eligibility.can_apply) return;

    try {
      await applyPromoCodeToCart(offer.code);
      Alert.alert("Promo", "Promo code applied to your cart");
      router.push("/(tabs)/cart");
    } catch (error: any) {
      Alert.alert("Promo", error.message || "Failed to apply promo code");
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedCode(code);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopiedCode(null);
      }, 1500);
    } catch (error: any) {
      Alert.alert("Copy", "Failed to copy promo code");
    }
  };

  const handleViewEligibleItems = (offer: Offer) => {
    router.push({
      pathname: "/offers/items",
      params: { offerId: offer.id },
    });
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const buildPrimaryBenefit = (offer: Offer) => {
    if (offer.type === "free_delivery") {
      return "FREE DELIVERY";
    }

    if (offer.type === "bogo") {
      const rule = offer.targets.bogo_rules[0];
      if (!rule) return "BUY X GET Y";
      const buy = `${rule.buy_qty}x ${rule.buy_label}`;
      const get = `${rule.get_qty}x ${rule.get_label}`;
      const benefit =
        rule.get_discount_type === "free"
          ? "FREE"
          : rule.get_discount_type === "percentage"
            ? `${rule.get_discount_value}% OFF`
            : `EGP ${rule.get_discount_value} OFF`;
      return `BUY ${buy} GET ${get} ${benefit}`;
    }

    const valueText =
      offer.type === "percentage"
        ? `${Math.round(offer.value)}% OFF`
        : `EGP ${Math.round(offer.value)} OFF`;

    if (offer.applies_to === "product" && offer.targets.products.length > 0) {
      return `${valueText} ${offer.targets.products[0].name_en}`;
    }

    if (offer.applies_to === "category" && offer.targets.categories.length > 0) {
      return `${valueText} ${offer.targets.categories[0].name_en}`;
    }

    return `${valueText} your whole cart`;
  };

  const buildAppliesTo = (offer: Offer) => {
    if (offer.type === "free_delivery") {
      return "Applies to your delivery fee";
    }

    if (offer.type === "bogo" && offer.targets.bogo_rules.length > 0) {
      const rule = offer.targets.bogo_rules[0];
      const buy = `${rule.buy_qty}x ${rule.buy_label}`;
      const get = `${rule.get_qty}x ${rule.get_label}`;
      return `Buy: ${buy} -> Get: ${get}`;
    }

    if (offer.applies_to === "order") {
      return "Applies to your entire cart";
    }

    if (offer.applies_to === "category") {
      const categories = offer.targets.categories.map((c) => c.name_en).filter(Boolean);
      if (categories.length === 0) return "Applies to selected categories";
      const preview = categories.slice(0, 2);
      const remaining = categories.length - preview.length;
      return `Applies to: ${preview.join(", ")}${remaining > 0 ? ` +${remaining} more` : ""}`;
    }

    if (offer.applies_to === "product") {
      const products = offer.targets.products.map((p) => p.name_en).filter(Boolean);
      if (products.length === 0) return "Applies to selected products";
      const preview = products.slice(0, 2);
      const remaining = products.length - preview.length;
      return `Includes: ${preview.join(", ")}${remaining > 0 ? ` +${remaining} more` : ""}`;
    }

    return "Applies to your cart";
  };

  const buildValidity = (offer: Offer) => {
    if (offer.status === "upcoming") {
      return offer.valid_from ? `Starts ${formatDate(offer.valid_from)}` : "Upcoming";
    }

    if (offer.valid_until) {
      return `Valid until ${formatDate(offer.valid_until)}`;
    }

    return "Limited time offer";
  };

  const requirementChips = (offer: Offer) => {
    const chips: string[] = [];
    if (offer.minimum_order > 0) {
      chips.push(`Min EGP ${Math.round(offer.minimum_order)}`);
    }
    if (offer.maximum_discount) {
      chips.push(`Max EGP ${Math.round(offer.maximum_discount)}`);
    }
    if (offer.usage_per_user) {
      chips.push(`${offer.usage_per_user}x per user`);
    }
    if (offer.first_order_only) {
      chips.push("First order only");
    }
    return chips;
  };

  const getPrimaryCta = (offer: Offer) => {
    const reason = offer.eligibility.reason;

    if (!isAuthenticated) {
      return {
        label: "Log in to use",
        enabled: true,
        action: "login" as const,
      };
    }

    if (offer.status === "expired") {
      return {
        label: "Expired",
        enabled: false,
        action: "none" as const,
      };
    }

    if (offer.status === "ended") {
      return {
        label: "Ended",
        enabled: false,
        action: "none" as const,
      };
    }

    if (offer.status === "upcoming") {
      return {
        label: "Starts soon",
        enabled: false,
        action: "none" as const,
      };
    }

    if (offer.eligibility.state === "pending") {
      return {
        label: "View items",
        enabled: true,
        action: "items" as const,
      };
    }

    if (reason === "MINIMUM_NOT_MET") {
      return {
        label: "Continue shopping",
        enabled: true,
        action: "browse" as const,
      };
    }

    if (reason === "USER_LIMIT_REACHED") {
      return {
        label: "Used",
        enabled: false,
        action: "none" as const,
      };
    }

    if (reason === "USAGE_LIMIT_REACHED") {
      return {
        label: "Ended",
        enabled: false,
        action: "none" as const,
      };
    }

    if (reason === "EXPIRED") {
      return {
        label: "Expired",
        enabled: false,
        action: "none" as const,
      };
    }

    if (offer.eligibility.state === "valid") {
      return {
        label: "Apply",
        enabled: true,
        action: "apply" as const,
      };
    }

    return {
      label: "Unavailable",
      enabled: false,
      action: "none" as const,
    };
  };

  const getTimingBadge = (offer: Offer) => {
    if (offer.status === "upcoming") {
      return { label: buildValidity(offer), tone: "upcoming" as const };
    }

    if (offer.valid_until) {
      const diffMs = new Date(offer.valid_until).getTime() - Date.now();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysLeft <= 3 && daysLeft >= 0) {
        return { label: `Ends in ${daysLeft}d`, tone: "urgent" as const };
      }
      return { label: "Limited time", tone: "limited" as const };
    }

    return { label: "Limited time", tone: "limited" as const };
  };

  const skeletonOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Offers & Deals",
          headerStyle: { backgroundColor: Colors.neutralWhite },
          headerTitleStyle: {
            fontSize: Typography.h2,
            fontWeight: Typography.bold as "700",
            color: Colors.neutralCharcoal,
          },
        }}
      />
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.noticeCard}>
          <View style={styles.noticeTextWrap}>
            <Text style={styles.noticeTitle}>Browse offers as a guest</Text>
            <Text style={styles.noticeText}>
              Log in to apply offers at checkout.
            </Text>
          </View>
          {!isAuthenticated ? (
            <TouchableOpacity
              style={styles.noticeButton}
              onPress={() => router.push("/(auth)/login")}
            >
              <LogIn size={16} color={Colors.neutralWhite} />
              <Text style={styles.noticeButtonText}>Log in</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noticeBadge}>
              <Text style={styles.noticeBadgeText}>Ready</Text>
            </View>
          )}
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Search size={18} color={Colors.neutralMedium} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search offers (delivery, snacks, beverages...)"
              placeholderTextColor={Colors.neutralMedium}
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={openFilters}>
            <Filter size={18} color={Colors.neutralWhite} />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activeFiltersRow}>
          <View style={styles.activeChip}>
            <Text style={styles.activeChipText}>{statusLabels[status || "all"]}</Text>
          </View>
          {typeFilter === "free_delivery" && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>Free delivery</Text>
            </View>
          )}
          {typeFilter === "bogo" && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>BOGO</Text>
            </View>
          )}
          {appliesTo === "category" && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>Category deals</Text>
            </View>
          )}
          {appliesTo === "product" && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>Product deals</Text>
            </View>
          )}
          {appliesTo === "order" && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>Whole cart</Text>
            </View>
          )}
          {endingSoon && (
            <View style={[styles.activeChip, styles.activeChipWarn]}>
              <Text style={styles.activeChipWarnText}>Ending soon</Text>
            </View>
          )}
        </View>

        {loading ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {[1, 2, 3].map((index) => (
              <Animated.View
                key={index}
                style={[styles.skeletonCard, { opacity: skeletonOpacity }]}
              >
                <View style={styles.skeletonLineWide} />
                <View style={styles.skeletonLine} />
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLine} />
              </Animated.View>
            ))}
          </ScrollView>
        ) : offers.length === 0 ? (
          <View style={styles.emptyState}>
            <Tag size={52} color={Colors.neutralGray} />
            <Text style={styles.emptyTitle}>No offers found</Text>
            <Text style={styles.emptyText}>
              Try adjusting filters or check back later.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary900]}
              />
            }
          >
            {offers.map((offer) => {
              const requirements = requirementChips(offer);
              const validity = buildValidity(offer);
              const benefit = buildPrimaryBenefit(offer);
              const appliesLine = buildAppliesTo(offer);
              const timingBadge = getTimingBadge(offer);
              const primaryCta = getPrimaryCta(offer);

              return (
                <View key={offer.id} style={styles.offerCard}>
                  <View style={styles.offerHeaderRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {offer.type === "free_delivery"
                          ? "Free delivery"
                          : offer.type === "bogo"
                            ? "Buy X Get Y"
                            : offer.applies_to === "category"
                              ? "Category deal"
                              : offer.applies_to === "product"
                                ? "Product deal"
                                : "Whole cart"}
                      </Text>
                    </View>
                    {timingBadge && (
                      <View
                        style={[
                          styles.timeBadge,
                          timingBadge.tone === "urgent" && styles.timeBadgeUrgent,
                          timingBadge.tone === "limited" && styles.timeBadgeLimited,
                          timingBadge.tone === "upcoming" && styles.timeBadgeUpcoming,
                        ]}
                      >
                        <Clock
                          size={12}
                          color={
                            timingBadge.tone === "urgent"
                              ? Colors.neutralWhite
                              : timingBadge.tone === "limited"
                                ? Colors.accentOrange
                                : Colors.neutralMedium
                          }
                        />
                        <Text
                          style={[
                            styles.timeBadgeText,
                            timingBadge.tone === "urgent" && styles.timeBadgeTextUrgent,
                            timingBadge.tone === "limited" && styles.timeBadgeTextLimited,
                          ]}
                        >
                          {timingBadge.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.primaryBenefit}>{benefit}</Text>
                  <Text style={styles.appliesTo}>{appliesLine}</Text>

                  <View style={styles.validityRow}>
                    <View style={styles.validityBadge}>
                      <Clock size={12} color={Colors.neutralMedium} />
                      <Text style={styles.validityText}>{validity}</Text>
                    </View>
                  </View>

                  {requirements.length > 0 && (
                    <View style={styles.requirementsRow}>
                      {requirements.map((req) => (
                        <View key={req} style={styles.requirementChip}>
                          <Text style={styles.requirementText}>{req}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.codeRow}>
                    <Text style={styles.codeLabel}>Code</Text>
                    <View style={styles.codeAction}>
                      <Text style={styles.codeValue}>{offer.code}</Text>
                      <TouchableOpacity
                        style={styles.copyButton}
                        onPress={() => handleCopy(offer.code)}
                      >
                        <Copy size={14} color={Colors.primary900} />
                        <Text style={styles.copyText}>
                          {copiedCode === offer.code ? "Copied" : "Copy"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.ctaRow}>
                    <TouchableOpacity
                      style={[
                        styles.applyButton,
                        !primaryCta.enabled && styles.applyButtonDisabled,
                      ]}
                      onPress={() => {
                        if (!primaryCta.enabled) return;
                        if (primaryCta.action === "login") {
                          router.push("/(auth)/login");
                          return;
                        }
                        if (primaryCta.action === "items") {
                          handleViewEligibleItems(offer);
                          return;
                        }
                        if (primaryCta.action === "browse") {
                          router.push("/(tabs)/categories" as any);
                          return;
                        }
                        handleApply(offer);
                      }}
                      disabled={!primaryCta.enabled}
                    >
                      <Text style={styles.applyButtonText}>{primaryCta.label}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => handleViewEligibleItems(offer)}
                    >
                      <Text style={styles.secondaryButtonText}>View items</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <Modal transparent visible={filterOpen} animationType="slide">
          <Pressable style={styles.sheetBackdrop} onPress={() => setFilterOpen(false)}>
            <Pressable style={styles.sheetCard}>
              <Text style={styles.sheetTitle}>Filter offers</Text>

              <Text style={styles.sheetLabel}>Offer type</Text>
              <View style={styles.sheetOptions}>
                {typeFilters.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sheetOption,
                      draftType === option.key && styles.sheetOptionActive,
                    ]}
                    onPress={() => setDraftType(option.key)}
                  >
                    <Text
                      style={[
                        styles.sheetOptionText,
                        draftType === option.key && styles.sheetOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sheetLabel}>Status</Text>
              <View style={styles.sheetOptions}>
                {statusFilters.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.sheetOption,
                      draftStatus === option && styles.sheetOptionActive,
                    ]}
                    onPress={() => setDraftStatus(option)}
                  >
                    <Text
                      style={[
                        styles.sheetOptionText,
                        draftStatus === option && styles.sheetOptionTextActive,
                      ]}
                    >
                      {statusLabels[option]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.toggleRow,
                  draftEndingSoon && styles.toggleRowActive,
                ]}
                onPress={() => setDraftEndingSoon((prev) => !prev)}
              >
                <View>
                  <Text style={styles.toggleTitle}>Ending soon</Text>
                  <Text style={styles.toggleSubtitle}>Offers ending within 48 hours</Text>
                </View>
                <View
                  style={[
                    styles.toggleIndicator,
                    draftEndingSoon && styles.toggleIndicatorActive,
                  ]}
                />
              </TouchableOpacity>

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.sheetReset} onPress={resetFilters}>
                  <Text style={styles.sheetResetText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetApply} onPress={applyFilters}>
                  <Text style={styles.sheetApplyText}>Apply filters</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  noticeCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold as "700",
    color: Colors.neutralCharcoal,
  },
  noticeText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 4,
  },
  noticeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
  },
  noticeButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodySmall,
    fontWeight: Typography.bold as "700",
  },
  noticeBadge: {
    backgroundColor: Colors.neutralLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
  },
  noticeBadgeText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  searchRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.xs,
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
  },
  filterButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
  },
  activeFiltersRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  activeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.neutralLight,
  },
  activeChipText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  activeChipWarn: {
    backgroundColor: `${Colors.accentOrange}20`,
  },
  activeChipWarnText: {
    fontSize: Typography.bodySmall,
    color: Colors.accentOrange,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  offerCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  offerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  badge: {
    backgroundColor: `${Colors.accentOrange}20`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.bold as "700",
    color: Colors.accentOrange,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.neutralLight,
  },
  timeBadgeUrgent: {
    backgroundColor: Colors.accentOrange,
  },
  timeBadgeLimited: {
    backgroundColor: `${Colors.accentYellow}33`,
  },
  timeBadgeUpcoming: {
    backgroundColor: Colors.neutralLight,
  },
  timeBadgeText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    fontWeight: Typography.semibold,
  },
  timeBadgeTextUrgent: {
    color: Colors.neutralWhite,
  },
  timeBadgeTextLimited: {
    color: Colors.accentOrange,
  },
  primaryBenefit: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold as "700",
    color: Colors.neutralCharcoal,
  },
  appliesTo: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginTop: 4,
  },
  validityRow: {
    marginTop: Spacing.xs,
  },
  validityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.neutralLight,
    alignSelf: "flex-start",
  },
  validityText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  requirementsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  requirementChip: {
    backgroundColor: Colors.neutralLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requirementText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  codeRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
    gap: Spacing.xs,
  },
  codeLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  codeAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  codeValue: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold as "700",
    color: Colors.primary900,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: `${Colors.primary900}10`,
  },
  copyText: {
    fontSize: Typography.bodySmall,
    color: Colors.primary900,
    fontWeight: Typography.semibold,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  applyButton: {
    flex: 1,
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    alignItems: "center",
  },
  applyButtonDisabled: {
    backgroundColor: Colors.neutralGray,
  },
  applyButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.bold as "700",
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    fontWeight: Typography.semibold,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold as "700",
    color: Colors.neutralCharcoal,
  },
  emptyText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    textAlign: "center",
  },
  skeletonCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
    gap: Spacing.sm,
  },
  skeletonLineWide: {
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.neutralGray,
  },
  skeletonLine: {
    height: 12,
    width: "85%",
    borderRadius: 8,
    backgroundColor: Colors.neutralGray,
  },
  skeletonLineShort: {
    height: 12,
    width: "60%",
    borderRadius: 8,
    backgroundColor: Colors.neutralGray,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: Colors.neutralWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sheetTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold as "700",
    color: Colors.neutralCharcoal,
  },
  sheetLabel: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.sm,
  },
  sheetOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sheetOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    backgroundColor: Colors.neutralLight,
  },
  sheetOptionActive: {
    backgroundColor: `${Colors.primary900}15`,
  },
  sheetOptionText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    fontWeight: Typography.semibold,
  },
  sheetOptionTextActive: {
    color: Colors.primary900,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.neutralLight,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  toggleRowActive: {
    borderColor: Colors.accentOrange,
    backgroundColor: `${Colors.accentOrange}10`,
  },
  toggleTitle: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  toggleSubtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
  toggleIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.neutralMedium,
  },
  toggleIndicatorActive: {
    borderColor: Colors.accentOrange,
    backgroundColor: Colors.accentOrange,
  },
  sheetActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  sheetReset: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    borderRadius: 16,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  sheetResetText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  sheetApply: {
    flex: 1,
    backgroundColor: Colors.primary900,
    borderRadius: 16,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  sheetApplyText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.bold as "700",
    color: Colors.neutralWhite,
  },
});
