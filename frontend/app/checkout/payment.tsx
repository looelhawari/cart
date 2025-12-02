import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, CreditCard, Banknote, Check } from 'lucide-react-native';
import { useStore } from '@/store';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export default function CheckoutPaymentScreen() {
  const router = useRouter();
  const { paymentMethods, setSelectedPaymentMethod, selectedPaymentMethod, cart } = useStore();
  const [paymentType, setPaymentType] = useState<'card' | 'cod'>('card');

  const total = cart.reduce((sum, item) => sum + (item.salePrice || item.price) * item.quantity, 0);

  const handleContinue = () => {
    if (paymentType === 'card' && !selectedPaymentMethod) {
      Alert.alert('Select Payment', 'Please select a payment method');
      return;
    }
    router.push('/checkout/confirmation');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
            <Text style={[styles.progressText, styles.progressTextInactive]}>3</Text>
          </View>
        </View>

        <View style={styles.paymentTypes}>
          <TouchableOpacity
            style={[
              styles.paymentTypeCard,
              paymentType === 'card' && styles.paymentTypeCardActive,
            ]}
            onPress={() => setPaymentType('card')}
          >
            <CreditCard
              size={24}
              color={paymentType === 'card' ? Colors.primary900 : Colors.neutralMedium}
            />
            <Text
              style={[
                styles.paymentTypeText,
                paymentType === 'card' && styles.paymentTypeTextActive,
              ]}
            >
              Credit/Debit Card
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentTypeCard,
              paymentType === 'cod' && styles.paymentTypeCardActive,
            ]}
            onPress={() => setPaymentType('cod')}
          >
            <Banknote
              size={24}
              color={paymentType === 'cod' ? Colors.primary900 : Colors.neutralMedium}
            />
            <Text
              style={[
                styles.paymentTypeText,
                paymentType === 'cod' && styles.paymentTypeTextActive,
              ]}
            >
              Cash on Delivery
            </Text>
          </TouchableOpacity>
        </View>

        {paymentType === 'card' && (
          <>
            <Text style={styles.sectionTitle}>Saved Cards</Text>

            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.cardItem,
                  selectedPaymentMethod === method.id && styles.cardItemSelected,
                ]}
                onPress={() => setSelectedPaymentMethod(method.id)}
              >
                <View style={styles.cardIcon}>
                  <CreditCard size={20} color={Colors.primary900} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNumber}>•••• •••• •••• {method.cardLastFour}</Text>
                  <Text style={styles.cardExpiry}>Expires {method.expiryMonth}/{method.expiryYear}</Text>
                </View>
                {selectedPaymentMethod === method.id && (
                  <View style={styles.checkCircle}>
                    <Check size={16} color={Colors.neutralWhite} />
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.addCardButton}
              onPress={() => router.push('/profile/payment')}
            >
              <Text style={styles.addCardText}>+ Add New Card</Text>
            </TouchableOpacity>
          </>
        )}

        {paymentType === 'cod' && (
          <View style={styles.codInfo}>
            <Banknote size={48} color={Colors.primary900} />
            <Text style={styles.codTitle}>Cash on Delivery</Text>
            <Text style={styles.codDescription}>
              Pay with cash when your order is delivered. Please keep exact change ready.
            </Text>
            <View style={styles.codNote}>
              <Text style={styles.codNoteText}>
                Total Amount: ${total.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue to Review</Text>
        </TouchableOpacity>
      </View>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  scrollView: {
    flex: 1,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.neutralWhite,
    marginBottom: Spacing.md,
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutralGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: Colors.primary900,
  },
  progressText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
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
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  paymentTypeCard: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentTypeCardActive: {
    borderColor: Colors.primary900,
  },
  paymentTypeText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
    textAlign: 'center',
  },
  paymentTypeTextActive: {
    color: Colors.primary900,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardItemSelected: {
    borderColor: Colors.primary900,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardNumber: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  cardExpiry: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardButton: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addCardText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  codInfo: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    alignItems: 'center',
  },
  codTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  codDescription: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  codNote: {
    backgroundColor: Colors.primary900 + '10',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  codNoteText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  bottomBar: {
    backgroundColor: Colors.neutralWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
    padding: Spacing.md,
  },
  continueButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
  },
  continueText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
});
