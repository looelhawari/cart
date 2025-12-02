import { Stack } from 'expo-router';
import React from 'react';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#16a34a',
      }}
    >
      <Stack.Screen
        name="favorites"
        options={{
          title: 'My Favorites',
        }}
      />
      <Stack.Screen
        name="addresses"
        options={{
          title: 'My Addresses',
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          title: 'Help & Support',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Stack>
  );
}
