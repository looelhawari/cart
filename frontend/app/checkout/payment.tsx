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
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Check,
  ShieldCheck,
  Plus,
  Shield,
} from "lucide-react-native";
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
import { useTranslation } from "@/i18n";

export default function CheckoutPaymentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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
   * Auto-enable saved card mode when eligible cards exist
   */
  useEffect(() => {
    if (savedCards.length > 0 && paymentType === "card") {
      const eligibleCards = getEligiblePaymentMethods(savedCards);
      if (eligibleCards.length > 0) {
        setUseSavedCard(true);
        const defaultCard =
          eligibleCards.find((c) => c.is_default) || eligibleCards[0];
        setSelectedCardId(defaultCard.id);
      }
    }
  }, [savedCards, paymentType]);

  /**
   * Fetch saved cards from API
   */
  const loadSavedCards = async () => {
    try {
      setLoadingCards(true);
      const cards = await getPaymentMethods();
      setSavedCards(cards);
    } catch (error) {
      console.error("Failed to load saved cards:", error);
      setToastType("error");
      setToastMessage(t.checkout.failedToLoadCards);
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
      const eligibleCards = getEligiblePaymentMethods(savedCards);
      const defaultCard =
        eligibleCards.find((c) => c.is_default) || eligibleCards[0];
      if (defaultCard) {
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
        <Text style={styles.headerTitle}>{t.checkout.paymentMethod}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Progress Stepper */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {/* Step 1 — Complete */}
            <View style={[styles.progressDot, styles.progressDotCompleted]}>
              <Check size={16} color={Colors.neutralWhite} />
            </View>
            <View style={[styles.progressLine, styles.progressLineActive]} />
            {/* Step 2 — Current */}
            <View style={[styles.progressDot, styles.progressDotActive]}>
              <Text style={styles.progressText}>2</Text>
            </View>
            <View style={styles.progressLine} />
            {/* Step 3 — Pending */}
            <View style={styles.progressDot}>
              <Text style={styles.progressTextInactive}>3</Text>
            </View>
          </View>
        </View>

        {/* Payment Type Selection */}
        <View style={styles.paymentTypesContainer}>
          <TouchableOpacity
            style={[
              styles.paymentTypeCard,
              paymentType === "card" && styles.paymentTypeCardActive,
            ]}
            onPress={() => setPaymentType("card")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.paymentTypeIconWrapper,
                paymentType === "card" && styles.paymentTypeIconWrapperActive,
              ]}
            >
              <CreditCard
                size={26}
                color={
                  paymentType === "card"
                    ? Colors.neutralWhite
                    : Colors.primary900
                }
              />
            </View>
            <Text
              style={[
                styles.paymentTypeText,
                paymentType === "card" && styles.paymentTypeTextActive,
              ]}
            >
              {t.checkout.card}
            </Text>
            {paymentType === "card" && (
              <View style={styles.paymentTypeCheck}>
                <Check size={14} color={Colors.neutralWhite} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentTypeCard,
              paymentType === "cod" && styles.paymentTypeCardActive,
            ]}
            onPress={() => setPaymentType("cod")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.paymentTypeIconWrapper,
                paymentType === "cod" && styles.paymentTypeIconWrapperActive,
              ]}
            >
              <Banknote
                size={26}
                color={
                  paymentType === "cod"
                    ? Colors.neutralWhite
                    : Colors.primary900
                }
              />
            </View>
            <Text
              style={[
                styles.paymentTypeText,
                paymentType === "cod" && styles.paymentTypeTextActive,
              ]}
            >
              {t.checkout.cash}
            </Text>
            {paymentType === "cod" && (
              <View style={styles.paymentTypeCheck}>
                <Check size={14} color={Colors.neutralWhite} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Card Payment Section */}
        {paymentType === "card" && (
          <View style={styles.cardPaymentSection}>
            {/* Saved Cards Toggle — only when cards exist */}
            {savedCards.length > 0 && (
              <View style={styles.toggleContainer}>
                <View style={styles.toggleLeft}>
                  <CreditCard size={20} color={Colors.primary900} />
                  <Text style={styles.toggleLabel}>
                    {t.checkout.useSavedCard}
                  </Text>
                </View>
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
                <Text style={styles.loadingText}>
                  {t.checkout.loadingCards}
                </Text>
              </View>
            ) : useSavedCard ? (
              /* ── Saved Cards List ── */
              <View style={styles.savedCardsWrapper}>
                <Text style={styles.sectionTitle}>{t.checkout.selectCard}</Text>
                <SavedCardsList
                  cards={getEligiblePaymentMethods(savedCards)}
                  selectedCardId={selectedCardId}
                  onSelectCard={(card) => setSelectedCardId(card.id)}
                />
                {getEligiblePaymentMethods(savedCards).length === 0 && (
                  <View style={styles.noEligibleCards}>
                    <CreditCard size={40} color={Colors.neutralMedium} />
                    <Text style={styles.noEligibleText}>
                      {t.checkout.noEligibleCards}
                    </Text>
                    <Text style={styles.noEligibleSubtext}>
                      {t.checkout.addNewCardOrOther}
                    </Text>
                    <TouchableOpacity
                      style={styles.addPaymentButton}
                      onPress={() => router.push("/profile/payment")}
                      activeOpacity={0.7}
                    >
                      <Plus size={18} color={Colors.neutralWhite} />
                      <Text style={styles.addPaymentButtonText}>
                        {t.checkout.addPaymentMethod}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Security note */}
                <View style={styles.securityNote}>
                  <ShieldCheck size={16} color={Colors.primary900} />
                  <Text style={styles.securityNoteText}>
                    Your card details are encrypted and securely stored
                  </Text>
                </View>
              </View>
            ) : (
              /* ── New Card Description ── */
              <View style={styles.newCardSection}>
                <View style={styles.newCardIconContainer}>
                  <View style={styles.newCardIconCircle}>
                    <Shield size={28} color={Colors.primary900} />
                  </View>
                </View>
                <Text style={styles.newCardTitle}>
                  {t.checkout.secureCardPayment}
                </Text>
                <Text style={styles.newCardDescription}>
                  {t.checkout.redirectToPayment}
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
                      <Check size={14} color={Colors.neutralWhite} />
                    )}
                  </View>
                  <Text style={styles.saveCardText}>
                    {t.checkout.saveCardForFuture}
                  </Text>
                </TouchableOpacity>

                {/* Security badge */}
                <View style={styles.securityBadge}>
                  <ShieldCheck size={16} color={Colors.primary900} />
                  <Text style={styles.securityBadgeText}>
                    PCI-DSS compliant
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Cash on Delivery Section */}
        {paymentType === "cod" && (
          <View style={styles.codSection}>
            <View style={styles.codIconContainer}>
              <View style={styles.codIconCircle}>
                <Banknote size={32} color={Colors.primary900} />
              </View>
            </View>
            <Text style={styles.codTitle}>{t.checkout.cashOnDelivery}</Text>
            <Text style={styles.codDescription}>{t.checkout.payOnArrival}</Text>

            <View style={styles.codFeatures}>
              <View style={styles.codFeatureRow}>
                <Check size={16} color={Colors.primary900} />
                <Text style={styles.codFeatureText}>
                  Pay when your order arrives
                </Text>
              </View>
              <View style={styles.codFeatureRow}>
                <Check size={16} color={Colors.primary900} />
                <Text style={styles.codFeatureText}>
                  Please have exact change ready
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            paymentType === "card" &&
              useSavedCard &&
              !selectedCardId &&
              styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={paymentType === "card" && useSavedCard && !selectedCardId}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>{t.common.next}</Text>
          <ArrowLeft
            size={18}
            color={Colors.neutralWhite}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
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

  scrollContent: {
    paddingBottom: Spacing.xl,
  },

  /* ── Header ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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

  /* ── Progress Stepper ── */
  progressContainer: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },

  progressBar: {
    flexDirection: "row",
    alignItems: "center",
  },

  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutralGray,
    alignItems: "center",
    justifyContent: "center",
  },

  progressDotCompleted: {
    backgroundColor: Colors.primary900,
  },

  progressDotActive: {
    backgroundColor: Colors.primary900,
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  progressText: {
    color: Colors.neutralWhite,
    fontWeight: "700",
    fontSize: 14,
  },

  progressTextInactive: {
    color: Colors.neutralMedium,
    fontWeight: "600",
    fontSize: 14,
  },

  progressLine: {
    width: 60,
    height: 3,
    backgroundColor: Colors.neutralGray,
    borderRadius: 1.5,
  },

  progressLineActive: {
    backgroundColor: Colors.primary900,
  },

  /* ── Payment Type Cards ── */
  paymentTypesContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  paymentTypeCard: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.neutralLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  paymentTypeCardActive: {
    borderColor: Colors.primary900,
    backgroundColor: "#f0fdf4",
    shadowColor: Colors.primary900,
    shadowOpacity: 0.1,
    elevation: 3,
  },

  paymentTypeIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },

  paymentTypeIconWrapperActive: {
    backgroundColor: Colors.primary900,
  },

  paymentTypeText: {
    fontSize: Typography.bodyBase,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },

  paymentTypeTextActive: {
    color: Colors.primary900,
    fontWeight: "700",
  },

  paymentTypeCheck: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary900,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Card Payment Section ── */
  cardPaymentSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },

  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },

  toggleLabel: {
    fontSize: Typography.bodyBase,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },

  loadingContainer: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.xxl,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },

  loadingText: {
    marginTop: Spacing.sm,
    color: Colors.neutralMedium,
    fontSize: Typography.bodyMedium,
  },

  /* ── Saved Cards ── */
  savedCardsWrapper: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },

  sectionTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },

  noEligibleCards: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },

  noEligibleText: {
    fontSize: Typography.bodyBase,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
    textAlign: "center",
    marginTop: Spacing.sm,
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
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },

  addPaymentButtonText: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.neutralWhite,
  },

  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
    gap: Spacing.xs,
  },

  securityNoteText: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },

  /* ── New Card ── */
  newCardSection: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },

  newCardIconContainer: {
    marginBottom: Spacing.md,
  },

  newCardIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },

  newCardTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },

  newCardDescription: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.md,
  },

  saveCardOption: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: Colors.neutralCloud,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },

  checkbox: {
    width: 22,
    height: 22,
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
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    fontWeight: "500",
  },

  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    gap: Spacing.xs,
  },

  securityBadgeText: {
    fontSize: Typography.bodySmall,
    color: Colors.primary900,
    fontWeight: "500",
  },

  /* ── Cash on Delivery ── */
  codSection: {
    backgroundColor: Colors.neutralWhite,
    marginHorizontal: Spacing.md,
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },

  codIconContainer: {
    marginBottom: Spacing.md,
  },

  codIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },

  codTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },

  codDescription: {
    color: Colors.neutralMedium,
    textAlign: "center",
    fontSize: Typography.bodyMedium,
    marginBottom: Spacing.lg,
  },

  codFeatures: {
    alignSelf: "stretch",
    gap: Spacing.sm,
  },

  codFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.neutralCloud,
    borderRadius: 10,
  },

  codFeatureText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    fontWeight: "500",
  },

  /* ── Bottom Bar ── */
  bottomBar: {
    backgroundColor: Colors.neutralWhite,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
  },

  continueButton: {
    flexDirection: "row",
    backgroundColor: Colors.primary900,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  continueButtonDisabled: {
    backgroundColor: Colors.neutralGray,
    shadowOpacity: 0,
    elevation: 0,
  },

  continueText: {
    color: Colors.neutralWhite,
    fontWeight: "700",
    fontSize: Typography.bodyBase,
  },
});
