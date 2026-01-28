import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowLeft,
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Smartphone,
  X,
} from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { API_CONFIG } from "@/config/app.config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "@/i18n";

interface Transaction {
  id: number;
  type: "credit" | "debit";
  description: string;
  amount: string;
  balance_before: string;
  balance_after: string;
  created_at: string;
}

interface WalletData {
  balance: number;
  total_credited: number;
  total_debited: number;
  transactions: Transaction[];
}

export default function WalletScreen() {
  const { t } = useTranslation();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "WALLET">("CARD");
  const [recharging, setRecharging] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const getToken = async () => {
    return await AsyncStorage.getItem("access_token");
  };

  const loadWallet = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      console.log("Token retrieved:", token ? "Token exists" : "No token");

      if (!token) {
        Alert.alert("Error", "Please login to view your wallet");
        router.replace("/login");
        return;
      }

      console.log("Calling wallet API:", `${API_CONFIG.BASE_URL}/wallet`);

      const response = await fetch(`${API_CONFIG.BASE_URL}/wallet`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "ElBaraka-Mobile-App",
        },
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Wallet data received:", data);

      if (data.success) {
        setWalletData(data.data);
      } else {
        throw new Error(data.message || "Failed to load wallet");
      }
    } catch (error: any) {
      console.error("Failed to load wallet", error);
      Alert.alert("Error", error.message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleAddMoney = async () => {
    const amountNum = parseFloat(amount);
    if (!amount || amountNum < 10) {
      Alert.alert(t.common.error, t.wallet.minimumRecharge);
      return;
    }
    if (amountNum > 10000) {
      Alert.alert(t.common.error, t.wallet.maximumRecharge);
      return;
    }

    try {
      setRecharging(true);
      const token = await getToken();
      const response = await fetch(`${API_CONFIG.BASE_URL}/wallet/recharge`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "ElBaraka-Mobile-App",
        },
        body: JSON.stringify({
          amount: amountNum,
          payment_method: paymentMethod,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowAddMoney(false);
        setAmount("");

        // Open Paymob iframe in browser
        Alert.alert(
          "Complete Payment",
          "You will be redirected to complete your payment securely with Paymob.",
          [
            {
              text: "Continue",
              onPress: () => {
                // Here you would open the iframe_url in a WebView or browser
                console.log("Payment URL:", data.data.iframe_url);
                // For now, just reload wallet after 5 seconds to check for update
                setTimeout(() => loadWallet(), 5000);
              },
            },
          ],
        );
      } else {
        Alert.alert("Error", data.message || "Failed to initiate recharge");
      }
    } catch (error) {
      console.error("Recharge failed", error);
      Alert.alert("Error", "Failed to process recharge");
    } finally {
      setRecharging(false);
    }
  };

  const quickAmounts = [100, 200, 500, 1000];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.wallet.title}</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t.wallet.title}</Text>

        <View style={styles.headerButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.walletIcon}>
              <Wallet size={32} color={Colors.neutralWhite} />
            </View>
            <Text style={styles.balanceLabel}>{t.wallet.totalBalance}</Text>
          </View>

          <Text style={styles.balanceAmount}>
            {walletData?.balance.toFixed(2) || "0.00"} EGP
          </Text>

          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowAddMoney(true)}
              activeOpacity={0.9}
            >
              <Plus size={20} color={Colors.neutralWhite} />
              <Text style={styles.actionButtonText}>{t.wallet.addMoney}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions Section */}
        <Text style={styles.sectionTitle}>{t.wallet.recentTransactions}</Text>

        {/* Content */}
        <View style={styles.transactionsSection}>
          {walletData &&
          walletData.transactions &&
          walletData.transactions.length > 0 ? (
            walletData.transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionLeft}>
                  <View
                    style={[
                      styles.transactionIcon,
                      {
                        backgroundColor:
                          transaction.type === "credit"
                            ? `${Colors.primary900}15`
                            : `${Colors.accentRed}15`,
                      },
                    ]}
                  >
                    {transaction.type === "credit" ? (
                      <ArrowDownLeft size={20} color={Colors.primary900} />
                    ) : (
                      <ArrowUpRight size={20} color={Colors.accentRed} />
                    )}
                  </View>

                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.transactionRight}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          transaction.type === "credit"
                            ? Colors.primary900
                            : Colors.accentRed,
                      },
                    ]}
                  >
                    {transaction.type === "credit" ? "+" : "-"}
                    {parseFloat(transaction.amount).toFixed(2)} EGP
                  </Text>
                  <Text style={styles.transactionBalance}>
                    {t.wallet.bal}:{" "}
                    {parseFloat(transaction.balance_after).toFixed(2)} EGP
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>
                {t.wallet.noTransactionsYet}
              </Text>
              <Text style={styles.emptyStateText}>
                {t.wallet.addMoneyToGetStarted}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Money Modal */}
      <Modal
        visible={showAddMoney}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMoney(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.wallet.addMoneyToWallet}</Text>
              <TouchableOpacity onPress={() => setShowAddMoney(false)}>
                <X size={24} color={Colors.neutralCharcoal} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickAmounts}>
              {quickAmounts.map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={[
                    styles.quickAmountButton,
                    amount === quickAmount.toString() &&
                      styles.quickAmountButtonActive,
                  ]}
                  onPress={() => handleQuickAmount(quickAmount)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      amount === quickAmount.toString() &&
                        styles.quickAmountTextActive,
                    ]}
                  >
                    {quickAmount} EGP
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t.wallet.customAmount}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={t.wallet.enterAmount}
                  placeholderTextColor={Colors.neutralMedium}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
                <Text style={styles.currencyText}>EGP</Text>
              </View>
              <Text style={styles.inputHint}>{t.wallet.minMaxAmount}</Text>
            </View>

            <View style={styles.paymentMethodSection}>
              <Text style={styles.paymentMethodLabel}>
                {t.wallet.paymentMethod}
              </Text>

              <TouchableOpacity
                style={[
                  styles.paymentMethodCard,
                  paymentMethod === "CARD" && styles.paymentMethodCardActive,
                ]}
                onPress={() => setPaymentMethod("CARD")}
                activeOpacity={0.7}
              >
                <View style={styles.paymentMethodLeft}>
                  <CreditCard size={24} color={Colors.primary900} />
                  <View>
                    <Text style={styles.paymentMethodTitle}>
                      {t.wallet.creditDebitCard}
                    </Text>
                    <Text style={styles.paymentMethodSubtitle}>
                      {t.wallet.visaMastercardAmex}
                    </Text>
                  </View>
                </View>
                {paymentMethod === "CARD" && (
                  <View style={styles.selectedCheck}>
                    <ArrowDownLeft size={16} color={Colors.neutralWhite} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethodCard,
                  paymentMethod === "WALLET" && styles.paymentMethodCardActive,
                ]}
                onPress={() => setPaymentMethod("WALLET")}
                activeOpacity={0.7}
              >
                <View style={styles.paymentMethodLeft}>
                  <Smartphone size={24} color={Colors.accentOrange} />
                  <View>
                    <Text style={styles.paymentMethodTitle}>
                      {t.wallet.mobileWallet}
                    </Text>
                    <Text style={styles.paymentMethodSubtitle}>
                      {t.wallet.vodafoneOrangeEtisalat}
                    </Text>
                  </View>
                </View>
                {paymentMethod === "WALLET" && (
                  <View style={styles.selectedCheck}>
                    <ArrowDownLeft size={16} color={Colors.neutralWhite} />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddMoney(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>{t.common.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalAddButton,
                  (!amount || recharging) && styles.modalAddButtonDisabled,
                ]}
                onPress={handleAddMoney}
                disabled={!amount || recharging}
                activeOpacity={0.9}
              >
                {recharging ? (
                  <ActivityIndicator size="small" color={Colors.neutralWhite} />
                ) : (
                  <Text style={styles.modalAddText}>
                    {t.wallet.continueToPayment}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerButton: {
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
  balanceCard: {
    backgroundColor: Colors.primary900,
    margin: Spacing.lg,
    borderRadius: 24,
    padding: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceLabel: {
    fontSize: Typography.bodyBase,
    color: "rgba(255, 255, 255, 0.9)",
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: Typography.bold as any,
    color: Colors.neutralWhite,
    marginBottom: Spacing.lg,
  },
  balanceActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: Spacing.sm,
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: Colors.neutralWhite,
  },
  tabActive: {
    backgroundColor: Colors.primary900,
  },
  tabText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  tabTextActive: {
    color: Colors.neutralWhite,
  },
  transactionsSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  transactionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 20,
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    marginBottom: 2,
  },
  transactionBalance: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  rewardsSection: {
    paddingHorizontal: Spacing.lg,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  emptyStateText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.neutralWhite,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  quickAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: "30%",
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
  },
  quickAmountButtonActive: {
    backgroundColor: Colors.primary900,
  },
  quickAmountText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  quickAmountTextActive: {
    color: Colors.neutralWhite,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  inputHint: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: Spacing.xs,
  },
  currencyText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  paymentMethodCardActive: {
    backgroundColor: `${Colors.primary900}10`,
    borderWidth: 2,
    borderColor: Colors.primary900,
  },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary900,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralLight,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    justifyContent: "space-between",
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  paymentMethodSection: {
    marginBottom: Spacing.lg,
  },
  paymentMethodLabel: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  paymentMethodCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.neutralLight,
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.sm,
  },
  paymentMethodLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  paymentMethodTitle: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: 2,
  },
  paymentMethodSubtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: Colors.neutralLight,
  },
  modalCancelText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  modalAddButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: Colors.primary900,
  },
  modalAddButtonDisabled: {
    backgroundColor: Colors.neutralGray,
  },
  modalAddText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
});
