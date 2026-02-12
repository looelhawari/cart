import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
// @ts-ignore — lucide-react-native types not resolved under bundler moduleResolution
import { MapPin, Navigation, X, Check } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { deliveryZoneApi, type CoverageResult } from "@/services/api/deliveryZoneApi";
import { useTranslation } from "@/i18n";

interface MapAddressPickerProps {
    initialLatitude?: number;
    initialLongitude?: number;
    onLocationSelected: (location: {
        latitude: number;
        longitude: number;
        formattedAddress: string;
        placeId: string;
        zone: CoverageResult["zone"] | null;
        addressComponents?: {
            street: string;
            city: string;
            area: string;
        };
    }) => void;
    onClose: () => void;
}

// Default center: Cairo
const DEFAULT_LAT = 30.0444;
const DEFAULT_LNG = 31.2357;

// Nominatim public server (free, no API key needed)
const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

export default function MapAddressPicker({
    initialLatitude,
    initialLongitude,
    onLocationSelected,
    onClose,
}: MapAddressPickerProps) {
    const { t } = useTranslation();
    const webViewRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [checkingZone, setCheckingZone] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<{
        lat: number;
        lng: number;
    } | null>(
        initialLatitude && initialLongitude
            ? { lat: initialLatitude, lng: initialLongitude }
            : null
    );
    const [address, setAddress] = useState<string>("");
    const [placeId, setPlaceId] = useState<string>("");
    const [addressComponents, setAddressComponents] = useState<any>(null);
    const [zoneInfo, setZoneInfo] = useState<CoverageResult["zone"] | null>(null);
    const [isInZone, setIsInZone] = useState<boolean | null>(null);

    // Counter to track zone check requests — ignore stale responses
    const zoneRequestId = useRef(0);

    // Get user's current location
    const getCurrentLocation = useCallback(async () => {
        try {
            setGpsLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    t?.common?.error || "Error",
                    t?.addresses?.locationPermissionDenied || "Location permission denied. Please enable it in settings."
                );
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const { latitude, longitude } = location.coords;
            setSelectedLocation({ lat: latitude, lng: longitude });

            // Move map to GPS location
            webViewRef.current?.injectJavaScript(`
        moveToLocation(${latitude}, ${longitude});
        true;
      `);
        } catch (error) {
            Alert.alert(
                t?.common?.error || "Error",
                "Failed to get current location"
            );
        } finally {
            setGpsLoading(false);
        }
    }, []);

    // Debounce timer for zone check
    const zoneCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Check zone coverage when location settles (debounced)
    useEffect(() => {
        if (!selectedLocation) return;

        // Immediately clear stale zone status so user sees "checking" not old result
        setZoneInfo(null);
        setIsInZone(null);
        setCheckingZone(true);

        // Increment request ID — any older in-flight response will be ignored
        const currentRequestId = ++zoneRequestId.current;

        // Clear any pending zone check timer
        if (zoneCheckTimer.current) clearTimeout(zoneCheckTimer.current);

        // Wait 800ms after last location change before checking zone
        zoneCheckTimer.current = setTimeout(async () => {
            try {
                const response = await deliveryZoneApi.checkCoverage(
                    selectedLocation.lat,
                    selectedLocation.lng
                );

                // Only apply result if this is still the latest request
                if (currentRequestId !== zoneRequestId.current) return;

                const data = response.data || response;
                setZoneInfo(data.zone);
                setIsInZone(data.is_covered ?? data.covered ?? false);
            } catch (error) {
                // Only apply if still the latest request
                if (currentRequestId !== zoneRequestId.current) return;
                setZoneInfo(null);
                setIsInZone(null);
            } finally {
                if (currentRequestId === zoneRequestId.current) {
                    setCheckingZone(false);
                }
            }
        }, 800);

        return () => {
            if (zoneCheckTimer.current) clearTimeout(zoneCheckTimer.current);
        };
    }, [selectedLocation]);

    // Handle messages from WebView
    const onWebViewMessage = useCallback((event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === "mapReady") {
                setLoading(false);
            } else if (data.type === "locationSelected") {
                setSelectedLocation({ lat: data.lat, lng: data.lng });
                setAddress(data.address || "");
                setPlaceId(data.placeId || "");
                if (data.addressComponents) {
                    setAddressComponents(data.addressComponents);
                }
            } else if (data.type === "markerDragged") {
                setSelectedLocation({ lat: data.lat, lng: data.lng });
                setAddress(data.address || "");
                setPlaceId(data.placeId || "");
                if (data.addressComponents) {
                    setAddressComponents(data.addressComponents);
                }
            }
        } catch (e) {
            // Ignore malformed messages
        }
    }, []);

    const handleConfirm = () => {
        if (!selectedLocation) {
            Alert.alert(
                t?.common?.error || "Error",
                t?.addresses?.pleaseSelectLocation || "Please select a location on the map"
            );
            return;
        }

        onLocationSelected({
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            formattedAddress: address,
            placeId: placeId,
            zone: zoneInfo,
            addressComponents: addressComponents,
        });
    };

    const initLat = initialLatitude || DEFAULT_LAT;
    const initLng = initialLongitude || DEFAULT_LNG;
    const initZoom = initialLatitude ? 16 : 12;

    // ── Leaflet + OpenStreetMap + Nominatim WebView HTML ─────────────────
    const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .center-pin {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -100%);
      z-index: 1000; pointer-events: none;
      font-size: 36px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }
    .search-box {
      position: absolute; top: 10px; left: 10px; right: 10px; z-index: 1000;
    }
    .search-box input {
      width: 100%; padding: 12px 16px; border: none; border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15); font-size: 14px;
      outline: none; background: white;
    }
    .search-results {
      position: absolute; top: 48px; left: 0; right: 0;
      background: white; border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      max-height: 200px; overflow-y: auto;
      display: none; z-index: 1001;
    }
    .search-results.active { display: block; }
    .search-result-item {
      padding: 10px 14px; border-bottom: 1px solid #f0f0f0;
      cursor: pointer; font-size: 13px; color: #333;
    }
    .search-result-item:active { background: #f0f0f0; }
    .search-result-item:last-child { border-bottom: none; }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="center-pin">📍</div>
  <div class="search-box">
    <input id="searchInput" type="text" placeholder="Search address..." autocomplete="off" />
    <div id="searchResults" class="search-results"></div>
  </div>

  <script>
    var map = L.map('map', {
      center: [${initLat}, ${initLng}],
      zoom: ${initZoom},
      zoomControl: false,
      attributionControl: false
    });

    // OpenStreetMap tiles — completely free, no API key
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Add zoom control bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    var debounceTimer = null;
    var isDragging = false;
    var NOMINATIM = '${NOMINATIM_URL}';

    // Reverse geocode via Nominatim (free, no API key)
    function reverseGeocode(lat, lng) {
      var url = NOMINATIM + '/reverse?format=json&lat=' + lat + '&lon=' + lng +
        '&addressdetails=1&accept-language=en,ar&zoom=18';

      fetch(url, { headers: { 'User-Agent': 'ElBaraka-App/1.0' } })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var address = data.display_name || '';
          var placeId = (data.osm_type || '') + ':' + (data.osm_id || '');
          var components = { street: '', city: '', area: '', governorate: '' };

          if (data.address) {
            var a = data.address;
            components.street = a.road || a.pedestrian || a.footway || '';
            components.city = a.city || a.town || a.village || '';
            components.area = a.suburb || a.neighbourhood || a.quarter || a.district || '';
            components.governorate = a.state || a.governorate || '';
          }

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'locationSelected',
            lat: lat,
            lng: lng,
            address: address,
            placeId: placeId,
            addressComponents: components
          }));
        })
        .catch(function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'locationSelected',
            lat: lat,
            lng: lng,
            address: '',
            placeId: '',
            addressComponents: {}
          }));
        });
    }

    // Cancel any pending geocode when user starts dragging again
    map.on('movestart', function() {
      isDragging = true;
      if (debounceTimer) clearTimeout(debounceTimer);
    });

    // Only reverse geocode AFTER the user fully stops moving the map (1.5s idle)
    map.on('moveend', function() {
      isDragging = false;
      var center = map.getCenter();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        if (!isDragging) {
          reverseGeocode(center.lat, center.lng);
        }
      }, 1500);
    });

    // Click to re-center
    map.on('click', function(e) {
      map.flyTo(e.latlng, Math.max(map.getZoom(), 16));
    });

    // Signal ready
    map.whenReady(function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
      ${initialLatitude ? `reverseGeocode(${initLat}, ${initLng});` : ''}
    });

    function moveToLocation(lat, lng) {
      map.flyTo([lat, lng], 16, { duration: 1 });
    }

    // ── Search via Nominatim ────────────────────────────────────
    var searchInput = document.getElementById('searchInput');
    var searchResults = document.getElementById('searchResults');
    var searchDebounce = null;

    searchInput.addEventListener('input', function() {
      var query = searchInput.value.trim();
      if (searchDebounce) clearTimeout(searchDebounce);

      if (query.length < 2) {
        searchResults.classList.remove('active');
        return;
      }

      searchDebounce = setTimeout(function() {
        var center = map.getCenter();
        var url = NOMINATIM + '/search?format=json&q=' + encodeURIComponent(query) +
          '&limit=5&addressdetails=1&accept-language=en,ar' +
          '&viewbox=' + (center.lng - 0.5) + ',' + (center.lat + 0.5) + ',' + (center.lng + 0.5) + ',' + (center.lat - 0.5) +
          '&bounded=0';

        fetch(url, { headers: { 'User-Agent': 'ElBaraka-App/1.0' } })
          .then(function(res) { return res.json(); })
          .then(function(results) {
            searchResults.innerHTML = '';
            if (results && results.length > 0) {
              results.forEach(function(item) {
                var div = document.createElement('div');
                div.className = 'search-result-item';
                div.textContent = item.display_name;
                div.addEventListener('click', function() {
                  searchInput.value = item.display_name;
                  searchResults.classList.remove('active');
                  var lat = parseFloat(item.lat);
                  var lng = parseFloat(item.lon);
                  map.flyTo([lat, lng], 16, { duration: 1 });
                });
                searchResults.appendChild(div);
              });
              searchResults.classList.add('active');
            } else {
              searchResults.classList.remove('active');
            }
          })
          .catch(function() {
            searchResults.classList.remove('active');
          });
      }, 400);
    });

    searchInput.addEventListener('blur', function() {
      setTimeout(function() { searchResults.classList.remove('active'); }, 200);
    });
    searchInput.addEventListener('focus', function() {
      if (searchResults.children.length > 0) searchResults.classList.add('active');
    });
  </script>
