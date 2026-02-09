import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "@/i18n";

// Support Contact Info
const SUPPORT_INFO = {
  phone: "+20 100 123 4567",
  email: "support@elbaraka.com",
  whatsapp: "+201001234567",
  workingHours: "Saturday - Thursday: 9 AM - 10 PM",
  responseTime: "Within 24 hours",
};

// FAQ Categories - using translation keys
const FAQ_CATEGORY_KEYS = [
  { id: "all", key: "all", icon: "grid-outline" },
  { id: "orders", key: "orders", icon: "receipt-outline" },
  { id: "delivery", key: "delivery", icon: "bicycle-outline" },
  { id: "payment", key: "payment", icon: "card-outline" },
  { id: "account", key: "account", icon: "person-outline" },
  { id: "returns", key: "returns", icon: "refresh-outline" },
];

// FAQ Data - using translation keys
const FAQ_KEYS = [
  { id: "1", category: "orders", key: "trackOrder" },
  { id: "2", category: "orders", key: "modifyOrder" },
  { id: "3", category: "orders", key: "cancelOrder" },
  { id: "4", category: "delivery", key: "deliveryHours" },
  { id: "5", category: "delivery", key: "deliveryFee" },
  { id: "6", category: "delivery", key: "deliveryArea" },
  { id: "7", category: "payment", key: "paymentMethods" },
  { id: "8", category: "payment", key: "securePayment" },
  { id: "9", category: "payment", key: "chargedWhen" },
  { id: "10", category: "account", key: "updateProfile" },
  { id: "11", category: "account", key: "changePassword" },
  { id: "12", category: "account", key: "manageAddresses" },
  { id: "13", category: "returns", key: "returnPolicy" },
  { id: "14", category: "returns", key: "requestReturn" },
  { id: "15", category: "returns", key: "refundTime" },
];

