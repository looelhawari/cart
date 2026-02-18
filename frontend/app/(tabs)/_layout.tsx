import { Tabs } from "expo-router";
import {
  Home,
  Grid,
  ShoppingCart,
  Package,
  User,
  Tag,
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";

import Colors from "@/constants/Colors";
import { useTranslation } from "@/i18n";
import { useStore } from "@/store";

function CartTabIcon({ color, size }: { color: string; size: number }) {
  const { cart } = useStore();
  const itemCount = cart?.items?.length ?? 0;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(itemCount);

  useEffect(() => {
    if (itemCount !== prevCount.current && itemCount > 0) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.4,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevCount.current = itemCount;
  }, [itemCount, scaleAnim]);

  return (
    <View style={cartStyles.wrapper}>
      <ShoppingCart size={size} color={color} />
      {itemCount > 0 && (
        <Animated.View
          style={[cartStyles.badge, { transform: [{ scale: scaleAnim }] }]}
        >
          <Text style={cartStyles.badgeText}>
            {itemCount > 99 ? "99+" : itemCount}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const cartStyles = StyleSheet.create({
  wrapper: {
    position: "relative",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: "#EF4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.neutralWhite,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
});

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary900,
        tabBarInactiveTintColor: Colors.neutralMedium,
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: Colors.neutralWhite,
          borderTopWidth: 1,
          borderTopColor: Colors.neutralLight,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.nav.home,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: t.nav.categories,
          tabBarIcon: ({ color, size }) => <Grid size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t.nav.cart,
          tabBarIcon: ({ color, size }) => (
            <CartTabIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t.nav.orders,
          tabBarIcon: ({ color, size }) => (
            <Package size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: t.nav.offers,
          tabBarIcon: ({ color, size }) => <Tag size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.nav.profile,
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
