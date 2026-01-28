import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "@/store";
import { useTranslation } from "@/i18n";
import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image: string;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const setHasCompletedOnboarding = useStore(
    (state) => state.setHasCompletedOnboarding,
  );
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides: OnboardingSlide[] = [
    {
      id: "1",
      title: t.onboarding.slide1Title,
      description: t.onboarding.slide1Description,
      image: "🥬",
    },
    {
      id: "2",
      title: t.onboarding.slide2Title,
      description: t.onboarding.slide2Description,
      image: "🛒",
    },
    {
      id: "3",
      title: t.onboarding.slide3Title,
      description: t.onboarding.slide3Description,
      image: "✨",
    },
  ];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    router.replace("/welcome");
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={styles.imageContainer}>
        <Text style={styles.emoji}>{item.image}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>{t.onboarding.skip}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentIndex && styles.activeDot]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextText}>
            {currentIndex === slides.length - 1
              ? t.onboarding.getStarted
              : t.onboarding.next}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
  },
  skipButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: Spacing.sm,
  },
  skipText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    fontFamily: "Poppins_500Medium",
  },
  slide: {
    width,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  imageContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  emoji: {
    fontSize: 120,
  },
  title: {
    fontSize: Typography.h2,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.bodyLarge,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutralGray,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: Colors.primary900,
  },
  nextButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
  },
  nextText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_700Bold",
  },
});
