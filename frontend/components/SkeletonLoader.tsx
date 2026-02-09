import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Colors from '@/constants/Colors';

// Single shared animation for ALL skeleton loaders - no duplicate loops
const sharedAnimatedValue = new Animated.Value(0);
let animationStarted = false;
const startSharedAnimation = () => {
  if (animationStarted) return;
  animationStarted = true;
  Animated.loop(
    Animated.sequence([
      Animated.timing(sharedAnimatedValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(sharedAnimatedValue, {
        toValue: 0,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ])
  ).start();
};

const sharedOpacity = sharedAnimatedValue.interpolate({
  inputRange: [0, 1],
  outputRange: [0.3, 0.7],
});

export function SkeletonLoader({ width = '100%', height = 100, borderRadius = 24 }: { width?: number | string; height?: number; borderRadius?: number }) {
  // Start shared animation on first render of any skeleton
  React.useEffect(() => {
    startSharedAnimation();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: sharedOpacity,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.neutralGray,
  },
});
