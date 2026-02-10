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
    mapboxToken?: string;
}

// Default center: Cairo
const DEFAULT_LAT = 30.0444;
const DEFAULT_LNG = 31.2357;

export default function MapAddressPicker({
    initialLatitude,
    initialLongitude,
    onLocationSelected,
    onClose,
    mapboxToken = "",
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

    // Check zone coverage when location changes
    useEffect(() => {
        if (!selectedLocation) return;

        const checkZone = async () => {
            try {
                setCheckingZone(true);
                const response = await deliveryZoneApi.checkCoverage(
                    selectedLocation.lat,
                    selectedLocation.lng
                );
                const data = response.data || response;
                setZoneInfo(data.zone);
                setIsInZone(data.covered);
            } catch (error) {
                // Silently fail — zone check is non-critical
                setZoneInfo(null);
                setIsInZone(null);
            } finally {
                setCheckingZone(false);
            }
        };

        checkZone();
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

    // HTML for embedded Mapbox GL JS map
    const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet">
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .center-pin {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -100%);
      z-index: 10; pointer-events: none;
      font-size: 36px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }
    .search-box {
      position: absolute; top: 10px; left: 10px; right: 10px; z-index: 5;
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
      display: none; z-index: 6;
    }
    .search-results.active { display: block; }
    .search-result-item {
      padding: 10px 14px; border-bottom: 1px solid #f0f0f0;
      cursor: pointer; font-size: 13px; color: #333;
    }
    .search-result-item:active { background: #f0f0f0; }
    .search-result-item:last-child { border-bottom: none; }
    .mapboxgl-ctrl-attrib { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="center-pin">📍</div>
  ${mapboxToken ? `
  <div class="search-box">
    <input id="searchInput" type="text" placeholder="Search address..." autocomplete="off" />
    <div id="searchResults" class="search-results"></div>
  </div>
  ` : ''}

  <script>
    mapboxgl.accessToken = '${mapboxToken}';

    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [${initLng}, ${initLat}],
      zoom: ${initZoom},
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    let debounceTimer = null;

    // Reverse geocode via Mapbox Geocoding API
    function reverseGeocode(lat, lng) {
      fetch('https://api.mapbox.com/geocoding/v5/mapbox.places/' + lng + ',' + lat + '.json?access_token=' + mapboxgl.accessToken + '&language=en,ar&types=address,poi,place,locality,neighborhood')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var address = '';
          var placeId = '';
          var components = { street: '', city: '', area: '', governorate: '' };

          if (data.features && data.features.length > 0) {
            var feat = data.features[0];
            address = feat.place_name || '';
            placeId = feat.id || '';

            // Extract address components from context
            var ctx = feat.context || [];
            ctx.forEach(function(c) {
              if (c.id.startsWith('neighborhood') || c.id.startsWith('locality')) {
                components.area = c.text;
              } else if (c.id.startsWith('place')) {
                components.city = c.text;
              } else if (c.id.startsWith('region')) {
                components.governorate = c.text;
              }
            });

            // Street from main feature text
            if (feat.text) {
              components.street = feat.text;
            }
          }

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'locationSelected',
            lat: lat,
            lng: lng,
            address: address,
            placeId: placeId,
            addressComponents: components,
          }));
        })
        .catch(function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'locationSelected',
            lat: lat,
            lng: lng,
            address: '',
            placeId: '',
            addressComponents: {},
          }));
        });
    }

    // When map moves, reverse geocode the center
    map.on('moveend', function() {
      var center = map.getCenter();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        reverseGeocode(center.lat, center.lng);
      }, 300);
    });

    // Click to select
    map.on('click', function(e) {
      map.flyTo({ center: e.lngLat, zoom: Math.max(map.getZoom(), 16) });
    });

    // Signal ready
    map.on('load', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
      ${initialLatitude ? `reverseGeocode(${initLat}, ${initLng});` : ''}
    });

    function moveToLocation(lat, lng) {
      map.flyTo({ center: [lng, lat], zoom: 16, duration: 1000 });
    }

    // Search functionality via Mapbox Geocoding
    var searchInput = document.getElementById('searchInput');
    var searchResults = document.getElementById('searchResults');
    var searchDebounce = null;

    if (searchInput) {
      searchInput.addEventListener('input', function() {
        var query = searchInput.value.trim();
        if (searchDebounce) clearTimeout(searchDebounce);

        if (query.length < 2) {
          searchResults.classList.remove('active');
          return;
        }

        searchDebounce = setTimeout(function() {
          var center = map.getCenter();
          fetch('https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(query) + '.json?access_token=' + mapboxgl.accessToken + '&proximity=' + center.lng + ',' + center.lat + '&language=en,ar&limit=5&types=address,poi,place,locality,neighborhood')
            .then(function(res) { return res.json(); })
            .then(function(data) {
              searchResults.innerHTML = '';
              if (data.features && data.features.length > 0) {
                data.features.forEach(function(feat) {
                  var item = document.createElement('div');
                  item.className = 'search-result-item';
                  item.textContent = feat.place_name;
                  item.addEventListener('click', function() {
                    searchInput.value = feat.place_name;
                    searchResults.classList.remove('active');
                    var coords = feat.center; // [lng, lat]
                    map.flyTo({ center: coords, zoom: 16, duration: 1000 });
                  });
                  searchResults.appendChild(item);
                });
                searchResults.classList.add('active');
              } else {
                searchResults.classList.remove('active');
              }
            })
            .catch(function() {
              searchResults.classList.remove('active');
            });
        }, 350);
      });

      // Hide results on blur
      searchInput.addEventListener('blur', function() {
        setTimeout(function() { searchResults.classList.remove('active'); }, 200);
      });
      searchInput.addEventListener('focus', function() {
        if (searchResults.children.length > 0) {
          searchResults.classList.add('active');
        }
      });
    }
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
                    <View style={[styles.zoneRow, isInZone ? styles.zoneOk : styles.zoneNotOk]}>
                        {isInZone ? (
                            <>
                                <Check size={14} color="#16a34a" />
                                <Text style={styles.zoneOkText}>
                                    {zoneInfo?.name || "Delivery zone"} — EGP {zoneInfo?.delivery_fee || 0} delivery fee
                                </Text>
                            </>
                        ) : (
                            <>
                                <X size={14} color="#dc2626" />
                                <Text style={styles.zoneNotOkText}>
                                    {t?.addresses?.outsideDeliveryZone || "Outside delivery area"}
                                </Text>
                            </>
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
    },
    zoneOkText: {
        fontSize: 12,
        color: "#16a34a",
        fontWeight: "500",
    },
    zoneNotOk: {
        backgroundColor: "#fef2f2",
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
