import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { Promotion } from "@/types/promotion";
import type { Product } from "@/types";
import {
    getPromotion,
    getPromotionProducts,
} from "@/services/api/promotionApi";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import OfflineIndicator from "@/components/OfflineIndicator";
import Colors from "@/constants/Colors";
import Spacing from "@/constants/Spacing";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;

export default function PromotionProductsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [promotion, setPromotion] = useState<Promotion | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        loadInitialData();
    }, [id]);

    const loadInitialData = async () => {
        try {
            setLoading(true);

            // Load promotion details
            const promoResponse = await getPromotion(Number(id));
            if (promoResponse.success) {
                setPromotion(promoResponse.data.promotion);
            }

            // Load products
            const productsResponse = await getPromotionProducts(Number(id), 1);
            if (productsResponse.success) {
                setProducts(productsResponse.data.products);
                const pagination = productsResponse.data.pagination;
                setHasMore(pagination ? pagination.current_page < pagination.last_page : false);
                setCurrentPage(1);
            }
        } catch (error) {
            console.error("Failed to load promotion products:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreProducts = async () => {
        if (!hasMore || loadingMore) return;

        try {
            setLoadingMore(true);
            const nextPage = currentPage + 1;
            const response = await getPromotionProducts(Number(id), nextPage);

            if (response.success) {
                setProducts(prev => [...prev, ...response.data.products]);
                const pagination = response.data.pagination;
                setHasMore(pagination ? pagination.current_page < pagination.last_page : false);
                setCurrentPage(nextPage);
            }
        } catch (error) {
            console.error("Failed to load more products:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadInitialData();
        setRefreshing(false);
    }, [id]);

    const getDiscountText = () => {
        if (!promotion) return "";
        if (promotion.discount_type === "percentage") {
            return `${promotion.discount_value}% OFF`;
        } else if (promotion.discount_type === "fixed") {
            return `${promotion.discount_value} EGP OFF`;
        }
        return "Special Offer";
    };

    const renderProduct = ({ item }: { item: Product }) => (
        <View style={styles.productCardWrapper}>
            <ProductCard
                product={item}
                onPress={() => router.push(`/product/${item.barcode}` as any)}
            />
        </View>
    );

    const renderHeader = () => (
        <View style={styles.headerInfo}>
            <LinearGradient
                colors={[Colors.primary900, Colors.primary700]}
                style={styles.discountBanner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Ionicons name="flash" size={24} color="#fff" />
                <View style={styles.discountTextContainer}>
                    <Text style={styles.discountText}>{getDiscountText()}</Text>
                    <Text style={styles.discountSubtext}>
                        {promotion?.title || "Special Promotion"}
                    </Text>
                </View>
            </LinearGradient>
            <Text style={styles.resultsCount}>
                {products.length} {products.length === 1 ? "item" : "items"} available
            </Text>
        </View>
    );

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary900} />
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="bag-outline" size={64} color={Colors.neutralGray} />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptyText}>
                No discounted products are available for this promotion yet.
            </Text>
            <TouchableOpacity
                style={styles.backToPromoButton}
                onPress={() => router.back()}
            >
                <Text style={styles.backToPromoButtonText}>Go Back</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <OfflineIndicator />
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Discounted Items</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Loading Skeleton */}
                <View style={styles.skeletonContainer}>
                    <SkeletonLoader width="100%" height={80} borderRadius={12} />
                    <View style={{ height: 16 }} />
                    <View style={styles.skeletonGrid}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <View key={i} style={styles.skeletonCard}>
                                <SkeletonLoader width="100%" height={120} borderRadius={12} />
                                <View style={{ height: 8 }} />
                                <SkeletonLoader width="80%" height={16} borderRadius={4} />
                                <View style={{ height: 6 }} />
                                <SkeletonLoader width="50%" height={20} borderRadius={4} />
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <OfflineIndicator />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Discounted Items</Text>
                <View style={styles.placeholder} />
            </View>

            <FlatList
                data={products}
                renderItem={renderProduct}
                keyExtractor={(item) => (item.barcode || item.id)?.toString() || ""}
                numColumns={2}
                columnWrapperStyle={styles.productRow}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
                onEndReached={loadMoreProducts}
                onEndReachedThreshold={0.3}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[Colors.primary900]}
                        tintColor={Colors.primary900}
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    placeholder: {
        width: 40,
    },
    listContent: {
        padding: Spacing.lg,
        paddingBottom: 100,
    },
    headerInfo: {
        marginBottom: Spacing.lg,
    },
    discountBanner: {
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.lg,
        borderRadius: 16,
        gap: 12,
        marginBottom: Spacing.md,
    },
    discountTextContainer: {
        flex: 1,
    },
    discountText: {
        fontSize: 22,
        fontWeight: "800",
        color: "#fff",
    },
    discountSubtext: {
        fontSize: 14,
        color: "rgba(255,255,255,0.9)",
        marginTop: 2,
    },
    resultsCount: {
        fontSize: 14,
        color: Colors.neutralMedium,
        fontWeight: "600",
    },
    productRow: {
        justifyContent: "space-between",
        marginBottom: Spacing.md,
    },
    productCardWrapper: {
        width: CARD_WIDTH,
    },
    footerLoader: {
        paddingVertical: Spacing.lg,
        alignItems: "center",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
        marginTop: Spacing.lg,
        marginBottom: Spacing.xs,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.neutralMedium,
        textAlign: "center",
        paddingHorizontal: 40,
        marginBottom: Spacing.lg,
    },
    backToPromoButton: {
        backgroundColor: Colors.primary900,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    backToPromoButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    skeletonContainer: {
        padding: Spacing.lg,
    },
    skeletonGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    skeletonCard: {
        width: CARD_WIDTH,
        marginBottom: Spacing.md,
    },
});
