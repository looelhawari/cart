import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,

  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Globe,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';

export default function AboutScreen() {
  const handlePress = (url: string) => {
    Linking.openURL(url);
  };

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
        
        <Text style={styles.headerTitle}>About ElBaraka</Text>
        
        <View style={styles.headerButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>🛒 ElBaraka</Text>
          </View>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Us</Text>
          <Text style={styles.sectionText}>
            ElBaraka is your trusted online hypermarket, bringing fresh groceries
            and daily essentials directly to your doorstep. We're committed to
            providing quality products, competitive prices, and exceptional
            customer service.
          </Text>
        </View>

        {/* Mission Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.sectionText}>
            To make grocery shopping effortless and enjoyable by delivering fresh,
            quality products with speed and convenience, while building lasting
            relationships with our customers.
          </Text>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handlePress('mailto:support@elbaraka.com')}
            activeOpacity={0.7}
          >
            <Mail size={20} color={Colors.primary900} />
            <Text style={styles.contactText}>support@elbaraka.com</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handlePress('tel:+201234567890')}
            activeOpacity={0.7}
          >
            <Phone size={20} color={Colors.primary900} />
            <Text style={styles.contactText}>+20 123 456 7890</Text>
          </TouchableOpacity>
          
          <View style={styles.contactItem}>
            <MapPin size={20} color={Colors.primary900} />
            <Text style={styles.contactText}>
              123 Main Street, Cairo, Egypt
            </Text>
          </View>
        </View>

        {/* Social Media */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Us</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handlePress('https://facebook.com')}
              activeOpacity={0.7}
            >
              <Facebook size={24} color={Colors.neutralWhite} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handlePress('https://twitter.com')}
              activeOpacity={0.7}
            >
              <Twitter size={24} color={Colors.neutralWhite} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handlePress('https://instagram.com')}
              activeOpacity={0.7}
            >
              <Instagram size={24} color={Colors.neutralWhite} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Website */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.websiteButton}
            onPress={() => handlePress('https://elbaraka.com')}
            activeOpacity={0.9}
          >
            <Globe size={20} color={Colors.neutralWhite} />
            <Text style={styles.websiteButtonText}>Visit Our Website</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 ElBaraka Hypermarket{'\n'}
            All rights reserved
          </Text>
        </View>
      </ScrollView>
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
  logoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    backgroundColor: Colors.neutralWhite,
    marginBottom: Spacing.md,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary900,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoText: {
    fontSize: 40,
  },
  appVersion: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  section: {
    backgroundColor: Colors.neutralWhite,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  sectionText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    lineHeight: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  contactText: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
  },
  websiteButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  footerText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
});
