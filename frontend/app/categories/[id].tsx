import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, ShoppingCart, Grid3x3, List, SlidersHorizontal } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { ProductCard } from '@/components/ProductCard';
import { products } from '@/data/products';
import { categories } from '@/data/categories';
import { useStore } from '@/store';

type ViewMode = 'grid' | 'list';
type SortOption = 'relevance' | 'price_low' | 'price_high' | 'rating';

export default function CategoryProductsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const { cart } = useStore();
  
  const category = categories.find((c) => c.id === id);
  const categoryProducts = products.filter((p) => p.category === id);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const sortProducts = (prods: typeof products) => {
    const sorted = [...prods];
    switch (sortBy) {
      case 'price_low':
        return sorted.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
      case 'price_high':
        return sorted.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      default:
        return sorted;
    }
  };

  const sortedProducts = sortProducts(categoryProducts);

  const renderProduct = ({ item }: { item: typeof products[0] }) => (
    <View style={styles.productItem}>
      <ProductCard
        product={item}
        onPress={() => router.push(`/product/${item.id}`)}
      />
    </View>
  );

  if (!category) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Category not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {category.name}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/search')}
          >
            <Search size={20} color={Colors.primary900} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/(tabs)/cart')}
          >
            <ShoppingCart size={20} color={Colors.primary900} />
            {cartItemsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartItemsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <Text style={styles.productsCount}>
            {sortedProducts.length} {sortedProducts.length === 1 ? 'Product' : 'Products'}
          </Text>
        </View>
        
        <View style={styles.toolbarRight}>
          <TouchableOpacity style={styles.sortButton} activeOpacity={0.7}>
            <Text style={styles.sortText}>Sort</Text>
            <SlidersHorizontal size={16} color={Colors.neutralMedium} />
          </TouchableOpacity>
          
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'grid' && styles.activeToggle]}
              onPress={() => setViewMode('grid')}
            >
              <Grid3x3 size={18} color={viewMode === 'grid' ? Colors.neutralWhite : Colors.neutralMedium} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
              onPress={() => setViewMode('list')}
            >
              <List size={18} color={viewMode === 'list' ? Colors.neutralWhite : Colors.neutralMedium} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Products Grid */}
      {sortedProducts.length > 0 ? (
        <FlatList
          data={sortedProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyText}>
            Check back later for new products in this category
          </Text>
        </View>
      )}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.h3,
    fontFamily: 'Poppins_700Bold',
    color: Colors.neutralCharcoal,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.accentRed,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.neutralWhite,
    fontSize: 9,
    fontWeight: '700' as const,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
  },
  toolbarLeft: {
    flex: 1,
  },
  productsCount: {
    fontSize: Typography.bodyMedium,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.neutralCharcoal,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sortText: {
    fontSize: Typography.bodyMedium,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.neutralMedium,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutralLight,
  },
  activeToggle: {
    backgroundColor: Colors.primary900,
  },
  listContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  productItem: {
    width: '48%',
    marginBottom: Spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: Typography.h3,
    fontFamily: 'Poppins_700Bold',
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_400Regular',
    color: Colors.neutralMedium,
    textAlign: 'center',
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: Typography.h3,
    fontFamily: 'Poppins_700Bold',
    color: Colors.accentRed,
  },
});