interface FAQItemProps {
  question: string;
  answer: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({
  question,
  answer,
  isExpanded,
  onToggle,
}) => {
  const [animation] = useState(new Animated.Value(isExpanded ? 1 : 0));
  const [helpful, setHelpful] = useState<boolean | null>(null);

  React.useEffect(() => {
    Animated.timing(animation, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, animation]);

  const rotateIcon = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.faqQuestionText}>{question}</Text>
        <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </Animated.View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{answer}</Text>

          <View style={styles.helpfulContainer}>
            <Text style={styles.helpfulText}>Was this helpful?</Text>
            <View style={styles.helpfulButtons}>
              <TouchableOpacity
                style={[
                  styles.helpfulButton,
                  helpful === true && styles.helpfulButtonActive,
                ]}
                onPress={() => setHelpful(true)}
              >
                <Ionicons
                  name="thumbs-up"
                  size={16}
                  color={helpful === true ? "#fff" : "#4CAF50"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.helpfulButton,
                  helpful === false && styles.helpfulButtonActiveNegative,
                ]}
                onPress={() => setHelpful(false)}
              >
                <Ionicons
                  name="thumbs-down"
                  size={16}
                  color={helpful === false ? "#fff" : "#F44336"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default function HelpScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  // Build FAQ data from translation keys
  const FAQ_DATA = FAQ_KEYS.map((faq) => ({
    id: faq.id,
    category: faq.category,
    question: (t.help.faqs as any)[faq.key]?.question || faq.key,
    answer: (t.help.faqs as any)[faq.key]?.answer || "",
  }));

  // Build FAQ categories from translation keys
  const FAQ_CATEGORIES = FAQ_CATEGORY_KEYS.map((cat) => ({
    id: cat.id,
    label: (t.help.categories as any)[cat.key] || cat.key,
    icon: cat.icon,
  }));

  const filteredFAQs = FAQ_DATA.filter((faq) => {
    const matchesCategory =
      selectedCategory === "all" || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_INFO.phone.replace(/\s/g, "")}`);
  };

  const handleEmail = () => {
    Linking.openURL(
      `mailto:${SUPPORT_INFO.email}?subject=Support Request&body=Hi ElBaraka Support,\n\n`,
    );
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Hi, I need help with my order.");
    Linking.openURL(`https://wa.me/${SUPPORT_INFO.whatsapp}?text=${message}`);
  };

  const handleTrackOrder = () => {
    router.push("/profile/orders" as any);
  };

  const handleMyMessages = () => {
    router.push("/complaints" as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={["#4CAF50", "#45a049", "#388E3C"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{t.help.title}</Text>
            <Text style={styles.headerSubtitle}>{t.help.howCanWeHelp}</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons
              name="headset-outline"
              size={40}
              color="rgba(255,255,255,0.9)"
            />
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={t.help.searchPlaceholder}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.help.quickActions}</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleTrackOrder}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#E3F2FD" }]}
              >
                <Ionicons name="location-outline" size={24} color="#2196F3" />
              </View>
              <Text style={styles.quickActionText}>Track Order</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push("/profile/orders" as any)}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#FFF3E0" }]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={24}
                  color="#FF9800"
                />
              </View>
              <Text style={styles.quickActionText}>Report Issue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleCall}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#E8F5E9" }]}
              >
                <Ionicons name="call-outline" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.quickActionText}>Call Us</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleWhatsApp}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#E8F5E9" }]}
              >
                <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              </View>
              <Text style={styles.quickActionText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Info Cards */}
        <View style={styles.section}>
          <View style={styles.infoCardsRow}>
            <View style={[styles.infoCard, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="time-outline" size={24} color="#2196F3" />
              <Text style={styles.infoCardTitle}>Working Hours</Text>
              <Text style={styles.infoCardText}>
                {SUPPORT_INFO.workingHours}
              </Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="flash-outline" size={24} color="#FF9800" />
              <Text style={styles.infoCardTitle}>Response Time</Text>
              <Text style={styles.infoCardText}>
                {SUPPORT_INFO.responseTime}
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContainer}
          >
            {FAQ_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.id && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={16}
                  color={selectedCategory === category.id ? "#fff" : "#666"}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category.id &&
                      styles.categoryChipTextActive,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FAQ List */}
        <View style={styles.faqSection}>
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq) => (
              <FAQItem
                key={faq.id}
                question={faq.question}
                answer={faq.answer}
                isExpanded={expandedFAQ === faq.id}
                onToggle={() =>
                  setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)
                }
              />
            ))
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
              <Text style={styles.noResultsText}>No results found</Text>
              <Text style={styles.noResultsSubtext}>
                Try different keywords or browse categories
              </Text>
            </View>
          )}
        </View>

        {/* Contact Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.contactCard}>
            <Text style={styles.contactCardTitle}>Still need help?</Text>
            <Text style={styles.contactCardSubtitle}>
              Our support team is ready to assist you
            </Text>

            <View style={styles.contactOptions}>
              <TouchableOpacity
                style={styles.contactOption}
                onPress={handleCall}
              >
                <View
                  style={[
                    styles.contactOptionIcon,
                    { backgroundColor: "#E8F5E9" },
                  ]}
                >
                  <Ionicons name="call" size={24} color="#4CAF50" />
                </View>
                <View style={styles.contactOptionInfo}>
                  <Text style={styles.contactOptionTitle}>Call Us</Text>
                  <Text style={styles.contactOptionValue}>
                    {SUPPORT_INFO.phone}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactOption}
                onPress={handleEmail}
              >
                <View
                  style={[
                    styles.contactOptionIcon,
                    { backgroundColor: "#E3F2FD" },
                  ]}
                >
                  <Ionicons name="mail" size={24} color="#2196F3" />
                </View>
                <View style={styles.contactOptionInfo}>
                  <Text style={styles.contactOptionTitle}>Email Us</Text>
                  <Text style={styles.contactOptionValue}>
                    {SUPPORT_INFO.email}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactOption}
                onPress={handleWhatsApp}
              >
                <View
                  style={[
                    styles.contactOptionIcon,
                    { backgroundColor: "#E8F5E9" },
                  ]}
                >
                  <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                </View>
                <View style={styles.contactOptionInfo}>
                  <Text style={styles.contactOptionTitle}>WhatsApp</Text>
                  <Text style={styles.contactOptionValue}>Chat with us</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Useful Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Useful Links</Text>
          <View style={styles.linksCard}>
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => router.push("/about/terms")}
            >
              <Ionicons name="document-text-outline" size={20} color="#666" />
              <Text style={styles.linkText}>Terms & Conditions</Text>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
            <View style={styles.linkDivider} />
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => router.push("/about/privacy")}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#666"
              />
              <Text style={styles.linkText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
            <View style={styles.linkDivider} />
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => router.push("/about/about")}
            >
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.linkText}>Store Locations</Text>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
            <View style={styles.linkDivider} />
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => router.push("/about/about")}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#666"
              />
              <Text style={styles.linkText}>About ElBaraka</Text>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>ElBaraka App v1.0.0</Text>
          <Text style={styles.copyrightText}>
            © 2024 ElBaraka Hypermarket. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  quickActionCard: {
    width: "25%",
    paddingHorizontal: 6,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  infoCardsRow: {
    flexDirection: "row",
    marginHorizontal: -6,
  },
  infoCard: {
    flex: 1,
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
  },
  infoCardText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  categoriesScroll: {
    marginHorizontal: -16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  faqSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  faqItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  faqAnswerText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
    paddingTop: 12,
  },
  helpfulContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  helpfulText: {
    fontSize: 13,
    color: "#999",
    marginRight: 12,
  },
  helpfulButtons: {
    flexDirection: "row",
    gap: 8,
  },
  helpfulButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  helpfulButtonActive: {
    backgroundColor: "#4CAF50",
  },
  helpfulButtonActiveNegative: {
    backgroundColor: "#F44336",
  },
  noResults: {
    alignItems: "center",
    paddingVertical: 48,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  contactCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactCardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  contactCardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    marginBottom: 16,
  },
  contactOptions: {
    gap: 12,
  },
  contactOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
  },
  contactOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  contactOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  contactOptionValue: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  linksCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    marginLeft: 12,
  },
  linkDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 48,
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  versionText: {
    fontSize: 14,
    color: "#999",
  },
  copyrightText: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 4,
  },
});
