/**
 * SavedCardsList Component (Phase 5)
 *
 * Reusable component for displaying and selecting saved cards.
 * Used in checkout flow.
 *
 * Features:
 * - Display all cards with eligibility status
 * - Disable selection for expired/unverified cards
 * - Highlight default card
 * - Single selection mode
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PaymentMethod } from "@/types";
import { formatCardDisplay } from "@/services/paymentMethodsApi";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";

interface SavedCardsListProps {
  cards: PaymentMethod[];
  selectedCardId: number | null;
  onSelectCard: (card: PaymentMethod) => void;
  disabled?: boolean;
}

export default function SavedCardsList({
  cards,
  selectedCardId,
  onSelectCard,
  disabled = false,
}: SavedCardsListProps) {
  /**
   * Render individual card item
   */
  const renderCard = ({ item }: { item: PaymentMethod }) => {
    const isSelected = selectedCardId === item.id;
    const isEligible = item.is_verified && !item.is_expired;
    const canSelect = isEligible && !disabled;

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
          <View style={[styles.radio, isSelected && styles.radioSelected]}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
        </View>

        {/* Card Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Ionicons
              name="card-outline"
              size={20}
              color={!canSelect ? Colors.textSecondary : Colors.text}
            />
            <Text
              style={[styles.cardNumber, !canSelect && styles.textDisabled]}
            >
              {item.masked_card}
            </Text>
          </View>

          <View style={styles.cardMeta}>
            <Text style={[styles.cardBrand, !canSelect && styles.textDisabled]}>
              {item.card_brand.toUpperCase()}
            </Text>
            {item.expires_at && (
              <Text
                style={[styles.expiryDate, !canSelect && styles.textDisabled]}
              >
                • Exp: {item.expires_at}
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
                <Text style={styles.badgeText}>EXPIRED</Text>
              </View>
            )}
            {!item.is_verified && (
              <View style={[styles.badge, styles.badgeUnverified]}>
                <Text style={styles.badgeText}>UNVERIFIED</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (cards.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="card-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.emptyText}>No saved cards</Text>
        <Text style={styles.emptySubtext}>Add a new card to get started</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={cards}
      renderItem={renderCard}
      keyExtractor={(item) => item.id.toString()}
      scrollEnabled={false} // Nested scroll handled by parent
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: Spacing.sm,
  },
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#f0f7ff",
  },
  cardDisabled: {
    opacity: 0.5,
  },
  radioContainer: {
    marginRight: Spacing.md,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: Spacing.sm,
    color: Colors.text,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 28, // Align with card number
  },
  cardBrand: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  expiryDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  textDisabled: {
    color: Colors.textSecondary,
  },
  badges: {
    flexDirection: "row",
    marginTop: Spacing.xs,
    marginLeft: 28, // Align with card number
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  badgeExpired: {
    backgroundColor: Colors.error,
  },
  badgeUnverified: {
    backgroundColor: "#ff9800",
  },
  emptyContainer: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
