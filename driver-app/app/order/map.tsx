import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Linking,
    Platform,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { ArrowLeft, Navigation, MapPin, ExternalLink } from "lucide-react-native";
import { driverService, Order, OrderAddress } from "@/services/driver";
import { locationService } from "@/services/location";

const UPDATE_INTERVAL = 4000; // 4 seconds

export default function DeliveryMapScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [driverLat, setDriverLat] = useState<number | null>(null);
    const [driverLng, setDriverLng] = useState<number | null>(null);
    const [driverHeading, setDriverHeading] = useState<number | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const webRef = useRef<WebView>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch order details
    useEffect(() => {
        (async () => {
            try {
                const data = await driverService.getOrderDetails(Number(id));
                setOrder(data);

                // Set this order as active so location updates include the order_id
                locationService.setActiveOrder(data.id);
            } catch (err: any) {
                Alert.alert("Error", err?.message || "Failed to load order");
            } finally {
                setLoading(false);
            }
        })();

        return () => {
            // Clear active order when leaving the map
            locationService.setActiveOrder(null);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [id]);

    // Track driver's location on a fast interval
    const updateDriverPosition = useCallback(async () => {
        try {
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            setDriverLat(loc.coords.latitude);
            setDriverLng(loc.coords.longitude);
            setDriverHeading(loc.coords.heading);
        } catch {
            // silent
        }
    }, []);

    useEffect(() => {
        updateDriverPosition();
        intervalRef.current = setInterval(updateDriverPosition, UPDATE_INTERVAL);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [updateDriverPosition]);

    // Push driver position updates to the WebView map
    useEffect(() => {
        if (!mapReady || !webRef.current || driverLat == null) return;

        const msg = JSON.stringify({
            type: "UPDATE_DRIVER",
            lat: driverLat,
            lng: driverLng,
            heading: driverHeading,
        });
        webRef.current.postMessage(msg);
    }, [driverLat, driverLng, driverHeading, mapReady]);

    // Get delivery coordinates
    const getDeliveryCoords = (): { lat: number; lng: number } | null => {
        if (!order) return null;
        if (order.delivery_lat && order.delivery_lng) {
            return { lat: order.delivery_lat, lng: order.delivery_lng };
        }
        // Try from address object
        const addr = order.delivery_address;
        if (addr && typeof addr === "object" && "latitude" in addr && "longitude" in addr && addr.latitude) {
            return { lat: Number(addr.latitude), lng: Number(addr.longitude) };
        }
        return null;
    };

    const getDeliveryAddressString = (): string => {
        if (!order) return "";
        const addr = order.delivery_address;
        if (typeof addr === "string") return addr;
        if (addr && typeof addr === "object") {
            const parts = [addr.street, addr.building, addr.area, addr.city].filter(Boolean);
            return parts.join(", ");
        }
        return "Delivery Location";
    };

    // Open in Google Maps
    const openGoogleMaps = () => {
        const coords = getDeliveryCoords();
        if (!coords) {
            // Fall back to address search
            const address = getDeliveryAddressString();
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
            Linking.openURL(url);
            return;
        }

        // If we have both driver and destination, open navigation
        if (driverLat && driverLng) {
            const url = Platform.select({
                android: `google.navigation:q=${coords.lat},${coords.lng}`,
                ios: `comgooglemaps://?daddr=${coords.lat},${coords.lng}&saddr=${driverLat},${driverLng}&directionsmode=driving`,
                default: `https://www.google.com/maps/dir/?api=1&origin=${driverLat},${driverLng}&destination=${coords.lat},${coords.lng}&travelmode=driving`,
            });
            Linking.openURL(url!).catch(() => {
                // Fallback to web Google Maps
                Linking.openURL(
                    `https://www.google.com/maps/dir/?api=1&origin=${driverLat},${driverLng}&destination=${coords.lat},${coords.lng}&travelmode=driving`
                );
            });
        } else {
            const url = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
            Linking.openURL(url);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#16a34a" />
                    <Text style={styles.loadingText}>Loading map...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!order) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text style={{ color: "#6b7280" }}>Order not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const deliveryCoords = getDeliveryCoords();
    const deliveryAddress = getDeliveryAddressString();

    // Center map on delivery coords or driver
    const centerLat = deliveryCoords?.lat || driverLat || 30.0444;
    const centerLng = deliveryCoords?.lng || driverLng || 31.2357;

    const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([${centerLat}, ${centerLng}], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    // Driver icon (blue circle with arrow)
    var driverIcon = L.divIcon({
      className: '',
      html: '<div style="width:40px;height:40px;border-radius:50%;background:#1d4ed8;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;transition:transform 0.3s ease;"><svg width=\\"20\\" height=\\"20\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"#fff\\" stroke-width=\\"2.5\\"><path d=\\"M12 2L19 21l-7-4-7 4L12 2z\\"/></svg></div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Delivery destination icon (red pin)
    var destIcon = L.divIcon({
      className: '',
      html: '<div style="width:36px;height:36px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;"><svg width=\\"18\\" height=\\"18\\" viewBox=\\"0 0 24 24\\" fill=\\"#fff\\"><path d=\\"M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z\\"/></svg></div>',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    var driverMarker = null;
    var destMarker = null;
    var routeLine = null;

    // Place destination marker
    ${deliveryCoords ? `
    destMarker = L.marker([${deliveryCoords.lat}, ${deliveryCoords.lng}], { icon: destIcon })
      .addTo(map)
      .bindPopup('${deliveryAddress.replace(/'/g, "\\'")}');
    ` : ''}

    // Place initial driver marker if we have coords
    ${driverLat ? `
    driverMarker = L.marker([${driverLat}, ${driverLng}], { icon: driverIcon })
      .addTo(map)
      .bindPopup('You');

    ${deliveryCoords ? `
    // Draw route line & fit bounds
    var pts = [[${driverLat}, ${driverLng}], [${deliveryCoords.lat}, ${deliveryCoords.lng}]];
    routeLine = L.polyline(pts, { color: '#1d4ed8', weight: 4, opacity: 0.7, dashArray: '12,8' }).addTo(map);
    map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 16 });
    ` : ''}
    ` : ''}

    function updateDriver(data) {
      if (!data.lat) return;

      if (!driverMarker) {
        driverMarker = L.marker([data.lat, data.lng], { icon: driverIcon })
          .addTo(map).bindPopup('You');
      } else {
        driverMarker.setLatLng([data.lat, data.lng]);
      }

      // Rotate based on heading
      if (data.heading != null) {
        var el = driverMarker.getElement();
        if (el) {
          el.style.transform = el.style.transform.replace(/rotate\\([^)]*\\)/, '') + ' rotate(' + data.heading + 'deg)';
        }
      }

      // Update route line
      ${deliveryCoords ? `
      var pts = [[data.lat, data.lng], [${deliveryCoords.lat}, ${deliveryCoords.lng}]];
      if (routeLine) {
        routeLine.setLatLngs(pts);
      } else {
        routeLine = L.polyline(pts, { color: '#1d4ed8', weight: 4, opacity: 0.7, dashArray: '12,8' }).addTo(map);
      }
      // Don't auto-fit bounds on every update to avoid jerky UX — only on first load
      ` : ''}
    }

    // Listen for updates from React Native
    function handleMsg(event) {
      try {
        var d = JSON.parse(event.data);
        if (d.type === 'UPDATE_DRIVER') updateDriver(d);
      } catch(e) {}
    }
    window.addEventListener('message', handleMsg);
    document.addEventListener('message', handleMsg);

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
  </script>
</body>
</html>`.trim();

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={22} color="#111827" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.headerTitle}>Delivery Map</Text>
                    <Text style={styles.headerSubtitle}>Order #{order.order_number || order.id}</Text>
                </View>
                <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            </View>

            {/* Map */}
            <View style={styles.mapContainer}>
                <WebView
                    ref={webRef}
                    source={{ html: mapHtml }}
                    style={{ flex: 1 }}
                    scrollEnabled={false}
                    javaScriptEnabled
                    originWhitelist={["*"]}
                    onMessage={(event) => {
                        try {
                            const data = JSON.parse(event.nativeEvent.data);
                            if (data.type === "MAP_READY") setMapReady(true);
                        } catch { }
                    }}
                />
                {!mapReady && (
                    <View style={styles.mapLoading}>
                        <ActivityIndicator size="small" color="#16a34a" />
                        <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Loading map...</Text>
                    </View>
                )}
            </View>

            {/* Bottom Panel */}
            <View style={styles.bottomPanel}>
                {/* Delivery Address */}
                <View style={styles.addressRow}>
                    <View style={styles.addressIcon}>
                        <MapPin size={18} color="#ef4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.addressLabel}>Delivering to</Text>
                        <Text style={styles.addressText} numberOfLines={2}>
                            {deliveryAddress || "No address available"}
                        </Text>
                    </View>
                </View>

                {/* Customer Info */}
                {(() => {
                    const cust = order.customer || order.user;
                    return cust ? (
                        <View style={styles.customerRow}>
                            <Text style={styles.customerName}>
                                {cust.first_name} {cust.last_name}
                            </Text>
                            {cust.phone && (
                                <TouchableOpacity
                                    style={styles.callBtn}
                                    onPress={() => Linking.openURL(`tel:${cust.phone}`)}
                                >
                                    <Text style={styles.callBtnText}>Call</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : null;
                })()}

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.googleMapsBtn} onPress={openGoogleMaps} activeOpacity={0.8}>
                        <ExternalLink size={18} color="#fff" />
                        <Text style={styles.googleMapsBtnText}>Open in Google Maps</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.recenterBtn}
                        onPress={() => {
                            if (webRef.current && deliveryCoords && driverLat) {
                                webRef.current.postMessage(JSON.stringify({
                                    type: "UPDATE_DRIVER",
                                    lat: driverLat,
                                    lng: driverLng,
                                    heading: driverHeading,
                                    fitBounds: true,
                                }));
                            }
                        }}
                    >
                        <Navigation size={18} color="#1d4ed8" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
    loadingText: { fontSize: 14, color: "#9ca3af" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#f8fafc",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
    headerSubtitle: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
    liveBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#fef2f2",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#ef4444",
    },
    liveText: {
        fontSize: 10,
        fontWeight: "800",
        color: "#ef4444",
        letterSpacing: 1,
    },
    mapContainer: {
        flex: 1,
        backgroundColor: "#e5e7eb",
    },
    mapLoading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#f9fafb",
        alignItems: "center",
        justifyContent: "center",
    },
    bottomPanel: {
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 28,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    addressRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 12,
    },
    addressIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#fef2f2",
        justifyContent: "center",
        alignItems: "center",
    },
    addressLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 2 },
    addressText: { fontSize: 14, color: "#111827", fontWeight: "500", lineHeight: 20 },
    customerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
    },
    customerName: { fontSize: 15, fontWeight: "600", color: "#374151" },
    callBtn: {
        backgroundColor: "#f0fdf4",
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#bbf7d0",
    },
    callBtnText: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
    actionRow: {
        flexDirection: "row",
        gap: 10,
    },
    googleMapsBtn: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#16a34a",
        paddingVertical: 14,
        borderRadius: 14,
    },
    googleMapsBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    recenterBtn: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: "#eff6ff",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#bfdbfe",
    },
});
