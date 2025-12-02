import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  description: string;
  amount: number;
  date: string;
  balance: number;
}

const transactions: Transaction[] = [
  {
    id: '1',
    type: 'credit',
    description: 'Added to wallet',
    amount: 100,
    date: '2025-01-15',
    balance: 342,
  },
  {
    id: '2',
    type: 'debit',
    description: 'Order #ORD-2025-0123',
    amount: 45.5,
    date: '2025-01-14',
    balance: 242,
  },
  {
    id: '3',
    type: 'credit',
    description: 'Refund - Order #ORD-2025-0120',
    amount: 22.75,
    date: '2025-01-12',
    balance: 287.5,
  },
  {
    id: '4',
    type: 'debit',
    description: 'Order #ORD-2025-0118',
    amount: 67.25,
    date: '2025-01-10',
    balance: 264.75,
  },
];

export default function WalletScreen() {
  const [balance] = useState(342.0);
  const [activeTab, setActiveTab] = useState<'transactions' | 'rewards'>('transactions');
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amount, setAmount] = useState('');

  const handleAddMoney = () => {
    console.log('Add money:', amount);
    setShowAddMoney(false);
    setAmount('');
  };

  const quickAmounts = [10, 25, 50, 100, 200];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>My Wallet</Text>
        
        <View style={styles.headerButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.walletIcon}>
              <Wallet size={32} color={Colors.neutralWhite} />
            </View>
            <Text style={styles.balanceLabel}>Total Balance</Text>
          </View>
          
          <Text style={styles.balanceAmount}>${balance.toFixed(2)}</Text>
          
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowAddMoney(true)}
              activeOpacity={0.9}
            >
              <Plus size={20} color={Colors.neutralWhite} />
              <Text style={styles.actionButtonText}>Add Money</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
            onPress={() => setActiveTab('transactions')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'transactions' && styles.tabTextActive,
              ]}
            >
              Transactions
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rewards' && styles.tabActive]}
            onPress={() => setActiveTab('rewards')}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabText, activeTab === 'rewards' && styles.tabTextActive]}
            >
              Rewards
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'transactions' ? (
          <View style={styles.transactionsSection}>
            {transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionLeft}>
                  <View
                    style={[
                      styles.transactionIcon,
                      {
                        backgroundColor:
                          transaction.type === 'credit'
                            ? `${Colors.primary900}15`
                            : `${Colors.accentRed}15`,
                      },
                    ]}
                  >
                    {transaction.type === 'credit' ? (
                      <ArrowDownLeft
                        size={20}
                        color={Colors.primary900}
                      />
                    ) : (
                      <ArrowUpRight size={20} color={Colors.accentRed} />
                    )}
                  </View>
                  
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>{transaction.date}</Text>
                  </View>
                </View>
                
                <View style={styles.transactionRight}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          transaction.type === 'credit'
                            ? Colors.primary900
                            : Colors.accentRed,
                      },
                    ]}
                  >
                    {transaction.type === 'credit' ? '+' : '-'}$
                    {transaction.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.transactionBalance}>
                    Bal: ${transaction.balance.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.rewardsSection}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No Rewards Yet</Text>
              <Text style={styles.emptyStateText}>
                Complete orders to earn rewards
              </Text>
            </View>
          </View>
        )}
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
            <Text style={styles.modalTitle}>Add Money to Wallet</Text>
            
            <View style={styles.quickAmounts}>
              {quickAmounts.map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={[
                    styles.quickAmountButton,
                    amount === quickAmount.toString() && styles.quickAmountButtonActive,
                  ]}
                  onPress={() => setAmount(quickAmount.toString())}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      amount === quickAmount.toString() &&
                        styles.quickAmountTextActive,
                    ]}
                  >
                    ${quickAmount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Custom Amount</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={Colors.neutralMedium}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>
            
            <View style={styles.paymentMethodSection}>
              <Text style={styles.paymentMethodLabel}>Payment Method</Text>
              <TouchableOpacity style={styles.paymentMethodCard} activeOpacity={0.7}>
                <View style={styles.paymentMethodLeft}>
                  <CreditCard size={24} color={Colors.primary900} />
                  <View>
                    <Text style={styles.paymentMethodTitle}>Credit Card</Text>
                    <Text style={styles.paymentMethodSubtitle}>•••• 1234</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddMoney(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalAddButton,
                  !amount && styles.modalAddButtonDisabled,
                ]}
                onPress={handleAddMoney}
                disabled={!amount}
                activeOpacity={0.9}
              >
                <Text style={styles.modalAddText}>Add Money</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: Typography.bodyBase,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: Typography.bold as any,
    color: Colors.neutralWhite,
    marginBottom: Spacing.lg,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: Spacing.sm,
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 20,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'flex-end',
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
    alignItems: 'center',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
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
    textAlign: 'center',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    backgroundColor: Colors.neutralLight,
    alignItems: 'center',
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutralLight,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
  },
  currencySymbol: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginRight: Spacing.xs,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutralLight,
    padding: Spacing.md,
    borderRadius: 16,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
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
    alignItems: 'center',
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
