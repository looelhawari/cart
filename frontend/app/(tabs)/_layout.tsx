import { Tabs } from "expo-router";
import {
  Home,
  Grid,
  ShoppingCart,
  Package,
  User,
  Tag,
} from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet } from "react-native";

import Colors from "@/constants/Colors";
import { useTranslation } from "@/i18n";
import { useStore } from "@/store";

export default function TabLayout() {
  const { t } = useTranslation();
  const { cart } = useStore();

  // Calculate cart items count
  const cartItemsCount = cart?.items?.reduce(
    (total: number, item: any) => total + item.quantity,
    0
  ) || 0;

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
            <View>
              <ShoppingCart size={size} color={color} />
              {cartItemsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </Text>
                </View>
              )}
            </View>
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

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: Colors.accentRed,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.neutralWhite,
    fontSize: 11,
    fontWeight: '700',
  },
});
