import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { ArrowLeft, CreditCard, Plus, Trash2 } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { Button } from '@/components/Button';

const paymentMethods = [
  { id: '1', type: 'Visa', last4: '4242', isDefault: true },
  { id: '2', type: 'Mastercard', last4: '8888', isDefault: false },
];

export default function PaymentMethodsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Payment Methods',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: -8 }}>
              <ArrowLeft size={24} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {paymentMethods.map((method) => (
              <View key={method.id} style={styles.methodCard}>
                <View style={styles.methodLeft}>
                  <View style={styles.iconContainer}>
                    <CreditCard size={24} color={Colors.primary900} />
                  </View>
                  <View>
                    <Text style={styles.methodType}>{method.type}</Text>
                    <Text style={styles.methodNumber}>•••• {method.last4}</Text>
                    {method.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.deleteButton}>
                  <Trash2 size={20} color={Colors.accentRed} />
                </TouchableOpacity>
              </View>
            ))}

            <Button
              title="Add New Card"
              onPress={() => router.push('/profile/add-card')}
              icon={<Plus size={20} color={Colors.neutralWhite} />}
              variant="primary"
            />
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
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary900}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodType: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  methodNumber: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginBottom: 4,
  },
  defaultBadge: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  defaultText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralWhite,
    fontWeight: Typography.semibold,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.accentRed}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
