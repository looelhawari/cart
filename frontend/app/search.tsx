import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, X, SlidersHorizontal } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { ProductCard } from '@/components/ProductCard';
import { products } from '@/data/products';

const POPULAR_SEARCHES = [
  'Tomatoes',
  'Milk',
  'Bread',
  'Chicken',
  'Eggs',
  'Rice',
  'Pasta',
  'Yogurt',
];

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Fresh Milk',
    'Organic Tomatoes',
    'Bread',
  ]);
  const [searchResults, setSearchResults] = useState<typeof products>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      const results = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && !recentSearches.includes(query)) {
      setRecentSearches([query, ...recentSearches.slice(0, 9)]);
    }
  };

  const removeRecentSearch = (search: string) => {
    setRecentSearches(recentSearches.filter((s) => s !== search));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
  };

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

        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.neutralMedium} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for products..."
            placeholderTextColor={Colors.neutralMedium}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={Colors.neutralMedium} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            // TODO: Open filter bottom sheet
          }}
        >
          <SlidersHorizontal size={20} color={Colors.primary900} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {!isSearching ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearAllRecent}>
                  <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsContainer}>
                {recentSearches.map((search, index) => (
                  <View key={index} style={styles.chip}>
                    <TouchableOpacity
                      onPress={() => handleSearch(search)}
                      style={styles.chipContent}
                    >
                      <Text style={styles.chipText}>{search}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeRecentSearch(search)}
                      style={styles.chipRemove}
                    >
                      <X size={14} color={Colors.neutralMedium} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Popular Searches */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Searches</Text>
            <View style={styles.chipsContainer}>
              {POPULAR_SEARCHES.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.popularChip}
                  onPress={() => handleSearch(search)}
                  activeOpacity={0.7}
                >
                  <Search size={14} color={Colors.primary900} />
                  <Text style={styles.popularChipText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Search by Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search by Category</Text>
            <View style={styles.categoryFilters}>
              {['Fruits', 'Dairy', 'Meat', 'Bakery', 'Beverages', 'Snacks'].map(
                (category, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.categoryFilter}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.categoryFilterText}>{category}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.resultsContainer}>
          {/* Results Header */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
            </Text>
            <TouchableOpacity style={styles.sortButton}>
              <Text style={styles.sortText}>Sort</Text>
              <SlidersHorizontal size={16} color={Colors.neutralMedium} />
            </TouchableOpacity>
          </View>

          {/* Results Grid */}
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={({ item }) => (
                <View style={styles.resultItem}>
                  <ProductCard
                    product={item}
                    onPress={() => router.push(`/product/${item.id}`)}
                  />
                </View>
              )}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.resultsGrid}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>
                Try searching with different keywords
              </Text>
            </View>
          )}
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
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    fontFamily: 'Poppins_400Regular',
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.neutralCharcoal,
  },
  clearText: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary900,
    fontFamily: 'Poppins_600SemiBold',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
  },
  chipContent: {
    marginRight: Spacing.xs,
  },
  chipText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    fontFamily: 'Poppins_400Regular',
  },
  chipRemove: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary900,
  },
  popularChipText: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary900,
    fontFamily: 'Poppins_600SemiBold',
  },
  categoryFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryFilter: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
  },
  categoryFilterText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    fontFamily: 'Poppins_600SemiBold',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  resultsCount: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    fontFamily: 'Poppins_400Regular',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sortText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    fontFamily: 'Poppins_600SemiBold',
  },
  resultsGrid: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  resultItem: {
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
    color: Colors.neutralMedium,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
});
