import { useState, useEffect } from "react";
import { Dimensions, ScaledSize } from "react-native";

interface ResponsiveDimensions {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
    isSmallDevice: boolean;
    isMediumDevice: boolean;
    isLargeDevice: boolean;
    isPortrait: boolean;
    isLandscape: boolean;
    wp: (percentage: number) => number; // width percentage
    hp: (percentage: number) => number; // height percentage
}

export function useResponsive(): ResponsiveDimensions {
    const [dimensions, setDimensions] = useState<ScaledSize>(
        Dimensions.get("window")
    );

    useEffect(() => {
        const subscription = Dimensions.addEventListener(
            "change",
            ({ window }) => {
                setDimensions(window);
            }
        );

        return () => subscription?.remove();
    }, []);

    const { width, height, scale, fontScale } = dimensions;

    // Device size classifications
    const isSmallDevice = width < 375; // iPhone SE, smaller Android
    const isMediumDevice = width >= 375 && width < 428; // Most phones
    const isLargeDevice = width >= 428; // Plus/Max phones, tablets

    // Orientation
    const isPortrait = height > width;
    const isLandscape = width > height;

    // Percentage-based dimensions
    const wp = (percentage: number) => (width * percentage) / 100;
    const hp = (percentage: number) => (height * percentage) / 100;

    return {
        width,
        height,
        scale,
        fontScale,
        isSmallDevice,
        isMediumDevice,
        isLargeDevice,
        isPortrait,
        isLandscape,
        wp,
        hp,
    };
}

// Responsive spacing helper
export const getResponsiveSpacing = (baseSpacing: number, width: number) => {
    if (width < 375) return baseSpacing * 0.8; // Small device
    if (width >= 428) return baseSpacing * 1.2; // Large device
    return baseSpacing; // Medium device
};

// Responsive font size helper
export const getResponsiveFontSize = (baseFontSize: number, width: number) => {
    if (width < 375) return baseFontSize * 0.9; // Small device
    if (width >= 428) return baseFontSize * 1.1; // Large device
    return baseFontSize; // Medium device
};
