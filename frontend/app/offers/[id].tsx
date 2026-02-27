import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoClipboard from "expo-clipboard";
import { CountdownTimer } from "@/components/CountdownTimer";
import Colors from "@/constants/Colors";
import { useLocalizedValue, useTranslation } from "@/i18n";
import type { Offer, OfferBogoRule } from "@/services/api/types";

const { width } = Dimensions.get("window");

// ═══════════════════════════════════════════════════════════
// TYPE THEME — per discount type
// ═══════════════════════════════════════════════════════════
const getTypeTheme = (
  t: any,
): Record<
  string,
  {
    accent: string;
    bg: string;
    gradient: [string, string];
    icon: string;
    label: string;
  }
> => ({
  percentage: {
    accent: "#7C3AED",
    bg: "#F5F3FF",
    gradient: ["#7C3AED", "#5B21B6"],
    icon: "pricetag",
    label: t.ui.percentageDiscountType,
  },
  fixed_amount: {
    accent: "#0284C7",
    bg: "#F0F9FF",
    gradient: ["#0284C7", "#0369A1"],
    icon: "cash",
    label: t.ui.fixedAmountOffType,
  },
  free_delivery: {
    accent: Colors.primary900,
    bg: Colors.primary100 || "#F0FDF4",
    gradient: [Colors.primary900, Colors.primary800],
    icon: "car",
    label: t.ui.freeDeliveryType,
  },
  bogo: {
    accent: "#DB2777",
    bg: "#FDF2F8",
    gradient: ["#DB2777", "#9D174D"],
    icon: "gift",
    label: t.ui.buyOneGetOneType,
  },
});

// ═══════════════════════════════════════════════════════════
// SCOPE BADGE CONFIG
// ═══════════════════════════════════════════════════════════
const getScopeConfig = (
  t: any,
): Record<
  string,
  { icon: string; label: string; color: string; bgColor: string }
> => ({
  order: {
    icon: "cart",
    label: t.ui.entireOrder,
    color: Colors.primary900,
    bgColor: Colors.primary100 || "#F0FDF4",
  },
  category: {
    icon: "grid",
    label: t.ui.specificCategories,
    color: "#7C3AED",
    bgColor: "#F5F3FF",
  },
  product: {
    icon: "cube",
    label: t.ui.specificProducts,
    color: "#0284C7",
    bgColor: "#F0F9FF",
  },
});

