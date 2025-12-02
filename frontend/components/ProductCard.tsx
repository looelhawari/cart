import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Heart } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { Product } from '@/types';
import { useStore } from '@/store';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const { favorites, toggleFavorite, addToCart } = useStore();
  const isFavorite = favorites.includes(product.id);
  const hasDiscount = product.salePrice && product.salePrice < product.price;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image }} style={styles.image} />
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(product.id)}
        >
          <Heart
            size={20}
            color={isFavorite ? Colors.accentRed : Colors.neutralMedium}
            fill={isFavorite ? Colors.accentRed : 'transparent'}
          />
        </TouchableOpacity>
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {Math.round(((product.price - product.salePrice!) / product.price) * 100)}% OFF
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        
        <View style={styles.priceRow}>
          {hasDiscount ? (
            <>
              <Text style={styles.salePrice}>${product.salePrice?.toFixed(2)}</Text>
              <Text style={styles.originalPrice}>${product.price.toFixed(2)}</Text>
            </>
          ) : (
            <Text style={styles.price}>${product.price.toFixed(2)}</Text>
          )}
          <Text style={styles.unit}>/{product.unit}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={(e) => {
            e.stopPropagation();
            addToCart(product);
          }}
        >
          <Text style={styles.addButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: `${Colors.neutralGray}50`,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutralWhite,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.accentOrange,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodySmall,
    fontWeight: Typography.bold,
  },
  content: {
    padding: Spacing.sm,
  },
  name: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  price: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  salePrice: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  originalPrice: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.medium,
    color: Colors.neutralMedium,
    textDecorationLine: 'line-through',
    marginLeft: Spacing.xs,
  },
  unit: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginLeft: 4,
  },
  addButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
  },
});
