import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Camera, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { orders } from '@/data/orders';

export default function RateOrderScreen() {
  const { id } = useLocalSearchParams();
  const order = orders.find((o) => o.id === id);

  const [overallRating, setOverallRating] = useState(0);
  const [productQuality, setProductQuality] = useState(0);
  const [deliveryExperience, setDeliveryExperience] = useState(0);
  const [review, setReview] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Order not found</Text>
      </SafeAreaView>
    );
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - photos.length,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map((asset) => asset.uri);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (overallRating === 0) {
      Alert.alert('Rating Required', 'Please provide an overall rating');
      return;
    }

    Alert.alert(
      'Thank You!',
      'Your review has been submitted successfully.',
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const renderStars = (
    rating: number,
    setRating: (value: number) => void,
    size: number = 32
  ) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <Star
              size={size}
              color={star <= rating ? Colors.accentYellow : Colors.neutralGray}
              fill={star <= rating ? Colors.accentYellow : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Rate Your Order</Text>
        
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>How was your experience?</Text>
          <Text style={styles.subtitle}>
            Your feedback helps us improve our service
          </Text>
        </View>

        {/* Overall Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Rating</Text>
          {renderStars(overallRating, setOverallRating, 40)}
          {overallRating > 0 && (
            <Text style={styles.ratingLabel}>
              {overallRating === 5
                ? 'Excellent!'
                : overallRating === 4
                ? 'Very Good'
                : overallRating === 3
                ? 'Good'
                : overallRating === 2
                ? 'Fair'
                : 'Poor'}
            </Text>
          )}
        </View>

        {/* Product Quality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Quality</Text>
          {renderStars(productQuality, setProductQuality)}
        </View>

        {/* Delivery Experience */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Experience</Text>
          {renderStars(deliveryExperience, setDeliveryExperience)}
        </View>

        {/* Review Text */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share Your Thoughts</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Tell us about your experience..."
            placeholderTextColor={Colors.neutralMedium}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={review}
            onChangeText={setReview}
            maxLength={500}
          />
          <Text style={styles.charCount}>{review.length}/500</Text>
        </View>

        {/* Photo Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Photos (Optional)</Text>
          <Text style={styles.photoSubtitle}>
            Help others by showing your order
          </Text>

          <View style={styles.photosContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                  activeOpacity={0.7}
                >
                  <X size={16} color={Colors.neutralWhite} />
                </TouchableOpacity>
              </View>
            ))}

            {photos.length < 5 && (
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <Camera size={28} color={Colors.neutralMedium} />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.photoLimit}>
            {photos.length}/5 photos
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            overallRating === 0 && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={overallRating === 0}
          activeOpacity={0.9}
        >
          <Text style={styles.submitButtonText}>Submit Review</Text>
        </TouchableOpacity>
      </View>
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
  backButton: {
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
  content: {
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
  },
  sectionTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  ratingLabel: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  textArea: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    padding: Spacing.md,
    backgroundColor: Colors.neutralLight,
    borderRadius: 16,
    minHeight: 120,
  },
  charCount: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  photoSubtitle: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginBottom: Spacing.md,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accentRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutralLight,
  },
  addPhotoText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 4,
  },
  photoLimit: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: Spacing.sm,
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.neutralWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
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
