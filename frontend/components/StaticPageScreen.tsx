import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  FileText,
  Shield,
  Info,
  Clock,
  RefreshCw,
  Building2,
} from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useI18n } from "@/i18n";
import { getStaticPage, type StaticPage } from "@/services/staticPagesApi";
import HtmlContentRenderer from "./HtmlContentRenderer";

interface StaticPageScreenProps {
  slug: "terms" | "privacy" | "about";
  fallbackTitle: string;
  fallbackTitleAr?: string;
  fallbackContent: string;
  fallbackContentAr?: string;
  icon?: React.ReactNode;
}

export default function StaticPageScreen({
  slug,
  fallbackTitle,
  fallbackTitleAr,
  fallbackContent,
  fallbackContentAr,
  icon,
}: StaticPageScreenProps) {
  const { language, t, isRTL } = useI18n();
  const [page, setPage] = useState<StaticPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPage = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);
      const data = await getStaticPage(slug, language);
      setPage(data);
    } catch (err) {
      console.error(`Failed to fetch ${slug} page:`, err);
      setError(t.common.error || "Failed to load content");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPage();
  }, [language]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPage(false);
  };

  const getTitle = () => {
    if (page) {
      return language === "ar" ? page.title_ar : page.title_en;
    }
    return language === "ar" && fallbackTitleAr
      ? fallbackTitleAr
      : fallbackTitle;
  };

  const getContent = () => {
    if (page) {
      return language === "ar" ? page.content_ar : page.content_en;
    }
    return language === "ar" && fallbackContentAr
      ? fallbackContentAr
      : fallbackContent;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  const getPageIcon = () => {
    if (icon) return icon;
    switch (slug) {
      case "terms":
        return <FileText size={32} color="#fff" />;
      case "privacy":
        return <Shield size={32} color="#fff" />;
      case "about":
        return <Info size={32} color="#fff" />;
      default:
        return <FileText size={32} color="#fff" />;
    }
  };

  const getGradientColors = (): readonly [string, string, string] => {
    return [Colors.primary900, Colors.primary800, "#064e3b"] as const;
  };

  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (slug) {
      case "terms":
        return "document-text-outline";
      case "privacy":
        return "shield-checkmark-outline";
      case "about":
        return "information-circle-outline";
      default:
        return "document-text-outline";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with Gradient */}
      <LinearGradient colors={getGradientColors()} style={styles.header}>
        <View style={[styles.headerContent, isRTL && styles.headerContentRTL]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
              {getTitle()}
            </Text>
            {page?.last_updated_at && (
              <View
                style={[styles.lastUpdatedContainer, isRTL && styles.rowRTL]}
              >
                <Clock size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.lastUpdatedText}>
                  {t.ui.lastUpdated}
                  {formatDate(page.last_updated_at)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerIcon}>
            <Ionicons
              name={getIconName()}
              size={40}
              color="rgba(255,255,255,0.9)"
            />
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.loadingText}>{t.common.loading}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={Colors.danger900 || "#F44336"}
          />
          <Text style={styles.errorTitle}>{t.common.error}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchPage()}
            activeOpacity={0.8}
          >
            <RefreshCw size={18} color="#fff" />
            <Text style={styles.retryButtonText}>{t.common.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary900]}
              tintColor={Colors.primary900}
            />
          }
        >
          {/* Operator notice — Cart is operated by Al Baraka Market */}
          {(slug === "about" || slug === "terms") && (
            <View
              style={[
                styles.operatorBanner,
                isRTL && styles.operatorBannerRTL,
              ]}
            >
              <View style={styles.operatorIconWrap}>
                <Building2 size={20} color={Colors.neutralWhite} />
              </View>
              <Text
                style={[styles.operatorBannerText, isRTL && styles.textRTL]}
              >
                {language === "ar"
                  ? "تطبيق Cart يُدار بواسطة Al Baraka Market"
                  : "Cart is operated by Al Baraka Market"}
              </Text>
            </View>
          )}

          {/* Content Card */}
          <View style={styles.contentCard}>
            <HtmlContentRenderer content={getContent()} isRTL={isRTL} />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, isRTL && styles.textRTL]}>
              {t.ui.contactEmail}
            </Text>
          </View>

          {/* Version Info */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>{t.ui.appVersion}</Text>
            <Text style={styles.copyrightText}>{t.ui.copyright}</Text>
          </View>
        </ScrollView>
      )}
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
    paddingBottom: 8,
  },
  headerContentRTL: {
    flexDirection: "row-reverse",
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
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  lastUpdatedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  lastUpdatedText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  textRTL: {
    textAlign: "right",
  },
  rowRTL: {
    flexDirection: "row-reverse",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  operatorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.primary900,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary900,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  operatorBannerRTL: {
    flexDirection: "row-reverse",
  },
  operatorIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  operatorBannerText: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  contentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  footer: {
    marginTop: 20,
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    lineHeight: 22,
  },
  versionContainer: {
    alignItems: "center",
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  versionText: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
  copyrightText: {
    fontSize: 12,
    color: "#bbb",
    marginTop: 4,
  },
});
