import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Zap, Tag, Star, TrendingUp, Clock, Percent } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';

const { width } = Dimensions.get('window');

type OfferTab = 'flash' | 'featured' | 'clearance' | 'trending';

interface Offer {
  id: string;
  title: string;
  subtitle: string;
  discount: string;
  imageUrl: string;
  category: string;
  validUntil: string;
  badge?: string;
}

const offers: Record<OfferTab, Offer[]> = {
  flash: [
    {
      id: '1',
      title: 'Flash Sale - Fresh Fruits',
      subtitle: 'Limited Time Offer',
      discount: 'Up to 50% OFF',
      imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800',
      category: 'Fruits',
      validUntil: '2 hours left',
      badge: '⚡ Flash',
    },
    {
      id: '2',
      title: 'Dairy Products Deal',
      subtitle: 'Fresh from farm',
      discount: '40% OFF',
      imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800',
      category: 'Dairy',
      validUntil: '5 hours left',
      badge: '⚡ Flash',
    },
    {
      id: '3',
      title: 'Organic Vegetables',
      subtitle: 'Farm fresh',
      discount: '35% OFF',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800',
      category: 'Vegetables',
      validUntil: '3 hours left',
      badge: '⚡ Flash',
    },
  ],
  featured: [
    {
      id: '4',
      title: 'Premium Bakery Items',
      subtitle: 'Freshly baked daily',
      discount: '25% OFF',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
      category: 'Bakery',
      validUntil: 'This week',
      badge: '⭐ Featured',
    },
    {
      id: '5',
      title: 'Meat & Seafood',
      subtitle: 'Premium quality',
      discount: '30% OFF',
      imageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800',
      category: 'Meat',
      validUntil: 'This week',
      badge: '⭐ Featured',
    },
    {
      id: '6',
      title: 'Beverages Bundle',
      subtitle: 'Stay refreshed',
      discount: 'Buy 2 Get 1',
      imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800',
      category: 'Beverages',
      validUntil: 'This week',
      badge: '⭐ Featured',
    },
  ],
  clearance: [
    {
      id: '7',
      title: 'Snacks Clearance',
      subtitle: 'Stock up now',
      discount: '60% OFF',
      imageUrl: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=800',
      category: 'Snacks',
      validUntil: 'While stocks last',
      badge: '🔥 Clearance',
    },
    {
      id: '8',
      title: 'Household Items',
      subtitle: 'Clear stock sale',
      discount: '45% OFF',
      imageUrl: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=800',
      category: 'Household',
      validUntil: 'While stocks last',
      badge: '🔥 Clearance',
    },
  ],
  trending: [
    {
      id: '9',
      title: 'Trending Now - Superfoods',
      subtitle: 'Health conscious',
      discount: '20% OFF',
      imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
      category: 'Health',
      validUntil: 'This month',
      badge: '📈 Trending',
    },
    {
      id: '10',
      title: 'Plant-Based Products',
      subtitle: 'Eco-friendly',
      discount: '25% OFF',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
      category: 'Vegan',
      validUntil: 'This month',
      badge: '📈 Trending',
    },
  ],
};

export default function OffersScreen() {
  const [activeTab, setActiveTab] = useState<OfferTab>('flash');

  const tabs: { key: OfferTab; label: string; icon: typeof Zap }[] = [
    { key: 'flash', label: 'Flash', icon: Zap },
    { key: 'featured', label: 'Featured', icon: Star },
    { key: 'clearance', label: 'Clearance', icon: Percent },
    { key: 'trending', label: 'Trending', icon: TrendingUp },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Offers & Deals',
          headerStyle: {
            backgroundColor: Colors.neutralWhite,
          },
          headerTitleStyle: {
            fontSize: Typography.h2,
            fontWeight: Typography.bold as '700',
            color: Colors.neutralCharcoal,
          },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {tabs.map(({ key, label, icon: Icon }) => (
              <TouchableOpacity
                key={key}
                style={[styles.tab, activeTab === key && styles.tabActive]}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.7}
              >
                <Icon
                  size={18}
                  color={activeTab === key ? Colors.primary900 : Colors.neutralMedium}
                />
                <Text
                  style={[styles.tabText, activeTab === key && styles.tabTextActive]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {activeTab === 'flash' && (
            <View style={styles.timerCard}>
              <View style={styles.timerLeft}>
                <Zap size={24} color={Colors.accentOrange} />
                <View>
                  <Text style={styles.timerTitle}>Flash Sale Active!</Text>
                  <Text style={styles.timerSubtitle}>Limited time offers</Text>
                </View>
              </View>
              <View style={styles.timerRight}>
                <Clock size={16} color={Colors.accentRed} />
                <Text style={styles.timerText}>5h 23m</Text>
              </View>
            </View>
          )}

          {offers[activeTab].map((offer) => (
            <TouchableOpacity
              key={offer.id}
              style={styles.offerCard}
              activeOpacity={0.9}
              onPress={() => router.push('/categories')}
            >
              <Image
                source={{ uri: offer.imageUrl }}
                style={styles.offerImage}
                resizeMode="cover"
              />
              <View style={styles.offerOverlay} />
              <View style={styles.offerContent}>
                {offer.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{offer.badge}</Text>
                  </View>
                )}
                <View style={styles.offerInfo}>
                  <Text style={styles.category}>{offer.category}</Text>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                  <Text style={styles.offerSubtitle}>{offer.subtitle}</Text>
                  <View style={styles.offerBottom}>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discount}>{offer.discount}</Text>
                    </View>
                    <View style={styles.validUntil}>
                      <Clock size={14} color={Colors.neutralWhite} />
                      <Text style={styles.validText}>{offer.validUntil}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <View style={styles.emptyFooter}>
            <Tag size={48} color={Colors.neutralGray} />
            <Text style={styles.emptyText}>More deals coming soon!</Text>
            <Text style={styles.emptySubtext}>
              Check back regularly for new offers
            </Text>
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
  tabsContainer: {
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  tabsContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
  },
  tabActive: {
    backgroundColor: `${Colors.primary900}15`,
  },
  tabText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  tabTextActive: {
    color: Colors.primary900,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.accentOrange,
    shadowColor: Colors.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  timerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timerTitle: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold as '700',
    color: Colors.neutralCharcoal,
  },
  timerSubtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  timerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: `${Colors.accentRed}15`,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
  },
  timerText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.bold as '700',
    color: Colors.accentRed,
  },
  offerCard: {
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  offerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  offerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  offerContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: Colors.neutralWhite,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.bold as '700',
    color: Colors.neutralCharcoal,
  },
  offerInfo: {
    gap: 4,
  },
  category: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
    color: Colors.accentLime,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  offerTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold as '700',
    color: Colors.neutralWhite,
  },
  offerSubtitle: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralWhite,
    opacity: 0.9,
  },
  offerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  discountBadge: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  discount: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold as '700',
    color: Colors.neutralWhite,
  },
  validUntil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  validText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralWhite,
    fontWeight: Typography.semibold,
  },
  emptyFooter: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  emptySubtext: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    textAlign: 'center',
  },
});
