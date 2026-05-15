import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Animated,
  TextInput,
  InteractionManager,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Dimensions,
  Easing,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AlertCircle } from "lucide-react-native";
import * as ExpoClipboard from "expo-clipboard";
import { CountdownTimer } from "@/components/CountdownTimer";
import type { Promotion } from "@/types/promotion";
import type { Offer, OfferBogoRule } from "@/services/api/types";
import { getPromotions } from "@/services/api/promotionApi";
import { getOffers, getOffersSummary } from "@/services/api/offersApi";
import Colors from "@/constants/Colors";
import { useTranslation, useLocalizedValue } from "@/i18n";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import OfflineIndicator from "@/components/OfflineIndicator";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
type SectionKey =
  | "featured"
  | "automatic"
  | "percentage"
  | "fixed_amount"
  | "free_delivery"
  | "bogo";

type FilterKey =
  | "all"
  | "promotions"
  | "coupons"
  | "percentage"
  | "fixed_amount"
  | "free_delivery"
  | "bogo";

// ═══════════════════════════════════════════════════════════
// FILTER BOTTOM SHEET DATA
// ═══════════════════════════════════════════════════════════
type FilterSection = {
  title: string;
  subtitle: string;
  filters: {
    key: FilterKey;
    label: string;
    icon: string;
    color: string;
    description: string;
  }[];
};

