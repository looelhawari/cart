import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  I18nManager,
} from "react-native";
import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useTranslation } from "@/i18n";

interface HtmlContentRendererProps {
  content: string;
  isRTL?: boolean;
}

/**
 * Simple HTML to React Native renderer
 * Supports: h1, h2, h3, h4, p, ul, ol, li, strong, em, a, br
 */
export default function HtmlContentRenderer({
  content,
  isRTL = false,
}: HtmlContentRendererProps) {
  const { t } = useTranslation();
  const textAlign = isRTL ? "right" : "left";

  // Parse HTML and render React Native components
  const parseHtml = (html: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let key = 0;

    // Clean up the HTML
    let cleanHtml = html
      .replace(/\r\n/g, "\n")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    // Split by tags while keeping the tags
    const tagRegex = /<(\/?)(\w+)([^>]*)>|([^<]+)/g;
    let match;
    let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
    let currentText = "";
    let isStrong = false;
    let isEm = false;
    let linkHref = "";
    let isInLink = false;

    const flushText = () => {
      if (currentText.trim()) {
        elements.push(
          <Text
            key={key++}
            style={[
              styles.paragraph,
              { textAlign },
              isStrong && styles.strong,
              isEm && styles.italic,
            ]}
          >
            {currentText.trim()}
          </Text>,
        );
        currentText = "";
      }
    };

    const flushList = () => {
      if (currentList && currentList.items.length > 0) {
        elements.push(
          <View key={key++} style={styles.listContainer}>
            {currentList.items.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.listItem,
                  isRTL && { flexDirection: "row-reverse" },
                ]}
              >
                <Text style={styles.listBullet}>
                  {currentList!.type === "ul" ? "•" : `${index + 1}.`}
                </Text>
                <Text style={[styles.listItemText, { textAlign }]}>
                  {item.replace(/<[^>]*>/g, "").trim()}
                </Text>
              </View>
            ))}
          </View>,
        );
        currentList = null;
      }
    };

    while ((match = tagRegex.exec(cleanHtml)) !== null) {
      const [, isClosing, tagName, attrs, textContent] = match;

      if (textContent) {
        // Plain text content
        const decodedText = textContent
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        if (currentList) {
          // We're inside a list, accumulate for the current item
          currentText += decodedText;
        } else if (isInLink) {
          currentText += decodedText;
        } else {
          currentText += decodedText;
        }
        continue;
      }

      const tag = tagName?.toLowerCase();

      if (isClosing) {
        // Closing tag
        switch (tag) {
          case "h1":
          case "h2":
          case "h3":
          case "h4":
            if (currentText.trim()) {
              const headingStyle =
                tag === "h1"
                  ? styles.h1
                  : tag === "h2"
                    ? styles.h2
                    : tag === "h3"
                      ? styles.h3
                      : styles.h4;
              elements.push(
                <Text key={key++} style={[headingStyle, { textAlign }]}>
                  {currentText.trim()}
                </Text>,
              );
              currentText = "";
            }
            break;
          case "p":
            flushText();
            break;
          case "ul":
          case "ol":
            flushList();
            break;
          case "li":
            if (currentList) {
              currentList.items.push(currentText.trim());
              currentText = "";
            }
            break;
          case "strong":
          case "b":
            isStrong = false;
            break;
          case "em":
          case "i":
            isEm = false;
            break;
          case "a":
            if (linkHref && currentText.trim()) {
              elements.push(
                <TouchableOpacity
                  key={key++}
                  onPress={() => Linking.openURL(linkHref)}
                >
                  <Text style={[styles.link, { textAlign }]}>
                    {currentText.trim()}
                  </Text>
                </TouchableOpacity>,
              );
              currentText = "";
            }
            isInLink = false;
            linkHref = "";
            break;
        }
      } else {
        // Opening tag
        switch (tag) {
          case "h1":
          case "h2":
          case "h3":
          case "h4":
          case "p":
            flushText();
            break;
          case "ul":
            flushText();
            currentList = { type: "ul", items: [] };
            break;
          case "ol":
            flushText();
            currentList = { type: "ol", items: [] };
            break;
          case "li":
            currentText = "";
            break;
          case "strong":
          case "b":
            isStrong = true;
            break;
          case "em":
          case "i":
            isEm = true;
            break;
          case "a":
            isInLink = true;
            const hrefMatch = attrs?.match(/href=["']([^"']+)["']/);
            linkHref = hrefMatch ? hrefMatch[1] : "";
            break;
          case "br":
            currentText += "\n";
            break;
        }
      }
    }

    // Flush remaining content
    flushText();
    flushList();

    return elements;
  };

  // If content is empty or just whitespace
  if (!content || !content.trim()) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t.ui.noContentAvailable}</Text>
      </View>
    );
  }

  return <View style={styles.container}>{parseHtml(content)}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    padding: Spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.neutralMedium,
    fontSize: Typography.bodyBase,
  },
  h1: {
    fontSize: Typography.h1,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    lineHeight: Typography.h1 * 1.3,
  },
  h2: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    lineHeight: Typography.h2 * 1.3,
  },
  h3: {
    fontSize: Typography.h3,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    lineHeight: Typography.h3 * 1.3,
  },
  h4: {
    fontSize: Typography.h4,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    lineHeight: Typography.h4 * 1.3,
  },
  paragraph: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    lineHeight: 26,
    marginBottom: Spacing.md,
  },
  strong: {
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  italic: {
    fontStyle: "italic",
  },
  link: {
    fontSize: Typography.bodyBase,
    color: Colors.primary900,
    textDecorationLine: "underline",
    marginBottom: Spacing.sm,
  },
  listContainer: {
    marginBottom: Spacing.md,
    paddingLeft: Spacing.md,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  listBullet: {
    fontSize: Typography.bodyBase,
    color: Colors.primary900,
    fontWeight: Typography.bold,
    marginRight: Spacing.xs,
    width: 20,
  },
  listItemText: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    lineHeight: 24,
  },
});
