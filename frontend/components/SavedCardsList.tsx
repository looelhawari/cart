/**
 * SavedCardsList Component
 *
 * Reusable component for displaying and selecting saved cards in checkout flow.
 *
 * Features:
 * - Premium card UI with brand colors
 * - Radio selection with smooth styling
 * - Disabled state for expired/unverified cards
 * - Default card indicator
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
} from "lucide-react-native";
import { PaymentMethod } from "@/types";
import Colors from "@/constants/Colors";
import { useTranslation } from "@/i18n";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";

interface SavedCardsListProps {
  cards: PaymentMethod[];
  selectedCardId: number | null;
  onSelectCard: (card: PaymentMethod) => void;
  disabled?: boolean;
}

/**
 * Get brand-specific accent color
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

export default function SavedCardsList({
  cards,
  selectedCardId,
  onSelectCard,
  disabled = false,
}: SavedCardsListProps) {
  const { t } = useTranslation();
  /**
   * Render individual card item
   */
  const renderCard = ({ item }: { item: PaymentMethod }) => {
    const isSelected = selectedCardId === item.id;
    const isEligible = item.is_verified && !item.is_expired;
    const canSelect = isEligible && !disabled;
    const brandColor = getCardBrandColor(item.card_brand);

    return (
      <TouchableOpacity
        style={[
          styles.cardContainer,
          isSelected && styles.cardSelected,
          !canSelect && styles.cardDisabled,
        ]}
        onPress={() => canSelect && onSelectCard(item)}
        disabled={!canSelect}
        activeOpacity={0.7}
      >
        {/* Selection Radio */}
        <View style={styles.radioContainer}>
          <View
            style={[
              styles.radio,
              isSelected && styles.radioSelected,
              !canSelect && styles.radioDisabled,
            ]}
          >
            {isSelected && <View style={styles.radioInner} />}
          </View>
        </View>

        {/* Card brand strip */}
        <View style={[styles.brandStrip, { backgroundColor: brandColor }]}>
          <CreditCard size={18} color={Colors.neutralWhite} />
        </View>

        {/* Card Info */}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardNumber, !canSelect && styles.textMuted]}>
            {item.masked_card}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardBrand, !canSelect && styles.textMuted]}>
              {item.card_brand?.toUpperCase()}
            </Text>
            {item.is_default && (
              <View style={styles.defaultBadge}>
                <Star size={9} color={Colors.primary900} />
                <Text style={styles.defaultBadgeText}>{t.ui.default}</Text>
              </View>
            )}
          </View>

          {/* Status indicators for ineligible cards */}
          {item.is_expired && (
            <View style={styles.statusRow}>
              <Clock size={11} color={Colors.accentRed} />
              <Text style={styles.statusExpired}>{t.ui.expired}</Text>
            </View>
          )}
          {!item.is_verified && (
            <View style={styles.statusRow}>
              <AlertCircle size={11} color={Colors.accentOrange} />
              <Text style={styles.statusUnverified}>{t.ui.unverified}</Text>
            </View>
          )}
        </View>

        {/* Selected checkmark */}
        {isSelected && (
          <CheckCircle
            size={22}
            color={Colors.primary900}
            style={styles.selectedCheck}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (cards.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <CreditCard size={36} color={Colors.neutralMedium} />
        <Text style={styles.emptyText}>{t.ui.noEligibleCards}</Text>
        <Text style={styles.emptySubtext}>{t.ui.addNewCardCheckout}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={cards}
      renderItem={renderCard}
      keyExtractor={(item) => item.id.toString()}
      scrollEnabled={false}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: Spacing.xs,
  },

  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 14,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.neutralLight,
  },

  cardSelected: {
    borderColor: Colors.primary900,
    backgroundColor: "#f0fdf4",
  },

  cardDisabled: {
    opacity: 0.5,
  },

  /* ── Radio ── */
  radioContainer: {
    marginRight: Spacing.sm,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    justifyContent: "center",
    alignItems: "center",
  },

  radioSelected: {
    borderColor: Colors.primary900,
    borderWidth: 2,
  },

  radioDisabled: {
    borderColor: Colors.neutralGray,
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary900,
  },

  /* ── Brand Strip ── */
  brandStrip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },

  /* ── Card Info ── */
  cardInfo: {
    flex: 1,
  },

  cardNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.neutralCharcoal,
    letterSpacing: 0.3,
  },

  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: Spacing.xs,
  },

  cardBrand: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    fontWeight: "600",
  },

  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 3,
  },

  defaultBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.primary900,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4,
  },

  statusExpired: {
    fontSize: 11,
    color: Colors.accentRed,
    fontWeight: "600",
  },

  statusUnverified: {
    fontSize: 11,
    color: Colors.accentOrange,
    fontWeight: "600",
  },

  textMuted: {
    color: Colors.neutralMedium,
  },

  /* ── Selected Check ── */
  selectedCheck: {
    marginLeft: Spacing.xs,
  },

  /* ── Empty ── */
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },

  emptyText: {
    fontSize: Typography.bodyBase,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
    marginTop: Spacing.sm,
  },

  emptySubtext: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginTop: Spacing.xs,
  },
});
