import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  MapPin,
  Package,
  Clock,
  Star,
} from 'lucide-react-native';
import { Image } from 'expo-image';

import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Spacing from '@/constants/Spacing';
import { orders } from '@/data/orders';

const { width, height } = Dimensions.get('window');

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const order = orders.find((o) => o.id === id);
  const [estimatedMinutes, setEstimatedMinutes] = useState(23);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const interval = setInterval(() => {
      setEstimatedMinutes((prev) => Math.max(0, prev - 1));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!order || !order.driverInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Order</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Tracking not available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const driver = order.driverInfo;
  const distance = '2.3 km';

  const handleCall = () => {
    if (driver.phone) {
      Linking.openURL(`tel:${driver.phone}`);
    }
  };

  const handleMessage = () => {
    if (driver.phone) {
      Alert.alert('Message Driver', 'Opening messaging...');
    }
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
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Track Order</Text>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        </View>
        
        <View style={{ width: 40 }} />
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <MapPin size={40} color={Colors.primary900} />
          <Text style={styles.mapText}>Live Map View</Text>
          <Text style={styles.mapSubtext}>Real-time tracking coming soon</Text>
        </View>

        {/* Delivery Location Marker */}
        <View style={[styles.locationMarker, { top: height * 0.25, left: width * 0.6 }]}>
          <View style={styles.markerDot}>
            <MapPin size={20} color={Colors.neutralWhite} />
          </View>
          <View style={styles.markerPulse} />
        </View>

        {/* Driver Location Marker (Animated) */}
        <Animated.View
          style={[
            styles.driverMarker,
            { top: height * 0.35, left: width * 0.3, transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Package size={24} color={Colors.neutralWhite} />
        </Animated.View>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Package size={24} color={Colors.primary900} />
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Your order is on the way!</Text>
            <Text style={styles.statusSubtitle}>
              Arriving in approximately {estimatedMinutes} minutes
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statusDetails}>
          <View style={styles.statusRow}>
            <Clock size={18} color={Colors.neutralMedium} />
            <Text style={styles.statusDetailText}>Estimated: {estimatedMinutes} min</Text>
          </View>
          <View style={styles.statusRow}>
            <MapPin size={18} color={Colors.neutralMedium} />
            <Text style={styles.statusDetailText}>Distance: {distance} away</Text>
          </View>
        </View>
      </View>

      {/* Driver Info Card */}
      <View style={styles.driverCard}>
        <View style={styles.driverInfo}>
          <Image source={{ uri: driver.photo }} style={styles.driverPhoto} />
          
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <View style={styles.driverRating}>
              <Star size={16} color={Colors.accentYellow} fill={Colors.accentYellow} />
              <Text style={styles.ratingText}>{driver.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.vehicleNumber}>{driver.vehicleNumber}</Text>
          </View>

          <View style={styles.driverActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCall}
              activeOpacity={0.7}
            >
              <Phone size={20} color={Colors.primary900} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleMessage}
              activeOpacity={0.7}
            >
              <MessageSquare size={20} color={Colors.primary900} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.deliveryAddress}>
          <MapPin size={18} color={Colors.neutralMedium} />
          <Text style={styles.addressText}>{order.deliveryAddress}</Text>
        </View>
      </View>

      {/* Order Summary */}
      <View style={styles.orderSummary}>
        <Text style={styles.summaryTitle}>{order.items.length} items</Text>
        <Text style={styles.summaryTotal}>${order.total.toFixed(2)}</Text>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  orderNumber: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  mapContainer: {
    height: height * 0.45,
    backgroundColor: Colors.neutralGray,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutralLight,
  },
  mapText: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.md,
  },
  mapSubtext: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginTop: Spacing.xs,
  },
  locationMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary900,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.neutralWhite,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary900,
    opacity: 0.3,
  },
  driverMarker: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentOrange,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.neutralWhite,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusCard: {
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statusHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutralGray,
    marginVertical: Spacing.md,
  },
  statusDetails: {
    gap: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusDetailText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  driverCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  driverInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  driverPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  driverDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  driverName: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  ratingText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  vehicleNumber: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  driverActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutralLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryAddress: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  addressText: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    lineHeight: 20,
  },
  orderSummary: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary900,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralWhite,
  },
  summaryTotal: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
});
