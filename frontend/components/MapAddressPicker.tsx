import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useReducer,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
// @ts-ignore — lucide-react-native types not resolved under bundler moduleResolution
import { MapPin, Navigation, X, Check } from "lucide-react-native";
import Colors from "@/constants/Colors";
import {
  deliveryZoneApi,
  type ReverseGeocodeResult,
  type ResolvedZone,
} from "@/services/api/deliveryZoneApi";
import { useTranslation } from "@/i18n";

interface MapAddressPickerProps {
  initialLatitude?: number;
  initialLongitude?: number;
  onLocationSelected: (location: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    placeId: string;
    zone: ResolvedZone | null;
    addressComponents?: {
      street: string;
      city: string;
      area: string;
    };
  }) => void;
  onClose: () => void;
}

const DEFAULT_LAT = 30.0444; // Cairo
const DEFAULT_LNG = 31.2357;

// Drop a fetch when the pin moved < this many metres since the previous
// resolved fetch. flyTo / minor jitter / a moveend at the same coords no
// longer trigger redundant round-trips.
const MIN_MOVE_METRES = 8;

// Single source of truth for "how long to wait after the user stops moving
// the pin before we hit the server". Lives in the WebView (where moveend
// fires); RN side does NOT add another debounce on top.
const SETTLE_MS = 500;

// ───────────────────────────── reducer ──────────────────────────────────
//
// All map-state moves through one reducer so we can't end up with mismatched
// (lat, lng, address, zone) tuples — the previous code had eight independent
// useState slots that could disagree mid-flight.

type Status = "idle" | "fetching" | "ready" | "error";

interface MapState {
  status: Status;
  lat: number | null;
  lng: number | null;
  address: string;
  placeId: string;
  components: { street: string; city: string; area: string } | null;
  zone: ResolvedZone | null;
  isInZone: boolean | null;
}

type Action =
  | { type: "PIN_MOVED"; lat: number; lng: number }
  | { type: "FETCH_OK"; lat: number; lng: number; payload: ReverseGeocodeResult }
  | { type: "FETCH_FAIL"; lat: number; lng: number };

function reducer(state: MapState, action: Action): MapState {
  switch (action.type) {
    case "PIN_MOVED":
      return {
        ...state,
        status: "fetching",
        lat: action.lat,
        lng: action.lng,
        // Clear the old result so the UI shows "checking…" instead of stale OK/NOT-OK
        address: "",
        placeId: "",
        components: null,
        zone: null,
        isInZone: null,
      };
    case "FETCH_OK": {
      // Only accept the result if the pin hasn't moved on since we asked.
      // Belt-and-braces: AbortController already cancels the network side,
      // this guards against a fetch that resolved between dispatch and the
      // next state read.
      if (state.lat !== action.lat || state.lng !== action.lng) return state;
      return {
        ...state,
        status: "ready",
        address: action.payload.address.formatted_address ?? "",
        placeId: action.payload.address.place_id ?? "",
        components: {
          street: action.payload.address.components.street ?? "",
          city: action.payload.address.components.city ?? "",
          area: action.payload.address.components.area ?? "",
        },
        zone: action.payload.zone,
        isInZone: action.payload.is_covered,
      };
    }
    case "FETCH_FAIL":
      if (state.lat !== action.lat || state.lng !== action.lng) return state;
      return { ...state, status: "error", isInZone: null, zone: null };
    default:
      return state;
  }
}

