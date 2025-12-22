import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Star } from "lucide-react-native";
import Colors from "@/constants/Colors";

interface RatingStarsProps {
  rating?: number;
  reviewCount?: number;
  size?: "small" | "medium" | "large";
  showCount?: boolean;
  color?: string;
}

export default function RatingStars({
  rating = 0,
  reviewCount = 0,
  size = "medium",
  showCount = true,
  color = Colors.accentYellow,
}: RatingStarsProps) {
  const starSize = size === "small" ? 12 : size === "large" ? 20 : 16;
  const fontSize = size === "small" ? 11 : size === "large" ? 14 : 12;

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        // Full star
        stars.push(
          <Star
            key={i}
            size={starSize}
            fill={color}
            color={color}
            strokeWidth={1}
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        // Half star (approximate with opacity)
        stars.push(
          <View key={i} style={styles.halfStarContainer}>
            <Star
              size={starSize}
              fill={color}
              color={color}
              strokeWidth={1}
              style={{ opacity: 0.5 }}
            />
          </View>
        );
      } else {
        // Empty star
        stars.push(
          <Star
            key={i}
            size={starSize}
            fill="transparent"
            color={Colors.neutralMedium}
            strokeWidth={1}
          />
        );
      }
    }

    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>{renderStars()}</View>

      {showCount && reviewCount > 0 && (
        <Text style={[styles.reviewCount, { fontSize }]}>
          ({reviewCount.toLocaleString()})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  halfStarContainer: {
    position: "relative",
  },
  reviewCount: {
    color: Colors.neutralMedium,
    marginLeft: 2,
  },
});
