import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Star,
  ThumbsUp,
  Camera,
  X,
} from 'lucide-react-native';

import { products } from '@/data/products';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';

interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number;
  date: string;
  comment: string;
  photos?: string[];
  helpful: number;
  verified: boolean;
}

const mockReviews: Review[] = [
  {
    id: '1',
    userName: 'Sarah Ahmed',
    userAvatar: 'https://i.pravatar.cc/300?img=5',
    rating: 5,
    date: '2025-01-10',
    comment: 'Excellent quality! Fresh and delivered on time. Will definitely order again.',
    photos: ['https://picsum.photos/300/300?random=1', 'https://picsum.photos/300/300?random=2'],
    helpful: 12,
    verified: true,
  },
  {
    id: '2',
    userName: 'Mohamed Ali',
    userAvatar: 'https://i.pravatar.cc/300?img=8',
    rating: 4,
    date: '2025-01-08',
    comment: 'Good product but packaging could be better.',
    helpful: 7,
    verified: true,
  },
  {
    id: '3',
    userName: 'Fatima Hassan',
    userAvatar: 'https://i.pravatar.cc/300?img=9',
    rating: 5,
    date: '2025-01-05',
    comment: 'Best quality I\'ve found! Highly recommend.',
    photos: ['https://picsum.photos/300/300?random=3'],
    helpful: 15,
    verified: false,
  },
];

