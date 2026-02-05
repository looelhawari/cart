import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import LottieView from "lottie-react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    runOnJS,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

interface AnimatedSplashProps {
    onAnimationFinish: () => void;
}

export default function AnimatedSplash({
    onAnimationFinish,
}: AnimatedSplashProps) {
    const lottieRef = useRef<LottieView>(null);
    const opacity = useSharedValue(1);
    const scale = useSharedValue(1);

    useEffect(() => {
        // Play the animation
        if (lottieRef.current) {
            lottieRef.current.play();
        }
    }, []);

    const handleAnimationFinish = () => {
        // Fade out and scale up slightly before finishing
        opacity.value = withDelay(
            200,
            withTiming(0, { duration: 400 }, (finished) => {
                if (finished) {
                    runOnJS(onAnimationFinish)();
                }
            })
        );
        scale.value = withDelay(200, withTiming(1.1, { duration: 400 }));
    };

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={styles.lottieContainer}>
                <LottieView
                    ref={lottieRef}
                    source={require("@/assets/splash-animation.json")}
                    style={styles.lottie}
                    autoPlay={false}
                    loop={false}
                    speed={1}
                    onAnimationFinish={handleAnimationFinish}
                />
            </View>
            <View style={styles.brandContainer}>
                <Animated.Text style={styles.brandName}>CART</Animated.Text>
                <Animated.Text style={styles.tagline}>Your Shopping Companion</Animated.Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#22C55E",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
    },
    lottieContainer: {
        width: width * 0.6,
        height: width * 0.6,
        justifyContent: "center",
        alignItems: "center",
    },
    lottie: {
        width: "100%",
        height: "100%",
    },
    brandContainer: {
        marginTop: 20,
        alignItems: "center",
    },
    brandName: {
        fontSize: 36,
        fontFamily: "Poppins_700Bold",
        color: "#FFFFFF",
        letterSpacing: 4,
    },
    tagline: {
        fontSize: 14,
        fontFamily: "Poppins_400Regular",
        color: "#FFFFFF",
        opacity: 0.9,
        marginTop: 4,
    },
});
