import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function FloatingOrbs() {
  const orb1Scale = React.useRef(new Animated.Value(1)).current;
  const orb2Scale = React.useRef(new Animated.Value(1)).current;
  const orb3Scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const createPulseAnimation = (animatedValue: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: 1.2,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    createPulseAnimation(orb1Scale, 0);
    createPulseAnimation(orb2Scale, 1000);
    createPulseAnimation(orb3Scale, 2000);
  }, [orb1Scale, orb2Scale, orb3Scale]);

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.orb, styles.orb1, { transform: [{ scale: orb1Scale }] }]}>
        <LinearGradient
          colors={['rgba(22, 163, 74, 0.1)', 'rgba(22, 163, 74, 0.05)']}
          style={styles.gradient}
        />
      </Animated.View>
      
      <Animated.View style={[styles.orb, styles.orb2, { transform: [{ scale: orb2Scale }] }]}>
        <LinearGradient
          colors={['rgba(249, 115, 22, 0.1)', 'rgba(249, 115, 22, 0.05)']}
          style={styles.gradient}
        />
      </Animated.View>
      
      <Animated.View style={[styles.orb, styles.orb3, { transform: [{ scale: orb3Scale }] }]}>
        <LinearGradient
          colors={['rgba(132, 204, 22, 0.08)', 'rgba(132, 204, 22, 0.04)']}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 1000,
  },
  orb1: {
    width: 300,
    height: 300,
    top: -150,
    right: -100,
  },
  orb2: {
    width: 250,
    height: 250,
    bottom: 100,
    left: -80,
  },
  orb3: {
    width: 200,
    height: 200,
    top: '40%',
    right: -50,
  },
  gradient: {
    flex: 1,
    borderRadius: 1000,
  },
});
