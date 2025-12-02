import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Plus, Check } from 'lucide-react-native';
import { useStore } from '@/store';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export default function CheckoutAddressScreen() {
  const router = useRouter();
  const { addresses, setSelectedAddress, selectedAddress } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    street: '',
    apartment: '',
    city: '',
    postalCode: '',
    phone: '',
  });

  const handleContinue = () => {
    if (!selectedAddress) {
      Alert.alert('Select Address', 'Please select a delivery address');
      return;
    }
    router.push('/checkout/payment');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Address</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.progressBar}>
          <View style={[styles.progressDot, styles.progressDotActive]}>
            <Text style={styles.progressText}>1</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressDot}>
            <Text style={[styles.progressText, styles.progressTextInactive]}>2</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressDot}>
            <Text style={[styles.progressText, styles.progressTextInactive]}>3</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Saved Addresses</Text>

        {addresses.map((address) => (
          <TouchableOpacity
            key={address.id}
            style={[
              styles.addressCard,
              selectedAddress === address.id && styles.addressCardSelected,
            ]}
            onPress={() => setSelectedAddress(address.id)}
          >
            <View style={styles.addressHeader}>
              <View style={styles.addressLabelRow}>
                <MapPin size={16} color={Colors.primary900} />
                <Text style={styles.addressLabel}>{address.label}</Text>
                {address.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </View>
              {selectedAddress === address.id && (
                <View style={styles.checkCircle}>
                  <Check size={16} color={Colors.neutralWhite} />
                </View>
              )}
            </View>
            <Text style={styles.addressText}>
              {address.street}
              {address.apartment ? `, ${address.apartment}` : ''}
            </Text>
            <Text style={styles.addressText}>
              {address.city}, {address.postalCode}
            </Text>
            {address.phone && <Text style={styles.addressPhone}>{address.phone}</Text>}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.addAddressButton}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={20} color={Colors.primary900} />
          <Text style={styles.addAddressText}>Add New Address</Text>
        </TouchableOpacity>

        {showAddForm && (
          <View style={styles.addForm}>
            <Text style={styles.formTitle}>New Address</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Label</Text>
              <View style={styles.labelButtons}>
                {['Home', 'Work', 'Other'].map((label) => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.labelButton,
                      newAddress.label === label && styles.labelButtonActive,
                    ]}
                    onPress={() => setNewAddress({ ...newAddress, label })}
                  >
                    <Text
                      style={[
                        styles.labelButtonText,
                        newAddress.label === label && styles.labelButtonTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Street Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="123 Main Street"
                value={newAddress.street}
                onChangeText={(text) => setNewAddress({ ...newAddress, street: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Apartment / Floor</Text>
              <TextInput
                style={styles.input}
                placeholder="Apt 4B"
                value={newAddress.apartment}
                onChangeText={(text) => setNewAddress({ ...newAddress, apartment: text })}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Cairo"
                  value={newAddress.city}
                  onChangeText={(text) => setNewAddress({ ...newAddress, city: text })}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Postal Code *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="11511"
                  value={newAddress.postalCode}
                  onChangeText={(text) => setNewAddress({ ...newAddress, postalCode: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+20 123 456 7890"
                value={newAddress.phone}
                onChangeText={(text) => setNewAddress({ ...newAddress, phone: text })}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity style={styles.saveAddressButton}>
              <Text style={styles.saveAddressText}>Save Address</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue to Payment</Text>
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
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  addressCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  addressCardSelected: {
    borderColor: Colors.primary900,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addressLabel: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  defaultBadge: {
    backgroundColor: Colors.primary900 + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultText: {
    fontSize: Typography.bodySmall,
    color: Colors.primary900,
    fontWeight: Typography.semibold,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginTop: Spacing.xs,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderStyle: 'dashed',
  },
  addAddressText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  addForm: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  formTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  labelButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  labelButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    backgroundColor: Colors.neutralLight,
    alignItems: 'center',
  },
  labelButtonActive: {
    backgroundColor: Colors.primary900,
  },
  labelButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  labelButtonTextActive: {
    color: Colors.neutralWhite,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  saveAddressButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveAddressText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
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