// Haversine in metres — used for the distance-threshold guard so flyTo /
// jitter doesn't spam the network.
function distanceMetres(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sa = Math.sin(dLat / 2);
  const sb = Math.sin(dLng / 2);
  const h =
    sa * sa +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sb *
      sb;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function MapAddressPicker({
  initialLatitude,
  initialLongitude,
  onLocationSelected,
  onClose,
}: MapAddressPickerProps) {
  const { t } = useTranslation();
  // This picker renders inside a full-screen RN Modal, which does NOT inherit
  // the parent SafeAreaView — so read the insets here and push the top controls
  // (including the "detect location" button) below the status bar / notch.
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [state, dispatch] = useReducer(reducer, {
    status: "idle",
    lat: initialLatitude ?? null,
    lng: initialLongitude ?? null,
    address: "",
    placeId: "",
    components: null,
    zone: null,
    isInZone: null,
  });

  // Tracks the last (lat, lng) we actually fetched against. Used by the
  // <8 m threshold so we don't re-hit the server when the pin lands within
  // jitter range of the previous location.
  const lastResolvedRef = useRef<{ lat: number; lng: number } | null>(
    initialLatitude && initialLongitude
      ? { lat: initialLatitude, lng: initialLongitude }
      : null,
  );

  // One AbortController per in-flight request. Replaced atomically every
  // time the pin moves; the previous controller is aborted, which both
  // cancels the underlying fetch and lets RN's reducer ignore the now-stale
  // result.
  const inFlightRef = useRef<AbortController | null>(null);

  // ── Resolve a pin: ONE backend call, returns address + zone in one shot ─
  const resolvePin = useCallback(async (lat: number, lng: number) => {
    // Distance gate — drop near-identical coords from flyTo / mid-animation moveend.
    if (
      lastResolvedRef.current &&
      distanceMetres(lastResolvedRef.current, { lat, lng }) < MIN_MOVE_METRES
    ) {
      return;
    }

    // Cancel whatever was in flight.
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    dispatch({ type: "PIN_MOVED", lat, lng });

    try {
      const response = await deliveryZoneApi.reverseGeocode(
        lat,
        lng,
        controller.signal,
      );
      const data = (response as any)?.data ?? response;
      if (!data) throw new Error("No data");

      lastResolvedRef.current = { lat, lng };
      dispatch({ type: "FETCH_OK", lat, lng, payload: data });
    } catch (err: any) {
      if (err?.name === "AbortError" || controller.signal.aborted) return;
      dispatch({ type: "FETCH_FAIL", lat, lng });
    }
  }, []);

  // ── Resolve once on mount if we opened with initial coords. After that,
  //    every resolve is driven by WebView messages (no React deps loop).
  useEffect(() => {
    if (initialLatitude != null && initialLongitude != null) {
      resolvePin(initialLatitude, initialLongitude);
    }
    return () => {
      inFlightRef.current?.abort();
    };
    // resolvePin is stable (useCallback with [] deps); initial coords are
    // mount-time props. We deliberately don't react to prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── GPS button ──────────────────────────────────────────────────────────
  const getCurrentLocation = useCallback(async () => {
    try {
      setGpsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t?.common?.error || "Error",
          t?.addresses?.locationPermissionDenied ||
            "Location permission denied. Please enable it in settings.",
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      // The WebView's flyTo emits one moveend after settling; that single
      // event triggers the resolve. We don't dispatch PIN_MOVED here — the
      // WebView will tell us when the map actually settles on the new pin.
      webViewRef.current?.injectJavaScript(`
        moveToLocation(${latitude}, ${longitude});
        true;
      `);
    } catch (e) {
      Alert.alert(
        t?.common?.error || "Error",
        t?.ui?.failedToGetLocation || "Failed to get current location",
      );
    } finally {
      setGpsLoading(false);
    }
  }, [t]);

  // ── WebView messages ────────────────────────────────────────────────────
  const onWebViewMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "mapReady") {
          setMapLoading(false);
        } else if (data.type === "pinSettled") {
          resolvePin(Number(data.lat), Number(data.lng));
        }
      } catch {
        /* malformed message — ignore */
      }
    },
    [resolvePin],
  );

  const handleConfirm = () => {
    if (state.lat == null || state.lng == null) {
      Alert.alert(
        t?.common?.error || "Error",
        t?.addresses?.pleaseSelectLocation ||
          "Please select a location on the map",
      );
      return;
    }
    if (state.status === "fetching") {
      // Don't let the user confirm while we're still resolving — the result
      // (address + zone) is what gets persisted, so confirming mid-flight
      // would commit stale or empty values.
      return;
    }

    onLocationSelected({
      latitude: state.lat,
      longitude: state.lng,
      formattedAddress: state.address,
      placeId: state.placeId,
      zone: state.zone,
      addressComponents: state.components ?? undefined,
    });
  };

  const initLat = initialLatitude ?? DEFAULT_LAT;
  const initLng = initialLongitude ?? DEFAULT_LNG;
  const initZoom = initialLatitude ? 16 : 12;

  // ── Leaflet HTML ───────────────────────────────────────────────────────
  // The WebView is now a *dumb display layer*: it emits `pinSettled` after
  // 500ms of idle following moveend. It does NOT call Nominatim itself for
  // the centre pin — RN's resolvePin does the single backend round-trip
  // that returns (address + zone) atomically. The search box still uses
  // Nominatim directly for typing autocomplete only — that's a separate
  // concern from the pricing-critical pin resolution.
  const mapHtml = useMemo(
    () => `
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
    .search-box { position: absolute; top: 10px; left: 10px; right: 10px; z-index: 1000; }
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
    <input id="searchInput" type="text" placeholder="${t?.ui?.searchAddress || "Search address..."}" autocomplete="off" />
    <div id="searchResults" class="search-results"></div>
  </div>

  <script>
    var map = L.map('map', {
      center: [${initLat}, ${initLng}],
      zoom: ${initZoom},
      zoomControl: false,
      attributionControl: false
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    var settleTimer = null;
    var lastEmitted = null;

    function emitPinSettled() {
      var c = map.getCenter();
      // Quantise to 6 decimals (~11 cm). Two consecutive moveends with
      // the same coords (flyTo emits multiple moveends mid-animation) won't
      // trigger duplicate emissions.
      var key = c.lat.toFixed(6) + ',' + c.lng.toFixed(6);
      if (key === lastEmitted) return;
      lastEmitted = key;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'pinSettled',
        lat: c.lat,
        lng: c.lng
      }));
    }

    // Reset the settle timer on EVERY movement event so we only fire once
    // the user has actually stopped panning/zooming for SETTLE_MS.
    function scheduleSettle() {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(emitPinSettled, ${SETTLE_MS});
    }

    map.on('movestart', function() { if (settleTimer) clearTimeout(settleTimer); });
    map.on('move',      function() { if (settleTimer) clearTimeout(settleTimer); });
    map.on('moveend',   scheduleSettle);
    map.on('zoomend',   scheduleSettle);

    map.on('click', function(e) { map.flyTo(e.latlng, Math.max(map.getZoom(), 16)); });

    map.whenReady(function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
    });

    function moveToLocation(lat, lng) {
      // flyTo emits multiple move/moveend events mid-animation; the
      // settle timer + lastEmitted dedup take care of suppressing duplicates.
      map.flyTo([lat, lng], 16, { duration: 1 });
    }

    // ── Search box (Nominatim direct — typing autocomplete, NOT pin resolution) ──
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
        var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query) +
          '&limit=5&addressdetails=1&accept-language=en,ar' +
          '&viewbox=' + (center.lng - 0.5) + ',' + (center.lat + 0.5) + ',' + (center.lng + 0.5) + ',' + (center.lat - 0.5) +
          '&bounded=0';

        fetch(url, { headers: { 'User-Agent': 'CART-App/1.0' } })
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
                  map.flyTo([parseFloat(item.lat), parseFloat(item.lon)], 16, { duration: 1 });
                });
                searchResults.appendChild(div);
              });
              searchResults.classList.add('active');
            } else {
              searchResults.classList.remove('active');
            }
          })
          .catch(function() { searchResults.classList.remove('active'); });
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
  `,
    [initLat, initLng, initZoom, t?.ui?.searchAddress],
  );

  const checkingZone = state.status === "fetching";

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={20} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t?.addresses?.pickLocation || "Pick Location"}
        </Text>
        <TouchableOpacity
          onPress={getCurrentLocation}
          style={styles.headerButton}
          disabled={gpsLoading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={Colors.primary900} />
          ) : (
            <Navigation size={20} color={Colors.primary900} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        {mapLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary900} />
            <Text style={styles.loadingText}>
              {t?.ui?.loadingMap || "Loading map..."}
            </Text>
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

      <View style={styles.bottomPanel}>
        {state.address ? (
          <View style={styles.addressRow}>
            <MapPin size={16} color={Colors.primary900} />
            <Text style={styles.addressText} numberOfLines={2}>
              {state.address}
            </Text>
          </View>
        ) : (
          <View style={styles.addressRow}>
            <MapPin size={16} color={Colors.neutralGray} />
            <Text style={styles.addressPlaceholder}>
              {t?.addresses?.moveMapToSelect ||
                "Move the map to select a location"}
            </Text>
          </View>
        )}

        {checkingZone ? (
          <View style={styles.zoneRow}>
            <ActivityIndicator size="small" color={Colors.primary900} />
            <Text style={styles.zoneChecking}>
              {t?.ui?.checkingDeliveryZone || "Checking delivery zone..."}
            </Text>
          </View>
        ) : state.isInZone === true ? (
          <View style={styles.zoneOk}>
            <View style={styles.zoneRow}>
              <Check size={14} color="#16a34a" />
              <Text style={styles.zoneOkText}>
                {state.zone?.zone_name || t.ui.deliveryZone}{" "}
                {t.ui.deliveryFeeAmount.replace(
                  "{amount}",
                  String(state.zone?.delivery_fee ?? 0),
                )}
              </Text>
            </View>
            {(state.zone?.estimated_delivery_time ||
              state.zone?.distance_from_center_km) && (
              <View style={styles.zoneDetailsRow}>
                {state.zone?.estimated_delivery_time && (
                  <Text style={styles.zoneDetailText}>
                    🕐 {state.zone.estimated_delivery_time}
                  </Text>
                )}
                {state.zone?.distance_from_center_km && (
                  <Text style={styles.zoneDetailText}>
                    📍 {state.zone.distance_from_center_km.toFixed(1)} km away
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : state.isInZone === false ? (
          <View style={styles.zoneNotOk}>
            <View style={styles.zoneRow}>
              <X size={14} color="#dc2626" />
              <Text style={styles.zoneNotOkText}>
                {t?.addresses?.outsideDeliveryZone || "Outside delivery area"}
              </Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.confirmButton,
            (state.lat == null || state.status === "fetching") &&
              styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={state.lat == null || state.status === "fetching"}
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
