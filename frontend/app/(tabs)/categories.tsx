import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ShoppingCart, Grid3x3, List } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { categories } from '@/data/categories';
import { useStore } from '@/store';

type ViewMode = 'grid' | 'list';

export default function CategoriesScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { cart } = useStore();
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const renderCategoryCard = ({ item }: { item: typeof categories[0] }) => {
    if (viewMode === 'grid') {
      return (
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push(`/categories/${item.id}` as any)}
          activeOpacity={0.7}
        >
          <Image source={{ uri: item.image }} style={styles.gridImage} />
          <View style={styles.gridOverlay}>
            <Text style={styles.gridEmoji}>{item.icon}</Text>
            <Text style={styles.gridName}>{item.name}</Text>
            <Text style={styles.gridCount}>{item.productCount} items</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => router.push(`/categories/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.image }} style={styles.listImage} />
        <View style={styles.listContent}>
          <View style={styles.listHeader}>
            <Text style={styles.listEmoji}>{item.icon}</Text>
            <Text style={styles.listName}>{item.name}</Text>
          </View>
          <Text style={styles.listCount}>{item.productCount} products available</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/search')}
          >
            <Search size={24} color={Colors.primary900} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/(tabs)/cart')}
          >
            <ShoppingCart size={24} color={Colors.primary900} />
            {cartItemsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartItemsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* View Toggle */}
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>{categories.length} Categories</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'grid' && styles.activeToggle]}
            onPress={() => setViewMode('grid')}
          >
            <Grid3x3 size={20} color={viewMode === 'grid' ? Colors.neutralWhite : Colors.neutralMedium} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
            onPress={() => setViewMode('list')}
          >
            <List size={20} color={viewMode === 'list' ? Colors.neutralWhite : Colors.neutralMedium} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories List */}
      <FlatList
        data={categories}
        renderItem={renderCategoryCard}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  headerTitle: {
    fontSize: Typography.h2,
    fontFamily: 'Poppins_700Bold',
    color: Colors.neutralCharcoal,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutralLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.accentRed,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.neutralWhite,
    fontSize: 10,
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
  toolbarTitle: {
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.neutralCharcoal,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  gridCard: {
    flex: 1,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    margin: Spacing.xs,
    backgroundColor: Colors.neutralWhite,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: 4,
  },
  gridEmoji: {
    fontSize: 32,
  },
  gridName: {
    fontSize: Typography.bodyBase,
    fontFamily: 'Poppins_700Bold',
    color: Colors.neutralWhite,
  },
  gridCount: {
    fontSize: Typography.bodySmall,
    fontFamily: 'Poppins_400Regular',
    color: Colors.neutralWhite,
    opacity: 0.9,
  },
  listCard: {
    flexDirection: 'row',
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listImage: {
    width: 120,
    height: 120,
  },
  listContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  listEmoji: {
    fontSize: 32,
  },
  listName: {
    fontSize: Typography.h4,
    fontFamily: 'Poppins_700Bold',
    color: Colors.neutralCharcoal,
    flex: 1,
  },
  listCount: {
    fontSize: Typography.bodyMedium,
    fontFamily: 'Poppins_400Regular',
    color: Colors.neutralMedium,
  },
});