const getFilterSections = (t: any): FilterSection[] => [
  {
    title: t.ui.dealType,
    subtitle: t.ui.chooseDealKind,
    filters: [
      {
        key: "all",
        label: t.ui.allDeals,
        icon: "apps",
        color: Colors.primary900,
        description: t.ui.showEverything,
      },
      {
        key: "promotions",
        label: t.ui.autoDiscounts,
        icon: "flash",
        color: Colors.primary900,
        description: t.ui.appliedAtCheckout,
      },
      {
        key: "coupons",
        label: t.ui.promoCodes,
        icon: "ticket",
        color: "#D97706",
        description: t.ui.enterCodeToRedeem,
      },
    ],
  },
  {
    title: t.ui.promoCodeType,
    subtitle: t.ui.filterByDiscount,
    filters: [
      {
        key: "percentage",
        label: t.ui.percentageOff,
        icon: "pricetag",
        color: "#7C3AED",
        description: t.ui.getPercentOff,
      },
      {
        key: "fixed_amount",
        label: t.ui.fixedAmountOff,
        icon: "cash",
        color: "#0284C7",
        description: t.ui.getEgpOff,
      },
      {
        key: "free_delivery",
        label: t.ui.freeDelivery,
        icon: "car",
        color: Colors.primary900,
        description: t.ui.noDeliveryCharges,
      },
      {
        key: "bogo",
        label: t.ui.buyOneGetOne,
        icon: "gift",
        color: "#DB2777",
        description: t.ui.buyXGetYFree,
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// COLOR MAP PER OFFER TYPE
// ═══════════════════════════════════════════════════════════
const getTypeTheme = (
  t: any,
): Record<
  string,
  {
    accent: string;
    bg: string;
    icon: string;
    label: string;
    gradient: [string, string];
  }
> => ({
  percentage: {
    accent: "#7C3AED",
    bg: "#F5F3FF",
    icon: "pricetag",
    label: t.ui.percentDiscount,
    gradient: ["#7C3AED", "#5B21B6"],
  },
  fixed_amount: {
    accent: "#0284C7",
    bg: "#F0F9FF",
    icon: "cash",
    label: t.ui.fixedDiscount,
    gradient: ["#0284C7", "#0369A1"],
  },
  free_delivery: {
    accent: Colors.primary900,
    bg: Colors.primary100 || "#F0FDF4",
    icon: "car",
    label: t.ui.freeDelivery,
    gradient: [Colors.primary900, Colors.primary800 || "#15803d"],
  },
  bogo: {
    accent: "#DB2777",
    bg: "#FDF2F8",
    icon: "gift",
    label: t.ui.buyOneGetOneBadge,
    gradient: ["#DB2777", "#BE185D"],
  },
});

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

/** Build a specific scope string like "20% OFF on Dairy Products" */
const buildScopeDescription = (
  offer: Offer,
  getName: (item: any) => string,
  t: any,
): string => {
  const valueStr =
    offer.type === "percentage"
      ? `${offer.value}% ${t.ui.off}`
      : offer.type === "fixed_amount"
        ? `${offer.value} ${t.ui.egpOff}`
        : offer.type === "free_delivery"
          ? t.ui.freeDeliveryUpper
          : t.ui.buyOneGetOneFree;

  if (offer.applies_to === "order") {
    return `${valueStr} ${t.ui.onEntireOrder}`;
  }
  if (
    offer.applies_to === "category" &&
    offer.targets?.categories?.length > 0
  ) {
    const names = offer.targets.categories.map((c) => getName(c));
    if (names.length <= 2) {
      return `${valueStr} on ${names.join(" & ")}`;
    }
    return `${valueStr} on ${names.length} ${t.ui.selectedCategories}`;
  }
  if (offer.applies_to === "product" && offer.targets?.products?.length > 0) {
    if (offer.targets.products.length === 1) {
      return `${valueStr} on ${getName(offer.targets.products[0])}`;
    }
    return `${valueStr} on ${offer.targets.products.length} ${t.ui.selectedItems}`;
  }
  return valueStr;
};

/** Build promotion scope string */
const buildPromoScope = (
  promo: Promotion,
  getName: (item: any) => string,
  t: any,
): string => {
  const valueStr =
    promo.discount_type === "percentage"
      ? `${promo.discount_value}% ${t.ui.off}`
      : promo.discount_type === "fixed"
        ? `${promo.discount_value} ${t.ui.egpOff}`
        : t.ui.bxgy;

  if (promo.applies_to === "all") return `${valueStr} ${t.ui.onAllProducts}`;
  if (promo.applies_to === "category" && promo.categories?.length) {
    if (promo.categories.length <= 2) {
      return `${valueStr} on ${promo.categories.map((c: any) => getName(c) || c.name || c).join(" & ")}`;
    }
    return `${valueStr} on ${promo.categories.length} ${t.ui.categories}`;
  }
  if (promo.applies_to === "products") {
    return `${valueStr} on ${promo.products_count || "Selected"} ${t.ui.products}`;
  }
  return valueStr;
};

/** Format remaining time as "Xd Xh" or "Xh Xm" */
const formatTimeRemaining = (dateStr: string, t: any): string | null => {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h ${t.ui.left}`;
  if (hours > 0) return `${hours}h ${mins}m ${t.ui.left}`;
  return `${mins}m ${t.ui.left}`;
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function OffersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { getName } = useLocalizedValue();
  const FILTER_SECTIONS = useMemo(() => getFilterSections(t), [t]);
  const TYPE_THEME = useMemo(() => getTypeTheme(t), [t]);

  // ── State ──
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<SectionKey, boolean>
  >({
    featured: false,
    automatic: false,
    percentage: false,
    fixed_amount: false,
    free_delivery: false,
    bogo: false,
  });
  const [summary, setSummary] = useState<{
    active_count: number;
    ending_soon_count: number;
    eligible_count: number;
    max_percentage?: number | null;
  } | null>(null);

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const filterSheetAnim = useRef(new Animated.Value(0)).current;

  // Animated rotation for section collapse arrows
  const sectionArrowAnims = useRef<Record<SectionKey, Animated.Value>>({
    featured: new Animated.Value(0),
    automatic: new Animated.Value(0),
    percentage: new Animated.Value(0),
    fixed_amount: new Animated.Value(0),
    free_delivery: new Animated.Value(0),
    bogo: new Animated.Value(0),
  }).current;

  // ─────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────
  /**
   * Load offers + promotions data.
   *
   * Two paths:
   *   - Initial / focus load (force=false): returns cached snapshot
   *     instantly if available (so the screen paints fresh-from-cache
   *     and the user doesn't see a flash of "Loading"). Background
   *     refresh keeps the data current — staleness gated by the API
   *     wrapper's TTL.
   *   - Pull-to-refresh (force=true): bypasses the cache and hits the
   *     network. This is the user's explicit "I want fresh data" signal
   *     and is also how a stale ghost offer (e.g. one the admin
   *     disabled while the user wasn't online) gets evicted from the
   *     local snapshot.
   */
  const loadData = useCallback(async (force = false) => {
    try {
      if (!force) {
        setLoading(true);
        setError(null);
        fadeAnim.setValue(0);
        slideAnim.setValue(30);
      }

      const [promoRes, offersRes, summaryRes] = await Promise.all([
        getPromotions({}, { forceRefresh: force }).catch(() => ({
          success: false,
          data: { promotions: [] as Promotion[] },
        })),
        getOffers(
          { status: "active", sort: "recommended" },
          { forceRefresh: force },
        ).catch(() => ({
          success: false,
          data: { offers: [] as Offer[], meta: { count: 0 } },
        })),
        getOffersSummary({ forceRefresh: force }).catch(() => null),
      ]);

      if (promoRes.success) {
        setPromotions(promoRes.data.promotions || []);
      }
      if (offersRes.success) {
        setOffers(offersRes.data.offers || []);
      }
      if (summaryRes?.success) {
        setSummary(summaryRes.data);
      }

      if (!promoRes.success && !offersRes.success) {
        setError(t.ui.unableToLoadOffers);
      }
    } catch (err: any) {
      console.error("Failed to load offers:", err);
      setError(err.message || t.ui.unableToLoadOffersTryAgain);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadData();
    });
    return () => task.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && !error) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // force=true bypasses the AsyncStorage cache and hits the network.
    // This is the only way to evict an offer that was removed/disabled
    // by the admin while the user wasn't connected.
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  // ─────────────────────────────────────────────────
  // SECTION TOGGLE (smooth animated arrow)
  // ─────────────────────────────────────────────────
  const toggleSection = (key: SectionKey) => {
    const willCollapse = !collapsedSections[key];
    // Animate the arrow rotation
    Animated.spring(sectionArrowAnims[key], {
      toValue: willCollapse ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
    LayoutAnimation.configureNext({
      duration: 300,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setCollapsedSections((prev) => ({ ...prev, [key]: willCollapse }));
  };

  // ─────────────────────────────────────────────────
  // FILTER SHEET CONTROLS
  // ─────────────────────────────────────────────────
  const openFilterSheet = () => {
    setShowFilterSheet(true);
    Animated.spring(filterSheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 9,
      tension: 65,
    }).start();
  };

  const closeFilterSheet = () => {
    Animated.timing(filterSheetAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setShowFilterSheet(false));
  };

  const selectFilter = (key: FilterKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveFilter(key);
    closeFilterSheet();
  };

  // ─────────────────────────────────────────────────
  // FILTERING & GROUPING
  // ─────────────────────────────────────────────────
  const q = searchQuery.toLowerCase().trim();

  const featuredPromotion = useMemo(
    () => promotions.find((p) => p.is_featured) || null,
    [promotions],
  );

  /** Should we show promotions at all given the active filter? */
  const showPromotions =
    activeFilter === "all" || activeFilter === "promotions";
  const showCoupons =
    activeFilter === "all" ||
    activeFilter === "coupons" ||
    activeFilter === "percentage" ||
    activeFilter === "fixed_amount" ||
    activeFilter === "free_delivery" ||
    activeFilter === "bogo";

  const automaticPromotions = useMemo(() => {
    if (!showPromotions) return [];
    let list = promotions.filter(
      (p) => !p.is_featured || promotions.length <= 1,
    );
    if (q) {
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.title_ar?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [promotions, q, showPromotions]);

  const groupedOffers = useMemo(() => {
    const groups: Record<string, Offer[]> = {
      percentage: [],
      fixed_amount: [],
      free_delivery: [],
      bogo: [],
    };
    if (!showCoupons) return groups;

    // When a specific type filter is active, only show that type
    const typeFilter =
      activeFilter === "percentage" ||
      activeFilter === "fixed_amount" ||
      activeFilter === "free_delivery" ||
      activeFilter === "bogo"
        ? activeFilter
        : null;

    for (const offer of offers) {
      if (q) {
        const match =
          offer.code?.toLowerCase().includes(q) ||
          offer.title?.toLowerCase().includes(q) ||
          offer.subtitle?.toLowerCase().includes(q);
        if (!match) continue;
      }
      if (typeFilter && offer.type !== typeFilter) continue;
      if (groups[offer.type]) {
        groups[offer.type].push(offer);
      }
    }
    return groups;
  }, [offers, q, showCoupons, activeFilter]);

  const totalDealsCount = promotions.length + offers.length;

  /** Get count for a filter chip */
  const getFilterCount = useCallback(
    (key: FilterKey): number => {
      switch (key) {
        case "all":
          return promotions.length + offers.length;
        case "promotions":
          return promotions.length;
        case "coupons":
          return offers.length;
        case "percentage":
          return offers.filter((o) => o.type === "percentage").length;
        case "fixed_amount":
          return offers.filter((o) => o.type === "fixed_amount").length;
        case "free_delivery":
          return offers.filter((o) => o.type === "free_delivery").length;
        case "bogo":
          return offers.filter((o) => o.type === "bogo").length;
        default:
          return 0;
      }
    },
    [promotions.length, offers],
  );

  // ─────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────
  const handleCopyCode = async (code: string) => {
    await ExpoClipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const navigateToPromotion = (id: number) => {
    router.push(`/promotions/${id}` as any);
  };

  const navigateToOfferDetail = (offer: Offer) => {
    router.push({
      pathname: "/offers/[id]",
      params: { id: String(offer.id), offerData: JSON.stringify(offer) },
    } as any);
  };

  /** Get active filter label for the pill in header */
  const activeFilterLabel = useMemo(() => {
    for (const section of FILTER_SECTIONS) {
      const found = section.filters.find((f) => f.key === activeFilter);
      if (found) return found.label;
    }
    return FILTER_SECTIONS[0].filters[0].label;
  }, [activeFilter, FILTER_SECTIONS]);

  // ═══════════════════════════════════════════════════════════
  // SUB-COMPONENTS
  // ═══════════════════════════════════════════════════════════

  // ━━━━━ COLLAPSIBLE SECTION HEADER (Animated Arrow) ━━━━━
  const GroupHeader = ({
    icon,
    iconColor,
    title,
    count,
    sectionKey,
  }: {
    icon: string;
    iconColor: string;
    title: string;
    count: number;
    sectionKey: SectionKey;
  }) => {
    const arrowRotation = sectionArrowAnims[sectionKey].interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "180deg"],
    });

    return (
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={() => toggleSection(sectionKey)}
        activeOpacity={0.7}
      >
        <View style={styles.groupHeaderLeft}>
          <View
            style={[
              styles.groupIconWrap,
              { backgroundColor: iconColor + "18" },
            ]}
          >
            <Ionicons name={icon as any} size={16} color={iconColor} />
          </View>
          <Text style={styles.groupTitle}>{title}</Text>
          <View style={styles.groupCountPill}>
            <Text style={styles.groupCountText}>{count}</Text>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
          <Ionicons name="chevron-up" size={18} color={Colors.neutralMedium} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // ━━━━━ FEATURED PROMOTION HERO ━━━━━
  const FeaturedHeroCard = ({ promo }: { promo: Promotion }) => {
    const scope = buildPromoScope(promo, getName, t);

    return (
      <TouchableOpacity
        style={styles.heroCard}
        onPress={() => navigateToPromotion(promo.id)}
        activeOpacity={0.92}
      >
        {promo.banner_image_url || promo.image_url ? (
          <Image
            source={{ uri: promo.banner_image_url || promo.image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[Colors.primary900, Colors.primary800 || "#15803d"]}
            style={styles.heroImage}
          />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.85)"]}
          style={styles.heroOverlay}
        >
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={11} color={Colors.accentYellow} />
              <Text style={styles.heroBadgeText}>{t.ui.featured}</Text>
            </View>
          </View>
          <Text style={styles.heroScope}>{scope}</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {promo.title}
          </Text>
          {promo.end_date && (
            <View style={styles.heroTimerRow}>
              <CountdownTimer endDate={promo.end_date} compact light />
            </View>
          )}
          <View style={styles.heroCTA}>
            <Text style={styles.heroCTAText}>{t.ui.viewProducts}</Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={Colors.neutralWhite}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // ━━━━━ AUTOMATIC PROMOTION CARD ━━━━━
  const AutoPromoCard = ({ promo }: { promo: Promotion }) => {
    const scope = buildPromoScope(promo, getName, t);
    const badgeText =
      promo.discount_type === "percentage"
        ? `${promo.discount_value}%`
        : promo.discount_type === "fixed"
          ? `${promo.discount_value}`
          : t.ui.bxgy;
    const badgeUnit =
      promo.discount_type === "percentage"
        ? t.ui.off
        : promo.discount_type === "fixed"
          ? t.ui.egpOff
          : "";

    return (
      <TouchableOpacity
        style={styles.autoPromoCard}
        onPress={() => navigateToPromotion(promo.id)}
        activeOpacity={0.85}
      >
        {/* Left: Value block */}
        <LinearGradient
          colors={[Colors.primary900, Colors.primary700 || "#22c55e"]}
          style={styles.autoPromoLeft}
        >
          <Text style={styles.autoPromoValue}>{badgeText}</Text>
          {badgeUnit ? (
            <Text style={styles.autoPromoUnit}>{badgeUnit}</Text>
          ) : null}
        </LinearGradient>

        {/* Right: Info */}
        <View style={styles.autoPromoRight}>
          <Text style={styles.autoPromoScope} numberOfLines={2}>
            {scope}
          </Text>
          {promo.description ? (
            <Text style={styles.autoPromoDesc} numberOfLines={1}>
              {promo.description}
            </Text>
          ) : null}

          {/* Meta row */}
          <View style={styles.autoPromoMeta}>
            {promo.min_purchase ? (
              <View style={styles.metaChip}>
                <Ionicons
                  name="cart-outline"
                  size={10}
                  color={Colors.neutralMedium}
                />
                <Text style={styles.metaChipText}>
                  {t.ui.minEgp.replace("{amount}", String(promo.min_purchase))}
                </Text>
              </View>
            ) : null}
            {promo.end_date && (
              <View style={styles.metaChip}>
                <Ionicons
                  name="time-outline"
                  size={10}
                  color={Colors.accentOrange}
                />
                <Text
                  style={[styles.metaChipText, { color: Colors.accentOrange }]}
                >
                  {formatTimeRemaining(promo.end_date, t) || t.ui.endingSoon}
                </Text>
              </View>
            )}
          </View>

          {/* CTA */}
          <View style={styles.autoPromoCTA}>
            <Text style={styles.autoPromoCTAText}>{t.ui.viewProducts}</Text>
            <Ionicons
              name="arrow-forward"
              size={12}
              color={Colors.primary900}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ━━━━━ COUPON CARD — Enterprise Design V2 ━━━━━
  const CouponCard = ({ offer }: { offer: Offer }) => {
    const theme = TYPE_THEME[offer.type] || TYPE_THEME.percentage;
    const isCopied = copiedCode === offer.code;
    const scope = buildScopeDescription(offer, getName, t);

    // Value display
    const valueDisplay = (): { main: string; unit: string } => {
      switch (offer.type) {
        case "percentage":
          return { main: `${offer.value}%`, unit: t.ui.off };
        case "fixed_amount":
          return { main: `${offer.value}`, unit: t.ui.egpOff };
        case "free_delivery":
          return { main: t.ui.free, unit: t.ui.delivery || "DELIVERY" };
        case "bogo":
          return { main: "B1G1", unit: t.ui.free };
        default:
          return { main: `${offer.value}`, unit: t.ui.off };
      }
    };
    const { main: valMain, unit: valUnit } = valueDisplay();

    // Scope badge label
    const scopeLabel =
      offer.applies_to === "order"
        ? t.ui.entireOrder
        : offer.applies_to === "category"
          ? `${offer.targets?.categories?.length || 0} ${(offer.targets?.categories?.length || 0) === 1 ? t.ui.category : t.ui.categories}`
          : offer.applies_to === "product"
            ? `${offer.targets?.products?.length || 0} ${(offer.targets?.products?.length || 0) === 1 ? t.ui.product : t.ui.products}`
            : t.ui.allItems;

    const scopeIcon =
      offer.applies_to === "order"
        ? "cart"
        : offer.applies_to === "category"
          ? "grid"
          : offer.applies_to === "product"
            ? "cube"
            : "apps";

    // Restrictions
    const restrictions: string[] = [];
    if (offer.minimum_order > 0)
      restrictions.push(
        t.ui.minEgp.replace("{amount}", String(offer.minimum_order)),
      );
    if (offer.maximum_discount)
      restrictions.push(
        t.ui.maxEgpOff.replace("{amount}", String(offer.maximum_discount)),
      );
    if (offer.first_order_only) restrictions.push(t.ui.firstOrderOnly);
    if (offer.usage_per_user === 1) restrictions.push(t.ui.oneTimeUse);

    // BOGO rules
    const bogoRules: OfferBogoRule[] = offer.targets?.bogo_rules || [];

    return (
      <TouchableOpacity
        style={styles.couponCard}
        onPress={() => navigateToOfferDetail(offer)}
        activeOpacity={0.88}
      >
        {/* ── TOP: Type accent bar ── */}
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.couponAccentBar}
        />

        {/* ── MAIN ROW: Value + Content ── */}
        <View style={styles.couponMainRow}>
          {/* LEFT: Value block with gradient */}
          <LinearGradient colors={theme.gradient} style={styles.couponLeft}>
            <View style={styles.couponLeftContent}>
              <Ionicons
                name={theme.icon as any}
                size={16}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={styles.couponValMain}>{valMain}</Text>
              <Text style={styles.couponValUnit}>{valUnit}</Text>
            </View>
            {/* Ticket perforations */}
            <View style={[styles.perforation, styles.perfTop]} />
            <View style={[styles.perforation, styles.perfBottom]} />
          </LinearGradient>

          {/* RIGHT: Content */}
          <View style={styles.couponRight}>
            {/* Top row: Type badge + Scope badge */}
            <View style={styles.couponBadgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: theme.bg }]}>
                <Ionicons
                  name={theme.icon as any}
                  size={10}
                  color={theme.accent}
                />
                <Text style={[styles.typeBadgeText, { color: theme.accent }]}>
                  {theme.label}
                </Text>
              </View>
              <View style={styles.scopeBadge}>
                <Ionicons
                  name={scopeIcon as any}
                  size={9}
                  color={Colors.neutralMedium}
                />
                <Text style={styles.scopeBadgeText}>{scopeLabel}</Text>
              </View>
            </View>

            {/* Scope headline */}
            <Text style={styles.couponScope} numberOfLines={2}>
              {scope}
            </Text>

            {/* BOGO details (only for bogo type) */}
            {offer.type === "bogo" && bogoRules.length > 0 && (
              <View style={styles.bogoBox}>
                {bogoRules.slice(0, 2).map((rule, idx) => (
                  <View key={idx} style={styles.bogoRuleRow}>
                    <Text style={styles.bogoLabel}>{t.ui.buy}</Text>
                    <Text style={styles.bogoQty}>
                      {rule.buy_qty}× {rule.buy_label || "Any"}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={10}
                      color={Colors.neutralMedium}
                    />
                    <Text style={[styles.bogoLabel, { color: "#DB2777" }]}>
                      {t.ui.get}
                    </Text>
                    <Text style={[styles.bogoQty, { color: "#DB2777" }]}>
                      {rule.get_qty}×{" "}
                      {rule.get_discount_type === "free"
                        ? t.ui.free
                        : `${rule.get_discount_value}% off`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Restrictions + Expiry Row */}
            <View style={styles.couponMetaRow}>
              {restrictions.slice(0, 2).map((r, i) => (
                <View key={i} style={styles.restrictionChip}>
                  <Ionicons
                    name="information-circle-outline"
                    size={9}
                    color={Colors.neutralMedium}
                  />
                  <Text style={styles.restrictionText}>{r}</Text>
                </View>
              ))}
              {offer.valid_until && (
                <View style={styles.restrictionChip}>
                  <Ionicons
                    name="time-outline"
                    size={9}
                    color={
                      offer.ending_soon ? Colors.accentRed : Colors.accentOrange
                    }
                  />
                  <Text
                    style={[
                      styles.restrictionText,
                      {
                        color: offer.ending_soon
                          ? Colors.accentRed
                          : Colors.accentOrange,
                      },
                    ]}
                  >
                    {formatTimeRemaining(offer.valid_until, t) ||
                      `Exp. ${new Date(offer.valid_until).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </Text>
                </View>
              )}
            </View>

            {/* ━━━ PROMO CODE + Copy ━━━ */}
            <View style={styles.codeContainer}>
              <View
                style={[styles.codeBox, { borderColor: theme.accent + "40" }]}
              >
                <Text style={styles.codeLabel}>{t.ui.code}</Text>
                <Text style={[styles.codeValue, { color: theme.accent }]}>
                  {offer.code}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.copyBtn,
                  { backgroundColor: theme.bg },
                  isCopied && { backgroundColor: theme.accent },
                ]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleCopyCode(offer.code);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isCopied ? "checkmark" : "copy-outline"}
                  size={16}
                  color={isCopied ? Colors.neutralWhite : theme.accent}
                />
                <Text
                  style={[
                    styles.copyBtnText,
                    { color: theme.accent },
                    isCopied && { color: Colors.neutralWhite },
                  ]}
                >
                  {isCopied ? t.ui.copied : t.ui.copy}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Free delivery: explain conditions inline */}
            {offer.type === "free_delivery" && (
              <View style={styles.freeDeliveryInfo}>
                <Ionicons name="car" size={13} color={Colors.primary900} />
                <Text style={styles.freeDeliveryText}>
                  {offer.minimum_order > 0
                    ? t.ui.freeDeliveryAbove.replace(
                        "{amount}",
                        String(offer.minimum_order),
                      )
                    : t.ui.freeDeliveryAny}
                </Text>
              </View>
            )}

            {/* View Details CTA */}
            <View style={styles.couponCTARow}>
              <TouchableOpacity
                style={[styles.viewDetailBtn, { backgroundColor: theme.bg }]}
                onPress={() => navigateToOfferDetail(offer)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.viewDetailBtnText, { color: theme.accent }]}
                >
                  {t.ui.viewDetails}
                </Text>
                <Ionicons name="arrow-forward" size={12} color={theme.accent} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ━━━━━ FILTER BOTTOM SHEET ━━━━━
  const sheetTranslateY = filterSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT * 0.55, 0],
  });
  const sheetBackdropOpacity = filterSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const FilterBottomSheet = () => (
    <Modal
      visible={showFilterSheet}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeFilterSheet}
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.filterOverlay, { opacity: sheetBackdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeFilterSheet} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.filterSheet,
          { transform: [{ translateY: sheetTranslateY }] },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.filterHandle} />

        {/* Header */}
        <View style={styles.filterSheetHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="options" size={20} color={Colors.primary900} />
            <Text style={styles.filterSheetTitle}>{t.ui.filterDeals}</Text>
          </View>
          {activeFilter !== "all" && (
            <TouchableOpacity
              onPress={() => selectFilter("all")}
              style={styles.filterResetBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={14} color={Colors.accentRed} />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Poppins-SemiBold",
                  color: Colors.accentRed,
                }}
              >
                {t.ui.reset}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active pill indicator */}
        {activeFilter !== "all" && (
          <View style={styles.filterActivePill}>
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={Colors.primary900}
            />
            <Text style={styles.filterActivePillText}>
              {t.ui.active}: {activeFilterLabel}
            </Text>
          </View>
        )}

        {/* Sections */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          {FILTER_SECTIONS.map((section) => (
            <View key={section.title} style={styles.filterSectionBlock}>
              <View style={styles.filterSectionHeader}>
                <Text style={styles.filterSectionTitle}>{section.title}</Text>
                <Text style={styles.filterSectionSubtitle}>
                  {section.subtitle}
                </Text>
              </View>
              {section.filters.map((f) => {
                const isActive = activeFilter === f.key;
                const count = getFilterCount(f.key);
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.filterOption,
                      isActive && styles.filterOptionActive,
                    ]}
                    onPress={() => selectFilter(f.key)}
                    activeOpacity={0.65}
                  >
                    <View
                      style={[
                        styles.filterOptionIcon,
                        {
                          backgroundColor: isActive
                            ? f.color + "20"
                            : f.color + "10",
                        },
                      ]}
                    >
                      <Ionicons
                        name={f.icon as any}
                        size={16}
                        color={f.color}
                      />
                    </View>
                    <View style={styles.filterOptionInfo}>
                      <Text
                        style={[
                          styles.filterOptionLabel,
                          isActive && { color: Colors.primary900 },
                        ]}
                      >
                        {f.label}
                      </Text>
                      <Text style={styles.filterOptionDesc}>
                        {f.description}
                      </Text>
                    </View>
                    {count > 0 && (
                      <View
                        style={[
                          styles.filterOptionCount,
                          isActive && {
                            backgroundColor: Colors.primary900,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterOptionCountText,
                            isActive && { color: Colors.neutralWhite },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.filterRadio,
                        isActive && styles.filterRadioActive,
                      ]}
                    >
                      {isActive && <View style={styles.filterRadioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: ERROR STATE
  // ═══════════════════════════════════════════════════════════
  if (error && !loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <OfflineIndicator />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconBg}>
            <AlertCircle size={48} color={Colors.accentRed} />
          </View>
          <Text style={styles.errorTitle}>{t.ui.oopsSomethingWrong}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary900, Colors.primary700 || "#22c55e"]}
              style={styles.retryGradient}
            >
              <Ionicons name="refresh" size={18} color={Colors.neutralWhite} />
              <Text style={styles.retryText}>{t.ui.tryAgain}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: LOADING SKELETON
  // ═══════════════════════════════════════════════════════════
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <OfflineIndicator />
        <View style={styles.header}>
          <LinearGradient
            colors={[Colors.primary900, Colors.primary800 || "#15803d"]}
            style={styles.headerGradient}
          >
            <View style={styles.headerTop}>
              <View style={styles.brandRow}>
                <View style={styles.brandIcon}>
                  <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
                </View>
                <Text style={styles.brandName}>
                  {t.nav?.offers || "Offers"}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 14 }}
        >
          <SkeletonLoader width="100%" height={56} borderRadius={14} />
          <SkeletonLoader width="100%" height={200} borderRadius={20} />
          <SkeletonLoader width="100%" height={44} borderRadius={12} />
          <SkeletonLoader width="100%" height={140} borderRadius={16} />
          <SkeletonLoader width="100%" height={140} borderRadius={16} />
          <SkeletonLoader width="100%" height={44} borderRadius={12} />
          <SkeletonLoader width="100%" height={140} borderRadius={16} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // CHECK IF EVERYTHING IS EMPTY
  // ═══════════════════════════════════════════════════════════
  const hasAnything =
    (showPromotions && promotions.length > 0) ||
    groupedOffers.percentage.length > 0 ||
    groupedOffers.fixed_amount.length > 0 ||
    groupedOffers.free_delivery.length > 0 ||
    groupedOffers.bogo.length > 0;

  const isSearchEmpty =
    (q.length > 0 || activeFilter !== "all") &&
    automaticPromotions.length === 0 &&
    groupedOffers.percentage.length === 0 &&
    groupedOffers.fixed_amount.length === 0 &&
    groupedOffers.free_delivery.length === 0 &&
    groupedOffers.bogo.length === 0 &&
    !(featuredPromotion && showPromotions && !q);

  // ═══════════════════════════════════════════════════════════
  // RENDER: MAIN
  // ═══════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineIndicator />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <LinearGradient
          colors={[Colors.primary900, Colors.primary800 || "#15803d"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
              </View>
              <Text style={styles.brandName}>{t.nav?.offers || "Offers"}</Text>
            </View>
            {totalDealsCount > 0 && (
              <View style={styles.dealsBadge}>
                <Ionicons name="gift" size={13} color={Colors.neutralWhite} />
                <Text style={styles.dealsBadgeText}>
                  {totalDealsCount} Deals
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.headerTitle}>
            {t.offers?.specialOffers || "Special Offers"}
          </Text>
          <Text style={styles.headerSubtitle}>{t.ui.discoverPromotions}</Text>

          {/* Search + Filter Pill */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.neutralMedium} />
            <TextInput
              style={styles.searchInput}
              placeholder={t.ui.searchOffersCodes}
              placeholderTextColor={Colors.neutralMedium}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={Colors.neutralMedium}
                />
              </TouchableOpacity>
            )}
            <View style={styles.searchDivider} />
            <TouchableOpacity
              onPress={openFilterSheet}
              style={[
                styles.headerFilterBtn,
                activeFilter !== "all" && styles.headerFilterBtnActive,
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="options"
                size={16}
                color={
                  activeFilter !== "all"
                    ? Colors.neutralWhite
                    : Colors.neutralMedium
                }
              />
              {activeFilter !== "all" && (
                <Text style={styles.headerFilterBtnText}>
                  {activeFilterLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* ── SCROLLABLE CONTENT ── */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary900]}
            tintColor={Colors.primary900}
          />
        }
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ═══════ Filter Bottom Sheet ═══════ */}
          <FilterBottomSheet />

          {/* ═══════ Quick Stats ═══════ */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconWrap,
                  { backgroundColor: Colors.primary100 || "#F0FDF4" },
                ]}
              >
                <Ionicons
                  name="pricetags"
                  size={14}
                  color={Colors.primary900}
                />
              </View>
              <Text style={styles.statValue}>{totalDealsCount}</Text>
              <Text style={styles.statLabel}>{t.ui.active}</Text>
            </View>
            <View style={styles.statCard}>
              <View
                style={[styles.statIconWrap, { backgroundColor: "#FEF3C7" }]}
              >
                <Ionicons name="ticket" size={14} color="#D97706" />
              </View>
              <Text style={styles.statValue}>{offers.length}</Text>
              <Text style={styles.statLabel}>{t.ui.coupons}</Text>
            </View>
            <View style={styles.statCard}>
              <View
                style={[styles.statIconWrap, { backgroundColor: "#FEE2E2" }]}
              >
                <Ionicons name="time" size={14} color={Colors.accentRed} />
              </View>
              <Text style={styles.statValue}>
                {summary?.ending_soon_count ?? 0}
              </Text>
              <Text style={styles.statLabel}>{t.ui.ending}</Text>
            </View>
            {summary?.max_percentage ? (
              <View style={styles.statCard}>
                <View
                  style={[styles.statIconWrap, { backgroundColor: "#F5F3FF" }]}
                >
                  <Ionicons name="trending-down" size={14} color="#7C3AED" />
                </View>
                <Text style={styles.statValue}>{summary.max_percentage}%</Text>
                <Text style={styles.statLabel}>{t.ui.maxOff}</Text>
              </View>
            ) : null}
          </View>

          {/* ═══════ SECTION: Featured ═══════ */}
          {featuredPromotion && !q && showPromotions && (
            <View style={styles.sectionWrap}>
              <GroupHeader
                icon="sparkles"
                iconColor={Colors.accentOrange}
                title={t.ui.featured}
                count={1}
                sectionKey="featured"
              />
              {!collapsedSections.featured && (
                <View style={styles.sectionContent}>
                  <FeaturedHeroCard promo={featuredPromotion} />
                </View>
              )}
            </View>
          )}

          {/* ═══════ SECTION: Automatic Discounts (Promotions) ═══════ */}
          {automaticPromotions.length > 0 && (
            <View style={styles.sectionWrap}>
              <GroupHeader
                icon="flash"
                iconColor={Colors.primary900}
                title={t.ui.automaticDiscounts}
                count={automaticPromotions.length}
                sectionKey="automatic"
              />
              {!collapsedSections.automatic && (
                <View style={styles.sectionContent}>
                  {automaticPromotions.map((promo) => (
                    <AutoPromoCard key={`promo-${promo.id}`} promo={promo} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ═══════ SECTION: Promo Codes (% Off) ═══════ */}
          {groupedOffers.percentage.length > 0 && (
            <View style={styles.sectionWrap}>
              <GroupHeader
                icon="pricetag"
                iconColor="#7C3AED"
                title={t.ui.promoCodesPercent}
                count={groupedOffers.percentage.length}
                sectionKey="percentage"
              />
              {!collapsedSections.percentage && (
                <View style={styles.sectionContent}>
                  {groupedOffers.percentage.map((offer) => (
                    <CouponCard key={`pct-${offer.id}`} offer={offer} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ═══════ SECTION: Fixed Amount Coupons ═══════ */}
          {groupedOffers.fixed_amount.length > 0 && (
            <View style={styles.sectionWrap}>
              <GroupHeader
                icon="cash"
                iconColor="#0284C7"
                title={t.ui.fixedDiscountCodes}
                count={groupedOffers.fixed_amount.length}
                sectionKey="fixed_amount"
              />
              {!collapsedSections.fixed_amount && (
                <View style={styles.sectionContent}>
                  {groupedOffers.fixed_amount.map((offer) => (
                    <CouponCard key={`fix-${offer.id}`} offer={offer} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ═══════ SECTION: Free Delivery ═══════ */}
          {groupedOffers.free_delivery.length > 0 && (
            <View style={styles.sectionWrap}>
              <GroupHeader
                icon="car"
                iconColor={Colors.primary900}
                title={t.ui.freeDelivery}
                count={groupedOffers.free_delivery.length}
                sectionKey="free_delivery"
              />
              {!collapsedSections.free_delivery && (
                <View style={styles.sectionContent}>
                  {groupedOffers.free_delivery.map((offer) => (
                    <CouponCard key={`fd-${offer.id}`} offer={offer} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ═══════ SECTION: Buy 1 Get 1 ═══════ */}
          {groupedOffers.bogo.length > 0 && (
            <View style={styles.sectionWrap}>
              <GroupHeader
                icon="gift"
                iconColor="#DB2777"
                title={t.ui.buyOneGetOne}
                count={groupedOffers.bogo.length}
                sectionKey="bogo"
              />
              {!collapsedSections.bogo && (
                <View style={styles.sectionContent}>
                  {groupedOffers.bogo.map((offer) => (
                    <CouponCard key={`bogo-${offer.id}`} offer={offer} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ═══════ EMPTY STATE ═══════ */}
          {(!hasAnything || isSearchEmpty) && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="gift" size={56} color={Colors.primary900} />
              </View>
              <Text style={styles.emptyTitle}>
                {q
                  ? t.ui.noOffersFound
                  : activeFilter !== "all"
                    ? t.ui.noOffersInCategory
                    : t.offers?.noOffers || "No Offers Available"}
              </Text>
              <Text style={styles.emptyText}>
                {q
                  ? `No offers match "${searchQuery}"`
                  : activeFilter !== "all"
                    ? t.ui.tryDifferentFilter
                    : t.ui.checkBackForDeals}
              </Text>
              {activeFilter !== "all" && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => selectFilter("all")}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[Colors.primary900, Colors.primary700 || "#22c55e"]}
                    style={styles.retryGradient}
                  >
                    <Ionicons
                      name="apps"
                      size={18}
                      color={Colors.neutralWhite}
                    />
                    <Text style={styles.retryText}>{t.ui.showAllDeals}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {!q && activeFilter === "all" && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRefresh}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[Colors.primary900, Colors.primary700 || "#22c55e"]}
                    style={styles.retryGradient}
                  >
                    <Ionicons
                      name="refresh"
                      size={18}
                      color={Colors.neutralWhite}
                    />
                    <Text style={styles.retryText}>{t.ui.refresh}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>

        {/* Bottom safe area */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutralCloud },
  scrollView: { flex: 1 },

  // ── Header ──
  header: { overflow: "hidden" },
  headerGradient: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
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
  dealsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  dealsBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralCharcoal,
    padding: 0,
  },

  // ── Filter Pill in Header ──
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.neutralLight || "#E2E8F0",
    marginHorizontal: 4,
  },
  headerFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
    backgroundColor: "transparent",
  },
  headerFilterBtnActive: {
    backgroundColor: Colors.primary900,
  },
  headerFilterBtnText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },

  // ── Filter Bottom Sheet ──
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  filterSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.55,
    backgroundColor: Colors.neutralWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  filterHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutralLight || "#E2E8F0",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  filterSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight || "#F1F5F9",
  },
  filterSheetTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
  },
  filterResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.accentRed + "10",
  },
  filterActivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary100 || "#F0FDF4",
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  filterActivePillText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: Colors.primary900,
  },
  filterSectionBlock: {
    marginTop: 14,
    paddingHorizontal: 20,
  },
  filterSectionHeader: {
    marginBottom: 8,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  filterSectionSubtitle: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    marginTop: 1,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  filterOptionActive: {
    backgroundColor: Colors.primary100 || "#F0FDF4",
  },
  filterOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  filterOptionInfo: {
    flex: 1,
  },
  filterOptionLabel: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
  },
  filterOptionDesc: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    marginTop: 1,
  },
  filterOptionCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.neutralLight || "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginRight: 10,
  },
  filterOptionCountText: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
  },
  filterRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.neutralLight || "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  filterRadioActive: {
    borderColor: Colors.primary900,
  },
  filterRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary900,
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
  },

  // ── Group / Section ──
  sectionWrap: { marginTop: 10 },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  groupHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
  },
  groupCountPill: {
    backgroundColor: Colors.primary100 || "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  groupCountText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: Colors.primary900,
  },
  sectionContent: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },

  // ── Featured Hero Card ──
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  heroImage: {
    width: "100%",
    height: 200,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 40,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },
  heroScope: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: Colors.accentYellow,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },
  heroTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  heroCTA: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  heroCTAText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },

  // ── Automatic Promo Card ──
  autoPromoCard: {
    flexDirection: "row",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  autoPromoLeft: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 6,
  },
  autoPromoValue: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    textAlign: "center",
  },
  autoPromoUnit: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  autoPromoRight: { flex: 1, padding: 12, gap: 5 },
  autoPromoScope: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
    lineHeight: 19,
  },
  autoPromoDesc: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
  },
  autoPromoMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.neutralLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
  },
  autoPromoCTA: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.primary100 || "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    marginTop: 3,
  },
  autoPromoCTAText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: Colors.primary900,
  },

  // ── Coupon Card V2 ──
  couponCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  couponAccentBar: {
    height: 3,
    width: "100%",
  },
  couponMainRow: {
    flexDirection: "row",
  },
  couponLeft: {
    width: 84,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  couponLeftContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 2,
  },
  couponValMain: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    lineHeight: 28,
  },
  couponValUnit: {
    fontSize: 9,
    fontFamily: "Poppins-SemiBold",
    color: "rgba(255,255,255,0.85)",
    textTransform: "uppercase",
  },
  perforation: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.neutralCloud,
    right: -8,
  },
  perfTop: { top: -2 },
  perfBottom: { bottom: -2 },

  couponRight: { flex: 1, padding: 12, gap: 6 },

  // Badge row
  couponBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 2,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "Poppins-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  scopeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralLight || "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  scopeBadgeText: {
    fontSize: 9,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
  },

  couponScope: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
    lineHeight: 19,
  },

  // BOGO box
  bogoBox: { gap: 4 },
  bogoRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF2F8",
    padding: 6,
    borderRadius: 8,
    gap: 5,
    flexWrap: "wrap",
  },
  bogoLabel: {
    fontSize: 9,
    fontFamily: "Poppins-Bold",
    color: Colors.primary900,
    textTransform: "uppercase",
  },
  bogoQty: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
  },

  // Meta row (restrictions + expiry)
  couponMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  restrictionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  restrictionText: {
    fontSize: 9,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
  },

  // ━━━ PROMO CODE ━━━
  codeContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    marginTop: 4,
  },
  codeBox: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  codeLabel: {
    fontSize: 7,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 1,
  },
  codeValue: {
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Menlo-Bold" : "monospace",
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
    minWidth: 76,
  },
  copyBtnText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },

  // CTA row
  couponCTARow: {
    flexDirection: "row",
    marginTop: 2,
  },
  viewDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  viewDetailBtnText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },

  // Free delivery info
  freeDeliveryInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: Colors.primary100 || "#F0FDF4",
    padding: 10,
    borderRadius: 10,
  },
  freeDeliveryText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralCharcoal,
    lineHeight: 16,
  },

  // ── Empty / Error ──
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary100 || "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
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
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  errorIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.accentRed + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: { borderRadius: 14, overflow: "hidden" },
  retryGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },
});
