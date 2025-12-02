import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';

export default function TermsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Terms & Conditions',
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
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.text}>
              By accessing and using ElBaraka mobile application, you accept and agree to be bound by the terms and provision of this agreement.
            </Text>

            <Text style={styles.sectionTitle}>2. Use License</Text>
            <Text style={styles.text}>
              Permission is granted to temporarily use ElBaraka for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
            </Text>

            <Text style={styles.sectionTitle}>3. Account Registration</Text>
            <Text style={styles.text}>
              You must register an account to use certain features of the service. You are responsible for maintaining the confidentiality of your account credentials.
            </Text>

            <Text style={styles.sectionTitle}>4. Orders and Payments</Text>
            <Text style={styles.text}>
              All orders placed through the app are subject to product availability. We reserve the right to refuse or cancel any order at any time.
            </Text>

            <Text style={styles.sectionTitle}>5. Delivery Policy</Text>
            <Text style={styles.text}>
              Delivery times are estimates and we cannot guarantee exact delivery times. Standard delivery takes 1-2 hours within our service area.
            </Text>

            <Text style={styles.sectionTitle}>6. Returns and Refunds</Text>
            <Text style={styles.text}>
              Returns are accepted within 24 hours of delivery for damaged or incorrect items. Contact customer support to initiate a return.
            </Text>

            <Text style={styles.sectionTitle}>7. User Conduct</Text>
            <Text style={styles.text}>
              You agree not to use the service for any unlawful purpose or in any way that interrupts, damages, or impairs the service.
            </Text>

            <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
            <Text style={styles.text}>
              ElBaraka shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of the service.
            </Text>

            <Text style={styles.sectionTitle}>9. Changes to Terms</Text>
            <Text style={styles.text}>
              We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
            </Text>

            <Text style={styles.sectionTitle}>10. Contact Information</Text>
            <Text style={styles.text}>
              For questions about these Terms and Conditions, please contact us at support@elbaraka.com
            </Text>

            <Text style={styles.lastUpdated}>Last updated: January 20, 2024</Text>
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
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  text: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  lastUpdated: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    fontStyle: 'italic',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
});