export default function OfferDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { getName } = useLocalizedValue();

  // Parse the offer data passed via route params
  const offer: Offer | null = useMemo(() => {
    try {
      if (params.offerData && typeof params.offerData === "string") {
        return JSON.parse(params.offerData) as Offer;
      }
    } catch {}
    return null;
  }, [params.offerData]);

  const typeTheme = useMemo(() => getTypeTheme(t), [t]);
  const scopeConfig = useMemo(() => getScopeConfig(t), [t]);

  if (!offer) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={64}
            color={Colors.neutralMedium}
          />
          <Text style={styles.errorText}>{t.ui.offerNotFound}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>{t.ui.goBack}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const theme = typeTheme[offer.type] || typeTheme.percentage;
  const scope = scopeConfig[offer.applies_to] || scopeConfig.order;

  // Build value display
  const valueDisplay =
    offer.type === "percentage"
      ? `${offer.value}%`
      : offer.type === "fixed_amount"
        ? `EGP ${offer.value}`
        : offer.type === "free_delivery"
          ? "FREE"
          : "BOGO";

  const valueLabel =
    offer.type === "percentage"
      ? "OFF"
      : offer.type === "fixed_amount"
        ? "OFF"
        : offer.type === "free_delivery"
          ? "DELIVERY"
          : "Deal";

  // Copy code to clipboard
  const handleCopyCode = async () => {
    await ExpoClipboard.setStringAsync(offer.code);
  };

  // Share offer
  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎉 Use code "${offer.code}" to get ${valueDisplay} ${valueLabel}! ${offer.subtitle}`,
      });
    } catch {}
  };

  // Navigate to category
  const handleViewCategory = (categoryId: number) => {
    router.push(`/categories/${categoryId}`);
  };

  // Navigate to product
  const handleViewProduct = (productId: number) => {
    router.push(`/product/${productId}`);
  };

  // Navigate to eligible items list
  const handleViewAllItems = () => {
    router.push(`/offers/items?offerId=${offer.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={Colors.neutralCharcoal}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.ui.promoCodeDetails}</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleShare}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="share-outline"
            size={24}
            color={Colors.neutralCharcoal}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Card ─── */}
        <LinearGradient
          colors={theme.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Decorative circles */}
          <View
            style={[styles.heroCircle, { top: -20, right: -20, opacity: 0.1 }]}
          />
          <View
            style={[
              styles.heroCircle,
              {
                bottom: -30,
                left: -30,
                opacity: 0.08,
                width: 120,
                height: 120,
              },
            ]}
          />

          {/* Type Badge */}
          <View style={styles.heroTypeBadge}>
            <Ionicons name={theme.icon as any} size={14} color="#fff" />
            <Text style={styles.heroTypeBadgeText}>{theme.label}</Text>
          </View>

          {/* Value */}
          <View style={styles.heroValueRow}>
            <Text style={styles.heroValue}>{valueDisplay}</Text>
            <Text style={styles.heroValueLabel}>{valueLabel}</Text>
          </View>

          {/* Code */}
          <TouchableOpacity
            style={styles.heroCodePill}
            onPress={handleCopyCode}
            activeOpacity={0.8}
          >
            <View style={styles.heroCodeInner}>
              <Text style={styles.heroCodeText}>{offer.code}</Text>
              <View style={styles.heroCopyIcon}>
                <Ionicons name="copy-outline" size={16} color={theme.accent} />
              </View>
            </View>
            <Text style={styles.heroCodeHint}>{t.ui.tapToCopy}</Text>
          </TouchableOpacity>

          {/* Subtitle */}
          <Text style={styles.heroSubtitle}>{offer.subtitle}</Text>
        </LinearGradient>

        {/* ─── Scope Badge ─── */}
        <View
          style={[
            styles.scopeCard,
            { backgroundColor: scope.bgColor, borderColor: scope.color + "30" },
          ]}
        >
          <Ionicons name={scope.icon as any} size={22} color={scope.color} />
          <View style={styles.scopeTextContainer}>
            <Text style={[styles.scopeLabel, { color: scope.color }]}>
              {t.ui.appliesTo}
              {scope.label}
            </Text>
            <Text style={styles.scopeDesc}>
              {offer.applies_to === "order"
                ? t.ui.worksOnEntireOrder
                : offer.applies_to === "category"
                  ? t.ui.validOnCategories.replace(
                      "{count}",
                      String(offer.targets.categories.length),
                    )
                  : t.ui.validOnProducts.replace(
                      "{count}",
                      String(offer.targets.products.length),
                    )}
            </Text>
          </View>
        </View>

        {/* ─── Countdown Timer ─── */}
        {offer.valid_until && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="time-outline"
                size={20}
                color={Colors.accentOrange}
              />
              <Text style={styles.sectionTitle}>{t.ui.expiresIn}</Text>
            </View>
            <View style={styles.timerContainer}>
              <CountdownTimer endDate={offer.valid_until} />
            </View>
          </View>
        )}

        {/* ─── Restrictions / Rules ─── */}
        {offer.restrictions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={Colors.neutralMedium}
              />
              <Text style={styles.sectionTitle}>{t.ui.termsAndConditions}</Text>
            </View>
            <View style={styles.restrictionsList}>
              {offer.restrictions.map((restriction, idx) => (
                <View key={idx} style={styles.restrictionItem}>
                  <View style={styles.restrictionDot} />
                  <Text style={styles.restrictionText}>{restriction}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ─── Eligible Categories ─── */}
        {offer.applies_to === "category" &&
          offer.targets.categories.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="grid-outline" size={20} color="#7C3AED" />
                <Text style={styles.sectionTitle}>
                  {t.ui.eligibleCategories}
                </Text>
                <Text style={styles.sectionCount}>
                  {offer.targets.categories.length}
                </Text>
              </View>
              {offer.targets.categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.targetRow}
                  onPress={() => handleViewCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.targetIcon, { backgroundColor: "#F5F3FF" }]}
                  >
                    <Ionicons name="grid" size={18} color="#7C3AED" />
                  </View>
                  <View style={styles.targetInfo}>
                    <Text style={styles.targetName}>{getName(cat)}</Text>
                    {cat.include_subcategories && (
                      <Text style={styles.targetMeta}>
                        {t.ui.includesSubcategories}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={Colors.neutralMedium}
                  />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.viewAllButton, { backgroundColor: "#F5F3FF" }]}
                onPress={handleViewAllItems}
              >
                <Ionicons name="grid-outline" size={18} color="#7C3AED" />
                <Text style={[styles.viewAllText, { color: "#7C3AED" }]}>
                  {t.ui.viewAllEligibleProducts}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#7C3AED" />
              </TouchableOpacity>
            </View>
          )}

        {/* ─── Eligible Products ─── */}
        {offer.applies_to === "product" &&
          offer.targets.products.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cube-outline" size={20} color="#0284C7" />
                <Text style={styles.sectionTitle}>{t.ui.eligibleProducts}</Text>
                <Text style={styles.sectionCount}>
                  {offer.targets.products.length}
                </Text>
              </View>
              {offer.targets.products.slice(0, 5).map((prod) => (
                <TouchableOpacity
                  key={prod.id}
                  style={styles.targetRow}
                  onPress={() => handleViewProduct(prod.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.targetIcon, { backgroundColor: "#F0F9FF" }]}
                  >
                    <Ionicons name="cube" size={18} color="#0284C7" />
                  </View>
                  <View style={styles.targetInfo}>
                    <Text style={styles.targetName}>{getName(prod)}</Text>
                    <Text style={styles.targetMeta}>
                      EGP {prod.sale_price ?? prod.price}
                      {prod.sale_price != null &&
                        prod.sale_price < prod.price && (
                          <Text style={styles.strikePrice}>
                            {" "}
                            EGP {prod.price}
                          </Text>
                        )}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={Colors.neutralMedium}
                  />
                </TouchableOpacity>
              ))}
              {offer.targets.products.length > 5 && (
                <TouchableOpacity
                  style={[styles.viewAllButton, { backgroundColor: "#F0F9FF" }]}
                  onPress={handleViewAllItems}
                >
                  <Ionicons name="cube-outline" size={18} color="#0284C7" />
                  <Text style={[styles.viewAllText, { color: "#0284C7" }]}>
                    {t.ui.viewAllProducts.replace(
                      "{count}",
                      String(offer.targets.products.length),
                    )}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#0284C7" />
                </TouchableOpacity>
              )}
            </View>
          )}

        {/* ─── BOGO Rules ─── */}
        {offer.type === "bogo" && offer.targets.bogo_rules.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="gift-outline" size={20} color="#DB2777" />
              <Text style={styles.sectionTitle}>{t.ui.dealRules}</Text>
            </View>
            {offer.targets.bogo_rules.map((rule, idx) => (
              <BogoRuleCard key={rule.id || idx} rule={rule} index={idx} />
            ))}
          </View>
        )}

        {/* ─── Details Grid ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={Colors.neutralMedium}
            />
            <Text style={styles.sectionTitle}>{t.ui.details}</Text>
          </View>
          <View style={styles.detailsGrid}>
            <DetailCell
              icon="calendar-outline"
              label={t.ui.validFrom}
              value={
                offer.valid_from
                  ? new Date(offer.valid_from).toLocaleDateString()
                  : "—"
              }
            />
            <DetailCell
              icon="calendar"
              label={t.ui.expiresLabel}
              value={
                offer.valid_until
                  ? new Date(offer.valid_until).toLocaleDateString()
                  : "—"
              }
            />
            <DetailCell
              icon="person-outline"
              label={t.ui.perUser}
              value={`${offer.usage_per_user}x`}
            />
            {offer.minimum_order > 0 && (
              <DetailCell
                icon="cart-outline"
                label={t.ui.minOrder}
                value={`EGP ${offer.minimum_order}`}
              />
            )}
            {offer.maximum_discount != null && (
              <DetailCell
                icon="trending-down-outline"
                label={t.ui.maxDiscount}
                value={`EGP ${offer.maximum_discount}`}
              />
            )}
          </View>
        </View>

        {/* ─── Eligibility Status ─── */}
        <View
          style={[
            styles.eligibilityCard,
            offer.eligibility.can_apply
              ? styles.eligibilityValid
              : styles.eligibilityInvalid,
          ]}
        >
          <Ionicons
            name={
              offer.eligibility.can_apply ? "checkmark-circle" : "close-circle"
            }
            size={28}
            color={
              offer.eligibility.can_apply ? Colors.primary900 : Colors.accentRed
            }
          />
          <View style={styles.eligibilityContent}>
            <Text
              style={[
                styles.eligibilityTitle,
                {
                  color: offer.eligibility.can_apply
                    ? Colors.primary900
                    : Colors.accentRed,
                },
              ]}
            >
              {offer.eligibility.can_apply
                ? t.ui.youreEligible
                : t.ui.notEligible}
            </Text>
            <Text style={styles.eligibilityMessage}>
              {offer.eligibility.message}
            </Text>
          </View>
        </View>

        {/* Spacer */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function BogoRuleCard({ rule, index }: { rule: OfferBogoRule; index: number }) {
  const { t } = useTranslation();
  const discountLabel =
    rule.get_discount_type === "free"
      ? "FREE"
      : rule.get_discount_type === "percentage"
        ? `${rule.get_discount_value}% OFF`
        : `EGP ${rule.get_discount_value} OFF`;

  return (
    <View style={styles.bogoCard}>
      <View style={styles.bogoHeader}>
        <Ionicons name="gift" size={16} color="#DB2777" />
        <Text style={styles.bogoHeaderText}>Rule #{index + 1}</Text>
      </View>
      <View style={styles.bogoFlow}>
        {/* BUY */}
        <View style={styles.bogoStep}>
          <View style={[styles.bogoStepIcon, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="cart" size={16} color="#DC2626" />
          </View>
          <Text style={styles.bogoStepLabel}>{t.ui.buy}</Text>
          <Text style={styles.bogoStepValue}>
            {rule.buy_qty}× {rule.buy_label || t.ui.anyItem}
          </Text>
        </View>

        <Ionicons
          name="arrow-forward"
          size={18}
          color={Colors.neutralMedium}
          style={{ marginHorizontal: 4 }}
        />

        {/* GET */}
        <View style={styles.bogoStep}>
          <View style={[styles.bogoStepIcon, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="gift" size={16} color={Colors.primary900} />
          </View>
          <Text style={styles.bogoStepLabel}>{t.ui.get}</Text>
          <Text style={styles.bogoStepValue}>
            {rule.get_qty}× {rule.get_label || t.ui.sameItem}
          </Text>
          <View style={styles.bogoDiscount}>
            <Text style={styles.bogoDiscountText}>{discountLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function DetailCell({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailCell}>
      <Ionicons name={icon as any} size={18} color={Colors.neutralMedium} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontFamily: "Poppins-Medium",
    fontSize: 16,
    color: Colors.neutralMedium,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary900,
    borderRadius: 8,
  },
  backButtonText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: "#fff",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
    color: Colors.neutralCharcoal,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // Hero
  heroCard: {
    borderRadius: 20,
    padding: 24,
    overflow: "hidden",
    position: "relative",
  },
  heroCircle: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
  },
  heroTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroTypeBadgeText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: "#fff",
  },
  heroValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 20,
  },
  heroValue: {
    fontFamily: "Poppins-Bold",
    fontSize: 48,
    color: "#fff",
    lineHeight: 56,
  },
  heroValueLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 20,
    color: "rgba(255,255,255,0.8)",
  },
  heroCodePill: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  heroCodeInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  heroCodeText: {
    fontFamily: "Poppins-Bold",
    fontSize: 22,
    letterSpacing: 3,
    color: "#1e293b",
  },
  heroCopyIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  heroCodeHint: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
    textAlign: "center",
  },
  heroSubtitle: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },

  // Scope Card
  scopeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  scopeTextContainer: {
    flex: 1,
  },
  scopeLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
  },
  scopeDesc: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: Colors.neutralMedium,
    marginTop: 2,
  },

  // Section
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: Colors.neutralCharcoal,
    flex: 1,
  },
  sectionCount: {
    fontFamily: "Poppins-Bold",
    fontSize: 13,
    color: "#fff",
    backgroundColor: Colors.neutralMedium,
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: "center",
    lineHeight: 26,
    overflow: "hidden",
  },

  // Timer
  timerContainer: {
    backgroundColor: "#FFF7ED",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },

  // Restrictions
  restrictionsList: {
    gap: 10,
  },
  restrictionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  restrictionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neutralMedium,
    marginTop: 7,
  },
  restrictionText: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: Colors.neutralMedium,
    lineHeight: 20,
  },

  // Target rows
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  targetIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  targetInfo: {
    flex: 1,
  },
  targetName: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    color: Colors.neutralCharcoal,
  },
  targetMeta: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
  strikePrice: {
    textDecorationLine: "line-through",
    color: Colors.neutralMedium,
    fontSize: 11,
  },

  // View All Button
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  viewAllText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
  },

  // BOGO
  bogoCard: {
    backgroundColor: "#FDF2F8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FCE7F3",
  },
  bogoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  bogoHeaderText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
    color: "#DB2777",
  },
  bogoFlow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bogoStep: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  bogoStepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  bogoStepLabel: {
    fontFamily: "Poppins-Bold",
    fontSize: 10,
    color: Colors.neutralMedium,
    letterSpacing: 1,
  },
  bogoStepValue: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: Colors.neutralCharcoal,
    textAlign: "center",
  },
  bogoDiscount: {
    backgroundColor: "#DB2777",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  bogoDiscountText: {
    fontFamily: "Poppins-Bold",
    fontSize: 11,
    color: "#fff",
  },

  // Details Grid
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailCell: {
    width: (width - 64) / 2 - 5,
    backgroundColor: Colors.neutralCloud,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  detailLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: Colors.neutralMedium,
    textAlign: "center",
  },
  detailValue: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: Colors.neutralCharcoal,
    textAlign: "center",
  },

  // Eligibility
  eligibilityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  eligibilityValid: {
    backgroundColor: Colors.primary100 || "#DCFCE7",
    borderColor: Colors.primary900 + "30",
  },
  eligibilityInvalid: {
    backgroundColor: "#FEF2F2",
    borderColor: Colors.accentRed + "30",
  },
  eligibilityContent: {
    flex: 1,
  },
  eligibilityTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
  },
  eligibilityMessage: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
});