export default function ProductReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = products.find((p) => p.id === id);
  
  const [reviews] = useState<Review[]>(mockReviews);
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest' | 'helpful'>('recent');
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterWithPhotos, setFilterWithPhotos] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');

  if (!product) {
    return null;
  }

  const averageRating = 4.5;
  const totalReviews = reviews.length;
  const ratingDistribution = [
    { stars: 5, count: 80, percentage: 80 },
    { stars: 4, count: 12, percentage: 12 },
    { stars: 3, count: 5, percentage: 5 },
    { stars: 2, count: 2, percentage: 2 },
    { stars: 1, count: 1, percentage: 1 },
  ];

  const filteredReviews = reviews
    .filter((r) => !filterVerified || r.verified)
    .filter((r) => !filterWithPhotos || (r.photos && r.photos.length > 0));

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (sortBy) {
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      case 'helpful':
        return b.helpful - a.helpful;
      case 'recent':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  const renderStars = (rating: number, size: number = 16) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= rating ? Colors.accentOrange : 'none'}
          color={star <= rating ? Colors.accentOrange : Colors.neutralGray}
        />
      ))}
    </View>
  );

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
        
        <Text style={styles.headerTitle}>Reviews</Text>
        
        <TouchableOpacity
          style={styles.writeButton}
          onPress={() => setShowWriteReview(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.writeButtonText}>Write</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryLeft}>
            <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
            {renderStars(Math.round(averageRating), 20)}
            <Text style={styles.totalReviews}>{totalReviews} reviews</Text>
          </View>
          
          <View style={styles.summaryRight}>
            {ratingDistribution.map((dist) => (
              <View key={dist.stars} style={styles.distributionRow}>
                <Text style={styles.distributionStars}>{dist.stars}</Text>
                <Star size={12} fill={Colors.accentOrange} color={Colors.accentOrange} />
                <View style={styles.distributionBar}>
                  <View
                    style={[
                      styles.distributionFill,
                      { width: `${dist.percentage}%` },
                    ]}
                  />
                </View>
                <Text style={styles.distributionCount}>{dist.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            <TouchableOpacity
              style={[styles.filterChip, sortBy === 'recent' && styles.filterChipActive]}
              onPress={() => setSortBy('recent')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, sortBy === 'recent' && styles.filterTextActive]}>
                Most Recent
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterChip, sortBy === 'highest' && styles.filterChipActive]}
              onPress={() => setSortBy('highest')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, sortBy === 'highest' && styles.filterTextActive]}>
                Highest Rated
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterChip, sortBy === 'helpful' && styles.filterChipActive]}
              onPress={() => setSortBy('helpful')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, sortBy === 'helpful' && styles.filterTextActive]}>
                Most Helpful
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterChip, filterWithPhotos && styles.filterChipActive]}
              onPress={() => setFilterWithPhotos(!filterWithPhotos)}
              activeOpacity={0.7}
            >
              <Camera size={14} color={filterWithPhotos ? Colors.neutralWhite : Colors.neutralMedium} />
              <Text style={[styles.filterText, filterWithPhotos && styles.filterTextActive]}>
                With Photos
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterChip, filterVerified && styles.filterChipActive]}
              onPress={() => setFilterVerified(!filterVerified)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, filterVerified && styles.filterTextActive]}>
                Verified
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsSection}>
          {sortedReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Image
                  source={{ uri: review.userAvatar }}
                  style={styles.reviewAvatar}
                />
                <View style={styles.reviewUser}>
                  <View style={styles.reviewNameRow}>
                    <Text style={styles.reviewName}>{review.userName}</Text>
                    {review.verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✓ Verified</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.reviewMeta}>
                    {renderStars(review.rating, 14)}
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.reviewComment}>{review.comment}</Text>
              
              {review.photos && review.photos.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.reviewPhotos}
                >
                  {review.photos.map((photo, index) => (
                    <Image
                      key={index}
                      source={{ uri: photo }}
                      style={styles.reviewPhoto}
                    />
                  ))}
                </ScrollView>
              )}
              
              <TouchableOpacity style={styles.helpfulButton} activeOpacity={0.7}>
                <ThumbsUp size={16} color={Colors.neutralMedium} />
                <Text style={styles.helpfulText}>Helpful ({review.helpful})</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Write Review Modal */}
      <Modal
        visible={showWriteReview}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWriteReview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity
                onPress={() => setShowWriteReview(false)}
                style={styles.modalClose}
              >
                <X size={24} color={Colors.neutralCharcoal} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.ratingSelector}>
              <Text style={styles.ratingSelectorLabel}>Your Rating</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setNewRating(star)}
                    activeOpacity={0.7}
                  >
                    <Star
                      size={40}
                      fill={star <= newRating ? Colors.accentOrange : 'none'}
                      color={star <= newRating ? Colors.accentOrange : Colors.neutralGray}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.commentInput}>
              <Text style={styles.commentLabel}>Your Review</Text>
              <TextInput
                style={styles.commentTextArea}
                placeholder="Share your thoughts about this product..."
                placeholderTextColor={Colors.neutralMedium}
                multiline
                numberOfLines={5}
                value={newComment}
                onChangeText={setNewComment}
                textAlignVertical="top"
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!newRating || !newComment) && styles.submitButtonDisabled,
              ]}
              disabled={!newRating || !newComment}
              activeOpacity={0.9}
            >
              <Text style={styles.submitButtonText}>Submit Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  writeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary900,
    borderRadius: 12,
  },
  writeButtonText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  summarySection: {
    flexDirection: 'row',
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  summaryLeft: {
    alignItems: 'center',
    paddingRight: Spacing.lg,
    borderRightWidth: 1,
    borderRightColor: Colors.neutralLight,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: Typography.bold as any,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: Spacing.xs,
  },
  totalReviews: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  summaryRight: {
    flex: 1,
    paddingLeft: Spacing.lg,
    justifyContent: 'center',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  distributionStars: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralCharcoal,
    width: 10,
  },
  distributionBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.neutralLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    backgroundColor: Colors.accentOrange,
  },
  distributionCount: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    width: 24,
    textAlign: 'right',
  },
  filtersSection: {
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    backgroundColor: Colors.neutralLight,
  },
  filterChipActive: {
    backgroundColor: Colors.primary900,
  },
  filterText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  filterTextActive: {
    color: Colors.neutralWhite,
  },
  reviewsSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  reviewCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  reviewUser: {
    flex: 1,
  },
  reviewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  reviewName: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  verifiedBadge: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reviewDate: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  reviewComment: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  reviewPhotos: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  reviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  helpfulText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.neutralWhite,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  modalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingSelector: {
    marginBottom: Spacing.lg,
  },
  ratingSelectorLabel: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  commentInput: {
    marginBottom: Spacing.lg,
  },
  commentLabel: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  commentTextArea: {
    backgroundColor: Colors.neutralLight,
    borderRadius: 16,
    padding: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.neutralGray,
  },
  submitButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
});
