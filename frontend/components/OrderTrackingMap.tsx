import React, { useRef, useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { WebView } from "react-native-webview";
import Colors from "@/constants/Colors";
import type { TrackingDriver, TrackingDelivery } from "@/services/api/trackingApi";

interface OrderTrackingMapProps {
  driver: TrackingDriver | null;
  delivery: TrackingDelivery;
  /** Compact mode for embedded use */
  compact?: boolean;
}

export default function OrderTrackingMap({ driver, delivery, compact }: OrderTrackingMapProps) {
  const webRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);

  // When driver or delivery changes, push updates into the WebView
  useEffect(() => {
    if (!mapReady || !webRef.current) return;

    const msg = JSON.stringify({
      type: "UPDATE_MARKERS",
      driver: driver
        ? {
          lat: driver.location.lat,
          lng: driver.location.lng,
          heading: driver.location.heading,
          name: driver.name,
        }
        : null,
      delivery: {
        lat: delivery.lat,
        lng: delivery.lng,
      },
    });

    webRef.current.postMessage(msg);
  }, [driver, delivery, mapReady]);

  const centerLat = driver?.location.lat || delivery.lat || 30.0444;
  const centerLng = driver?.location.lng || delivery.lng || 31.2357;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
    }).setView([${centerLat}, ${centerLng}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Custom icons
    var driverIcon = L.divIcon({
      className: 'driver-marker',
      html: '<div style="width:36px;height:36px;border-radius:50%;background:#1d4ed8;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><svg width=\\"18\\" height=\\"18\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"#fff\\" stroke-width=\\"2\\"><path d=\\"M12 2L19 21l-7-4-7 4L12 2z\\"/></svg></div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    var deliveryIcon = L.divIcon({
      className: 'delivery-marker',
      html: '<div style="width:32px;height:32px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><svg width=\\"16\\" height=\\"16\\" viewBox=\\"0 0 24 24\\" fill=\\"#fff\\"><path d=\\"M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z\\"/></svg></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    var driverMarker = null;
    var deliveryMarker = null;
    var routeLine = null;

    function updateMarkers(data) {
      // Delivery marker (always shown)
      if (data.delivery && data.delivery.lat) {
        if (!deliveryMarker) {
          deliveryMarker = L.marker([data.delivery.lat, data.delivery.lng], { icon: deliveryIcon })
            .addTo(map)
            .bindPopup('Delivery Location');
        } else {
          deliveryMarker.setLatLng([data.delivery.lat, data.delivery.lng]);
        }
      }

      // Driver marker (only when driver exists)
      if (data.driver && data.driver.lat) {
        if (!driverMarker) {
          driverMarker = L.marker([data.driver.lat, data.driver.lng], { icon: driverIcon })
            .addTo(map)
            .bindPopup(data.driver.name || 'Driver');
        } else {
          driverMarker.setLatLng([data.driver.lat, data.driver.lng]);
        }

        // Rotate driver icon based on heading
        if (data.driver.heading !== null && data.driver.heading !== undefined) {
          var el = driverMarker.getElement();
          if (el) {
            el.style.transform = el.style.transform.replace(/rotate\\([^)]*\\)/, '') + ' rotate(' + data.driver.heading + 'deg)';
          }
        }

        // Draw route line
        if (deliveryMarker) {
          var pts = [
            [data.driver.lat, data.driver.lng],
            [data.delivery.lat, data.delivery.lng],
          ];
          if (routeLine) {
            routeLine.setLatLngs(pts);
          } else {
            routeLine = L.polyline(pts, {
              color: '#1d4ed8',
              weight: 3,
              opacity: 0.6,
              dashArray: '10,8',
            }).addTo(map);
          }

          // Fit bounds to show both markers
          var bounds = L.latLngBounds(pts);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      } else {
        // No driver — center on delivery
        if (data.delivery && data.delivery.lat) {
          map.setView([data.delivery.lat, data.delivery.lng], 15);
        }
      }
    }

    // Initial markers
    updateMarkers({
      driver: ${driver ? JSON.stringify({ lat: driver.location.lat, lng: driver.location.lng, heading: driver.location.heading, name: driver.name }) : "null"},
      delivery: { lat: ${delivery.lat || 0}, lng: ${delivery.lng || 0} },
    });

    // Listen for updates from React Native
    window.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'UPDATE_MARKERS') {
          updateMarkers(data);
        }
      } catch(e) {}
    });
    document.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'UPDATE_MARKERS') {
          updateMarkers(data);
        }
      } catch(e) {}
    });

    // Signal that map is ready
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
  </script>
</body>
</html>
  `.trim();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <WebView
        ref={webRef}
        source={{ html }}
        style={styles.webView}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        javaScriptEnabled
        originWhitelist={["*"]}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "MAP_READY") {
              setMapReady(true);
            }
          } catch { }
        }}
      />
      {!mapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={Colors.primary900} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 350,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  compact: {
    height: 250,
    borderRadius: 12,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f9f9f9",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.neutralGray,
  },
});
