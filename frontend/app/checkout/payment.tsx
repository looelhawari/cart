import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, CreditCard, Banknote, Check } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { PaymentMethod } from "@/types";
import {
  getPaymentMethods,
  getEligiblePaymentMethods,
} from "@/services/paymentMethodsApi";
import SavedCardsList from "@/components/SavedCardsList";
import { Toast } from "@/components/Toast";

export default function CheckoutPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const addressId = params.addressId as string;

  const [paymentType, setPaymentType] = useState<"card" | "cod">("cod");

  // Saved cards state
  const [savedCards, setSavedCards] = useState<PaymentMethod[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [useSavedCard, setUseSavedCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [saveNewCard, setSaveNewCard] = useState(false);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "info",
  );

  /**
   * Load saved cards on mount
   */
  useEffect(() => {
    loadSavedCards();
  }, []);

  /**
   * Fetch saved cards from API
   */
  const loadSavedCards = async () => {
    try {
      setLoadingCards(true);
      const cards = await getPaymentMethods();
      setSavedCards(cards);

      // Auto-select default card if using saved cards
      const defaultCard = cards.find((c) => c.is_default);
      if (
        defaultCard &&
        getEligiblePaymentMethods(cards).includes(defaultCard)
      ) {
        setSelectedCardId(defaultCard.id);
      }
    } catch (error) {
      console.error("Failed to load saved cards:", error);
      setToastType("error");
      setToastMessage("Failed to load saved cards. Please try again.");
      setShowToast(true);
    } finally {
      setLoadingCards(false);
    }
  };

  /**
   * Handle card selection toggle
   */
  const handleCardModeToggle = (value: boolean) => {
    setUseSavedCard(value);
    if (!value) {
      setSelectedCardId(null);
    } else {
      // Auto-select default card
      const defaultCard = savedCards.find((c) => c.is_default);
      if (
        defaultCard &&
        getEligiblePaymentMethods(savedCards).includes(defaultCard)
      ) {
        setSelectedCardId(defaultCard.id);
      }
    }
  };

  const handleContinue = () => {
    router.push({
      pathname: "/checkout/confirmation",
      params: {
        addressId,
        paymentType,
        useSavedCard: useSavedCard ? "true" : "false",
        savedCardId: selectedCardId?.toString() || "",
        saveNewCard: saveNewCard ? "true" : "false",
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={router.back}>
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View style={styles.progressBar}>
          <View style={[styles.progressDot, styles.progressDotActive]}>
            <Check size={18} color={Colors.neutralWhite} />
          </View>
          <View style={[styles.progressLine, styles.progressLineActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]}>
            <Text style={styles.progressText}>2</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressDot}>
            <Text style={styles.progressTextInactive}>3</Text>
          </View>
        </View>

        {/* Payment Types */}
        <View style={styles.paymentTypes}>
          <TouchableOpacity
            style={[
              styles.paymentTypeCard,
              paymentType === "card" && styles.paymentTypeCardActive,
            ]}
            onPress={() => setPaymentType("card")}
          >
            <CreditCard size={24} color={Colors.primary900} />
            <Text style={styles.paymentTypeText}>Card</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentTypeCard,
              paymentType === "cod" && styles.paymentTypeCardActive,
            ]}
            onPress={() => setPaymentType("cod")}
          >
            <Banknote size={24} color={Colors.primary900} />
            <Text style={styles.paymentTypeText}>Cash</Text>
          </TouchableOpacity>
        </View>

        {/* Card Payment Description */}
        {paymentType === "card" && (
          <View style={styles.cardPaymentSection}>
            {/* Saved Cards Toggle */}
            {savedCards.length > 0 && (
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Use saved card</Text>
                <Switch
                  value={useSavedCard}
                  onValueChange={handleCardModeToggle}
                  trackColor={{
                    false: Colors.neutralGray,
                    true: Colors.primary900,
                  }}
                  thumbColor={Colors.neutralWhite}
                />
              </View>
            )}

            {loadingCards ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary900} />
                <Text style={styles.loadingText}>Loading saved cards...</Text>
              </View>
            ) : useSavedCard ? (
              // Show saved cards list
              <View style={styles.savedCardsContainer}>
                <Text style={styles.sectionTitle}>Select a card</Text>
                <SavedCardsList
                  cards={getEligiblePaymentMethods(savedCards)}
                  selectedCardId={selectedCardId}
                  onSelectCard={(card) => setSelectedCardId(card.id)}
                />
                {getEligiblePaymentMethods(savedCards).length === 0 && (
                  <View style={styles.noEligibleCards}>
                    <Text style={styles.noEligibleText}>
                      No eligible saved cards available
                    </Text>
                    <Text style={styles.noEligibleSubtext}>
                      Please add a new card or use another payment method
                    </Text>
                    <TouchableOpacity
                      style={styles.addPaymentButton}
                      onPress={() => router.push("/profile/payment")}
                      activeOpacity={0.7}
                    >
                      <CreditCard size={20} color={Colors.neutralWhite} />
                      <Text style={styles.addPaymentButtonText}>
                        Add Payment Method
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              // Show new card description with save option
              <View style={styles.paymentDescription}>
                <CreditCard size={48} color={Colors.primary900} />
                <Text style={styles.descriptionTitle}>Secure Card Payment</Text>
                <Text style={styles.descriptionText}>
                  You will be redirected to our secure payment gateway to enter
                  your card details.
                </Text>

                {/* Save card checkbox */}
                <TouchableOpacity
                  style={styles.saveCardOption}
                  onPress={() => setSaveNewCard(!saveNewCard)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      saveNewCard && styles.checkboxChecked,
                    ]}
                  >
                    {saveNewCard && (
                      <Check size={16} color={Colors.neutralWhite} />
                    )}
                  </View>
                  <Text style={styles.saveCardText}>
                    Save this card for future purchases
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* COD */}
        {paymentType === "cod" && (
          <View style={styles.codInfo}>
            <Banknote size={48} color={Colors.primary900} />
            <Text style={styles.codTitle}>Cash on Delivery</Text>
            <Text style={styles.codDescription}>
              Pay when your order arrives.
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
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
    padding: Spacing.md,
    backgroundColor: Colors.neutralWhite,
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

  progressBar: {
    flexDirection: "row",
    justifyContent: "center",
    padding: Spacing.lg,
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
    color: Colors.neutralWhite,
    fontWeight: "bold",
  },

  progressTextInactive: {
    color: Colors.neutralMedium,
  },

  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: Colors.neutralGray,
  },

  progressLineActive: {
    backgroundColor: Colors.primary900,
  },

  paymentTypes: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
  },

  paymentTypeCard: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: "center",
  },

  paymentTypeCardActive: {
    borderWidth: 2,
    borderColor: Colors.primary900,
  },

  paymentTypeText: {
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },

  paymentDescription: {
    backgroundColor: Colors.neutralWhite,
    margin: Spacing.md,
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
  },

  descriptionTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    color: Colors.neutralCharcoal,
  },

  descriptionText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 22,
  },

  cardPaymentSection: {
    padding: Spacing.md,
  },

  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },

  toggleLabel: {
    fontSize: Typography.bodyBase,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },

  loadingContainer: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
  },

  loadingText: {
    marginTop: Spacing.sm,
    color: Colors.neutralMedium,
  },

  savedCardsContainer: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 16,
  },

  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },

  noEligibleCards: {
    padding: Spacing.xl,
    alignItems: "center",
  },

  noEligibleText: {
    fontSize: Typography.bodyBase,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
    textAlign: "center",
  },

  noEligibleSubtext: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    textAlign: "center",
    marginTop: Spacing.xs,
  },

  addPaymentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },

  addPaymentButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: "600",
    color: Colors.neutralWhite,
  },

  saveCardOption: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },

  checkboxChecked: {
    backgroundColor: Colors.primary900,
    borderColor: Colors.primary900,
  },

  saveCardText: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },

  codInfo: {
    backgroundColor: Colors.neutralWhite,
    margin: Spacing.md,
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
  },

  codTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    marginTop: Spacing.sm,
    color: Colors.neutralCharcoal,
  },

  codDescription: {
    color: Colors.neutralMedium,
    textAlign: "center",
    marginTop: Spacing.sm,
  },

  bottomBar: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
  },

  continueButton: {
    backgroundColor: Colors.primary900,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },

  continueText: {
    color: Colors.neutralWhite,
    fontWeight: "bold",
  },
});
