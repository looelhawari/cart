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

export default function PrivacyScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Privacy Policy',
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
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.text}>
              We collect information you provide directly to us, including name, email address, phone number, delivery address, and payment information.
            </Text>

            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.text}>
              We use the information we collect to process orders, provide customer support, send transactional information, and improve our services.
            </Text>

            <Text style={styles.sectionTitle}>3. Information Sharing</Text>
            <Text style={styles.text}>
              We do not sell, trade, or rent your personal information to third parties. We may share your information with service providers who assist us in operating our platform.
            </Text>

            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.text}>
              We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.
            </Text>

            <Text style={styles.sectionTitle}>5. Cookies and Tracking</Text>
            <Text style={styles.text}>
              We use cookies and similar tracking technologies to enhance user experience, analyze trends, and gather demographic information.
            </Text>

            <Text style={styles.sectionTitle}>6. Your Rights</Text>
            <Text style={styles.text}>
              You have the right to access, update, or delete your personal information. You can manage your information through your account settings.
            </Text>

            <Text style={styles.sectionTitle}>7. Children&apos;s Privacy</Text>
            <Text style={styles.text}>
              Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.
            </Text>

            <Text style={styles.sectionTitle}>8. Changes to Privacy Policy</Text>
            <Text style={styles.text}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.
            </Text>

            <Text style={styles.sectionTitle}>9. Data Retention</Text>
            <Text style={styles.text}>
              We retain your personal information for as long as necessary to provide our services and comply with legal obligations.
            </Text>

            <Text style={styles.sectionTitle}>10. Contact Us</Text>
            <Text style={styles.text}>
              If you have any questions about this Privacy Policy, please contact us at privacy@elbaraka.com
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
