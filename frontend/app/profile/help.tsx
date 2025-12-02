import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Phone,
  Mail,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    id: '1',
    category: 'Orders & Delivery',
    question: 'How do I track my order?',
    answer: 'You can track your order in real-time by going to My Orders and tapping on the order you want to track. You\'ll see a live map with your driver\'s location and estimated delivery time.',
  },
  {
    id: '2',
    category: 'Orders & Delivery',
    question: 'Can I cancel my order?',
    answer: 'Yes, you can cancel your order before it\'s confirmed by the store. Go to Order Details and tap "Cancel Order". Once the order is being prepared, cancellation is not possible.',
  },
  {
    id: '3',
    category: 'Payments & Refunds',
    question: 'What payment methods do you accept?',
    answer: 'We accept Visa, Mastercard, and Cash on Delivery. You can save your payment methods in your profile for faster checkout.',
  },
  {
    id: '4',
    category: 'Payments & Refunds',
    question: 'How do refunds work?',
    answer: 'If you cancel an order before it\'s confirmed, the refund will be processed within 3-5 business days to your original payment method. For cash on delivery orders, no refund is necessary.',
  },
  {
    id: '5',
    category: 'Products',
    question: 'Are your products fresh?',
    answer: 'Yes! We source our products daily from trusted suppliers and ensure quality checks before delivery. If you receive any product that doesn\'t meet quality standards, please contact us immediately.',
  },
  {
    id: '6',
    category: 'Products',
    question: 'What if an item is out of stock?',
    answer: 'If an item becomes out of stock after you place your order, we\'ll call you to suggest an alternative or remove it from your order with a refund for that item.',
  },
  {
    id: '7',
    category: 'Account Management',
    question: 'How do I change my delivery address?',
    answer: 'Go to Profile > My Addresses. You can add, edit, or delete addresses. During checkout, you can also select a different address or add a new one.',
  },
  {
    id: '8',
    category: 'Account Management',
    question: 'How do I update my profile information?',
    answer: 'Go to Profile > Edit Profile. You can update your name, email, phone number, and other personal information.',
  },
];

const categories = ['All', ...Array.from(new Set(faqs.map((faq) => faq.category)))];

export default function HelpScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleHelpful = (faqId: string, helpful: boolean) => {
    console.log(`FAQ ${faqId} was ${helpful ? 'helpful' : 'not helpful'}`);
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
        
        <Text style={styles.headerTitle}>Help Center</Text>
        
        <View style={styles.headerButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <Text style={styles.title}>How can we help you?</Text>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.neutralMedium} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help..."
              placeholderTextColor={Colors.neutralMedium}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinksSection}>
          <Text style={styles.sectionTitle}>Quick Help</Text>
          <View style={styles.quickLinks}>
            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() => router.push('/(tabs)/orders')}
              activeOpacity={0.9}
            >
              <View style={styles.quickLinkIcon}>
                <Package size={24} color={Colors.primary900} />
              </View>
              <Text style={styles.quickLinkText}>Track Order</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() => router.push('/complaints/new' as any)}
              activeOpacity={0.9}
            >
              <View style={styles.quickLinkIcon}>
                <MessageCircle size={24} color={Colors.accentOrange} />
              </View>
              <Text style={styles.quickLinkText}>Report Issue</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category && styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FAQs */}
        <View style={styles.faqsSection}>
          {filteredFaqs.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No results found</Text>
            </View>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <View key={faq.id} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    onPress={() => setExpandedId(isExpanded ? null : faq.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    {isExpanded ? (
                      <ChevronUp size={20} color={Colors.primary900} />
                    ) : (
                      <ChevronDown size={20} color={Colors.neutralMedium} />
                    )}
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <>
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                      <View style={styles.helpfulSection}>
                        <Text style={styles.helpfulText}>Was this helpful?</Text>
                        <View style={styles.helpfulButtons}>
                          <TouchableOpacity
                            style={styles.helpfulButton}
                            onPress={() => handleHelpful(faq.id, true)}
                            activeOpacity={0.7}
                          >
                            <ThumbsUp size={16} color={Colors.primary900} />
                            <Text style={styles.helpfulButtonText}>Yes</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.helpfulButton}
                            onPress={() => handleHelpful(faq.id, false)}
                            activeOpacity={0.7}
                          >
                            <ThumbsDown size={16} color={Colors.neutralMedium} />
                            <Text style={[styles.helpfulButtonText, { color: Colors.neutralMedium }]}>
                              No
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Contact Support */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Didn't find what you need?</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => router.push('/complaints/new' as any)}
            activeOpacity={0.9}
          >
            <MessageCircle size={20} color={Colors.neutralWhite} />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
          
          <View style={styles.contactMethods}>
            <View style={styles.contactMethod}>
              <Phone size={16} color={Colors.neutralMedium} />
              <Text style={styles.contactMethodText}>+20 123 456 789</Text>
            </View>
            <View style={styles.contactMethod}>
              <Mail size={16} color={Colors.neutralMedium} />
              <Text style={styles.contactMethodText}>support@elbaraka.com</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Package = ({ size, color }: { size: number; color: string }) => (
  <View style={{ width: size, height: size, backgroundColor: color, borderRadius: size / 4 }} />
);

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
  searchSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.neutralWhite,
  },
  title: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutralLight,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },
  quickLinksSection: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickLinkCard: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickLinkIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.neutralLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickLinkText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    textAlign: 'center',
  },
  categoriesSection: {
    marginBottom: Spacing.md,
  },
  categoriesScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    backgroundColor: Colors.neutralWhite,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary900,
    borderColor: Colors.primary900,
  },
  categoryChipText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  categoryChipTextActive: {
    color: Colors.neutralWhite,
  },
  faqsSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  faqCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginRight: Spacing.sm,
  },
  faqAnswer: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    lineHeight: 22,
    marginTop: Spacing.md,
  },
  helpfulSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
  },
  helpfulText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  helpfulButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  helpfulButtonText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  noResults: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  contactSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.neutralWhite,
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.md,
  },
  contactButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  contactMethods: {
    gap: Spacing.sm,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  contactMethodText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
});
