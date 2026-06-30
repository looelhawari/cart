import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ArrowLeft, CreditCard, Lock } from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { Button } from "@/components/Button";
import { useTranslation } from "@/i18n";

export default function AddCardScreen() {
  const { t } = useTranslation();
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(true);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.substring(0, 19);
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const getCardType = () => {
    const firstDigit = cardNumber.charAt(0);
    if (firstDigit === "4") return "Visa";
    if (firstDigit === "5") return "Mastercard";
    return "Card";
  };

  const handleAddCard = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t.ui.addPaymentCard,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: -8 }}
            >
              <ArrowLeft size={24} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.cardPreview}>
              <View style={styles.cardGradient}>
                <View style={styles.cardChip} />
                <Text style={styles.cardNumberPreview}>
                  {cardNumber || "•••• •••• •••• ••••"}
                </Text>
                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.cardLabel}>{t.ui.cardHolder}</Text>
                    <Text style={styles.cardHolderPreview}>
                      {cardHolder || t.ui.yourName}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.cardLabel}>{t.ui.expires}</Text>
                    <Text style={styles.cardExpiryPreview}>
                      {expiry || t.ui.mmyy}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardType}>{getCardType()}</Text>
              </View>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t.addCard.cardNumber}</Text>
                <View style={styles.inputContainer}>
                  <CreditCard size={20} color={Colors.neutralMedium} />
                  <TextInput
                    style={styles.input}
                    placeholder={t.addCard.enterCardNumber}
                    placeholderTextColor={Colors.neutralMedium}
                    value={cardNumber}
                    onChangeText={(text) =>
                      setCardNumber(formatCardNumber(text))
                    }
                    keyboardType="numeric"
                    maxLength={19}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t.addCard.cardholderName}</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { marginLeft: 0 }]}
                    placeholder={t.addCard.enterCardholderName}
                    placeholderTextColor={Colors.neutralMedium}
                    value={cardHolder}
                    onChangeText={setCardHolder}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>{t.addCard.expiryDate}</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, { marginLeft: 0 }]}
                      placeholder={t.addCard.enterExpiryDate}
                      placeholderTextColor={Colors.neutralMedium}
                      value={expiry}
                      onChangeText={(text) => setExpiry(formatExpiry(text))}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>{t.addCard.cvv}</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={16} color={Colors.neutralMedium} />
                    <TextInput
                      style={styles.input}
                      placeholder={t.addCard.enterCVV}
                      placeholderTextColor={Colors.neutralMedium}
                      value={cvv}
                      onChangeText={(text) =>
                        setCvv(text.replace(/\D/g, "").substring(0, 3))
                      }
                      keyboardType="numeric"
                      maxLength={3}
                      secureTextEntry
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setSaveCard(!saveCard)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    saveCard && styles.checkboxBoxChecked,
                  ]}
                >
                  {saveCard && <View style={styles.checkboxCheck} />}
                </View>
                <Text style={styles.checkboxLabel}>{t.addCard.saveCard}</Text>
              </TouchableOpacity>

              <View style={styles.securityInfo}>
                <Lock size={16} color={Colors.primary900} />
                <Text style={styles.securityText}>
                  {t.addCard.securePayment}
                </Text>
              </View>

              <Button
                title={t.addCard.addCardButton}
                onPress={handleAddCard}
                variant="primary"
                disabled={!cardNumber || !cardHolder || !expiry || !cvv}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  content: {
    padding: Spacing.lg,
  },
  cardPreview: {
    marginBottom: Spacing.xl,
  },
  cardGradient: {
    height: 200,
    borderRadius: 20,
    padding: Spacing.lg,
    backgroundColor: Colors.primary900,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cardChip: {
    width: 45,
    height: 35,
    borderRadius: 6,
    backgroundColor: Colors.accentYellow,
    marginBottom: Spacing.lg,
  },
  cardNumberPreview: {
    fontSize: 22,
    fontWeight: Typography.bold as "700",
    color: Colors.neutralWhite,
    letterSpacing: 2,
    marginBottom: Spacing.lg,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: "auto",
  },
  cardLabel: {
    fontSize: 10,
    color: Colors.neutralWhite,
    opacity: 0.7,
    marginBottom: 4,
    letterSpacing: 1,
  },
  cardHolderPreview: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralWhite,
  },
  cardExpiryPreview: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralWhite,
  },
  cardType: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold as "700",
    color: Colors.neutralWhite,
    opacity: 0.8,
  },
  form: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    marginLeft: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxChecked: {
    borderColor: Colors.primary900,
    backgroundColor: Colors.primary900,
  },
  checkboxCheck: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: Colors.neutralWhite,
  },
  checkboxLabel: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
  },
  securityInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.md,
    backgroundColor: `${Colors.primary900}10`,
    borderRadius: 12,
  },
  securityText: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.primary900,
  },
});