</body>
</html>
  `;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                    <X size={20} color={Colors.neutralCharcoal} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {t?.addresses?.pickLocation || "Pick Location"}
                </Text>
                <TouchableOpacity
                    onPress={getCurrentLocation}
                    style={styles.headerButton}
                    disabled={gpsLoading}
                >
                    {gpsLoading ? (
                        <ActivityIndicator size="small" color={Colors.primary900} />
                    ) : (
                        <Navigation size={20} color={Colors.primary900} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Map */}
            <View style={styles.mapContainer}>
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={Colors.primary900} />
                        <Text style={styles.loadingText}>Loading map...</Text>
                    </View>
                )}
                <WebView
                    ref={webViewRef}
                    source={{ html: mapHtml }}
                    style={styles.webView}
                    onMessage={onWebViewMessage}
                    javaScriptEnabled
                    domStorageEnabled
                    startInLoadingState={false}
                    originWhitelist={["*"]}
                    mixedContentMode="always"
                />
            </View>

            {/* Bottom Panel */}
            <View style={styles.bottomPanel}>
                {/* Address Display */}
                {address ? (
                    <View style={styles.addressRow}>
                        <MapPin size={16} color={Colors.primary900} />
                        <Text style={styles.addressText} numberOfLines={2}>
                            {address}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.addressRow}>
                        <MapPin size={16} color={Colors.neutralGray} />
                        <Text style={styles.addressPlaceholder}>
                            {t?.addresses?.moveMapToSelect || "Move the map to select a location"}
                        </Text>
                    </View>
                )}

                {/* Zone Status */}
                {checkingZone ? (
                    <View style={styles.zoneRow}>
                        <ActivityIndicator size="small" color={Colors.primary900} />
                        <Text style={styles.zoneChecking}>Checking delivery zone...</Text>
                    </View>
                ) : isInZone !== null ? (
                    <View style={isInZone ? styles.zoneOk : styles.zoneNotOk}>
                        {isInZone ? (
                            <>
                                <View style={styles.zoneRow}>
                                    <Check size={14} color="#16a34a" />
                                    <Text style={styles.zoneOkText}>
                                        {(zoneInfo as any)?.zone_name || zoneInfo?.name || "Delivery zone"} — EGP {zoneInfo?.delivery_fee || 0} delivery fee
                                    </Text>
                                </View>
                                {(zoneInfo?.estimated_delivery_time || zoneInfo?.distance_from_center_km) && (
                                    <View style={styles.zoneDetailsRow}>
                                        {zoneInfo?.estimated_delivery_time && (
                                            <Text style={styles.zoneDetailText}>
                                                🕐 {zoneInfo.estimated_delivery_time}
                                            </Text>
                                        )}
                                        {zoneInfo?.distance_from_center_km && (
                                            <Text style={styles.zoneDetailText}>
                                                📍 {zoneInfo.distance_from_center_km.toFixed(1)} km away
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={styles.zoneRow}>
                                <X size={14} color="#dc2626" />
                                <Text style={styles.zoneNotOkText}>
                                    {t?.addresses?.outsideDeliveryZone || "Outside delivery area"}
                                </Text>
                            </View>
                        )}
                    </View>
                ) : null}

                {/* Confirm Button */}
                <TouchableOpacity
                    style={[
                        styles.confirmButton,
                        (!selectedLocation) && styles.confirmButtonDisabled,
                    ]}
                    onPress={handleConfirm}
                    disabled={!selectedLocation}
                    activeOpacity={0.8}
                >
                    <Check size={18} color="#fff" />
                    <Text style={styles.confirmButtonText}>
                        {t?.addresses?.confirmLocation || "Confirm Location"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        backgroundColor: "#fff",
    },
    headerButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
        backgroundColor: "#f5f5f5",
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.neutralCharcoal,
    },
    mapContainer: {
        flex: 1,
        position: "relative",
    },
    webView: {
        flex: 1,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#f9f9f9",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    loadingText: {
        marginTop: 8,
        fontSize: 14,
        color: Colors.neutralGray,
    },
    bottomPanel: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#eee",
        backgroundColor: "#fff",
        gap: 8,
    },
    addressRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    addressText: {
        flex: 1,
        fontSize: 13,
        color: Colors.neutralCharcoal,
        lineHeight: 18,
    },
    addressPlaceholder: {
        flex: 1,
        fontSize: 13,
        color: Colors.neutralGray,
        fontStyle: "italic",
    },
    zoneRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    zoneChecking: {
        fontSize: 12,
        color: Colors.neutralGray,
    },
    zoneOk: {
        backgroundColor: "#f0fdf4",
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    zoneOkText: {
        fontSize: 12,
        color: "#16a34a",
        fontWeight: "500",
    },
    zoneDetailsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingTop: 4,
        marginLeft: 20,
    },
    zoneDetailText: {
        fontSize: 11,
        color: "#16a34a",
        fontWeight: "400",
    },
    zoneNotOk: {
        backgroundColor: "#fef2f2",
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    zoneNotOkText: {
        fontSize: 12,
        color: "#dc2626",
        fontWeight: "500",
    },
    confirmButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary900,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 4,
    },
    confirmButtonDisabled: {
        opacity: 0.5,
    },
    confirmButtonText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
});
