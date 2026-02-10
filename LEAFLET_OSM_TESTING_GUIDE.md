# Leaflet.js + OpenStreetMap Migration - Complete Testing Guide

**Branch:** `feature/leaflet-osm-migration`  
**Migration:** Mapbox + Google Maps → Leaflet + OpenStreetMap (100% free)

---

## 🎯 Testing Overview

| Component | Technology | What to Test |
|-----------|-----------|--------------|
| **Admin Dashboard** | Leaflet.js + leaflet-draw | Zone creation, editing, polygon drawing, layer switching |
| **Mobile App** | Leaflet WebView + Nominatim | Address picking, search, reverse geocoding, zone detection |
| **Backend API** | Nominatim Geocoding | Forward/reverse geocoding, caching, rate limiting |

---

## 📋 Pre-Testing Setup

### 1. Start Backend Server
```bash
cd D:\elbarakkaaaaa\unibackend
php artisan serve
# Running at http://127.0.0.1:8000
```

### 2. Start Admin Dashboard
```bash
cd "D:\elbarakkaaaaa\admindash frontend"
npm run dev
# Running at http://localhost:5173
```

### 3. Start Mobile App
```bash
cd D:\elbarakkaaaaa\frontend
npx expo start
# Press 'a' for Android emulator
# Press 'i' for iOS simulator
# Or scan QR code with Expo Go app
```

### 4. Verify No Errors in Console
- Open browser DevTools (F12) for admin dashboard
- Check for any Leaflet or map-related errors
- Mobile: Use `adb logcat` (Android) or Xcode Console (iOS)

---

## 🗺️ ADMIN DASHBOARD TESTING

### Test 1: Map Initialization
**Location:** Admin Dashboard → Delivery Zones page

✅ **Checklist:**
- [ ] Map loads without errors
- [ ] Default view shows OSM street tiles
- [ ] Map is centered on a default location (Cairo, Egypt)
- [ ] Zoom controls (+/-) are visible in top-left
- [ ] Scale indicator is visible in bottom-left
- [ ] No "Mapbox token required" errors in console
- [ ] No 404 errors for tile images

**Expected:** Clean map with OpenStreetMap tiles, smooth zooming/panning

---

### Test 2: Layer Switching
**Location:** Map → Top-right layer control

✅ **Checklist:**
- [ ] Click the layers icon (stacked squares) in top-right
- [ ] See two options: "Street" and "Satellite"
- [ ] Switch to "Satellite" → Esri World Imagery loads
- [ ] Switch back to "Street" → OSM tiles load
- [ ] Tiles load quickly (cached after first load)
- [ ] No broken tile images

**Expected:** Instant switching between street/satellite views

---

### Test 3: Drawing New Zone (Polygon)
**Location:** Delivery Zones → "Create New Zone" button

✅ **Checklist:**
- [ ] Click "Create New Zone" button
- [ ] Form opens on left sidebar
- [ ] Enter zone name: "Test Zone Cairo"
- [ ] Set delivery fee: 25 EGP
- [ ] Set minimum order: 100 EGP
- [ ] Click "Start Drawing" button
- [ ] Cursor changes to crosshair
- [ ] Click multiple points on map to create polygon (at least 3 points)
- [ ] Double-click to finish polygon
- [ ] Polygon appears with blue fill and stroke
- [ ] Coordinates populate in form
- [ ] Click "Create Zone" button
- [ ] Success toast appears
- [ ] Zone appears in zones list

**Expected:** Smooth polygon drawing, zone saved to database, appears in list

---

### Test 4: Editing Existing Zone
**Location:** Zones list → Click zone card → Edit

✅ **Checklist:**
- [ ] Click on a zone in the list
- [ ] Zone highlights on map
- [ ] Click "Edit Zone" button
- [ ] Form populates with current data
- [ ] Update name: "Test Zone Cairo Updated"
- [ ] Update delivery fee: 30 EGP
- [ ] Click "Edit Polygon" button
- [ ] Polygon becomes editable (draggable vertices)
- [ ] Drag vertices to new positions
- [ ] Click "Save Changes"
- [ ] Updated polygon saves
- [ ] Click "Update Zone"
- [ ] Success toast appears
- [ ] Changes reflect immediately

**Expected:** Zone edits persist, polygon reshapes correctly

---

### Test 5: Deleting Zone
**Location:** Zone details → Delete button

✅ **Checklist:**
- [ ] Select a zone
- [ ] Click "Delete Zone" button
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Zone removed from list
- [ ] Polygon removed from map
- [ ] Success toast appears

**Expected:** Zone deleted from database and UI

---

### Test 6: Zone Hover & Click Interactions
**Location:** Map polygons

✅ **Checklist:**
- [ ] Hover over a zone polygon
- [ ] Polygon opacity increases (highlight effect)
- [ ] Popup appears with zone name + delivery fee
- [ ] Move mouse away → highlight disappears
- [ ] Click polygon → zone selected in sidebar
- [ ] Zone details appear in right panel

**Expected:** Interactive polygons with visual feedback

---

### Test 7: Multiple Zones Display
**Location:** Map with 3+ zones

✅ **Checklist:**
- [ ] Create 3-5 zones in different areas
- [ ] All zones render simultaneously
- [ ] No overlap rendering issues
- [ ] Each zone has different color (if implemented)
- [ ] All zones respond to hover/click
- [ ] Performance remains smooth

**Expected:** Multiple zones render correctly without performance degradation

---

### Test 8: Zone Search/Filter
**Location:** Zones list search bar

✅ **Checklist:**
- [ ] Type zone name in search bar
- [ ] List filters in real-time
- [ ] Matching zones remain visible
- [ ] Non-matching zones hide
- [ ] Clear search → all zones reappear

**Expected:** Fast client-side filtering

---

### Test 9: Map Performance
**Location:** Full page with many zones

✅ **Checklist:**
- [ ] Create 10+ zones
- [ ] Zoom in/out rapidly
- [ ] Pan across map
- [ ] Switch layers multiple times
- [ ] No lag or freezing
- [ ] CPU usage reasonable (check Task Manager)
- [ ] Memory stable (no leaks)

**Expected:** Smooth performance even with many zones

---

### Test 10: Browser Compatibility (Admin)
**Test in:** Chrome, Firefox, Safari, Edge

✅ **Checklist:**
- [ ] Chrome: Map loads, drawing works
- [ ] Firefox: Map loads, drawing works
- [ ] Safari: Map loads, drawing works
- [ ] Edge: Map loads, drawing works
- [ ] Mobile browser: Touch drawing works

**Expected:** Consistent behavior across browsers

---

## 📱 MOBILE APP TESTING

### Test 11: Address Picker - Initial Load
**Location:** Profile → Addresses → Add New Address → Pick Location

✅ **Checklist:**
- [ ] Click "Pick Location on Map" button
- [ ] Full-screen map opens
- [ ] Map loads OSM tiles (not Mapbox)
- [ ] Red marker appears at map center
- [ ] GPS button is visible (top-right)
- [ ] Close button (X) is visible
- [ ] No errors in console/logcat

**Expected:** Map loads instantly with clean OSM tiles

---

### Test 12: GPS Location (Mobile)
**Location:** Map picker → GPS button

✅ **Checklist:**
- [ ] Click GPS button (location icon)
- [ ] Permission prompt appears (if first time)
- [ ] Grant location permission
- [ ] Map centers on current GPS coordinates
- [ ] Marker moves to user's location
- [ ] Address appears in bottom panel
- [ ] "Use This Location" button enabled

**Expected:** Accurate GPS positioning, address auto-populated

---

### Test 13: Map Pan & Reverse Geocoding
**Location:** Map picker → Drag map

✅ **Checklist:**
- [ ] Drag map to new position
- [ ] Marker stays centered (fixed to viewport center)
- [ ] After map settles (~500ms), address updates
- [ ] Bottom panel shows new address
- [ ] Address includes: street, area, city
- [ ] No "Mapbox geocoding failed" errors
- [ ] Nominatim API calls are logged (check network tab)

**Expected:** Real-time reverse geocoding as you pan

---

### Test 14: Address Search (Forward Geocoding)
**Location:** Map picker → Search bar at top

✅ **Checklist:**
- [ ] Tap search bar
- [ ] Type: "Tahrir Square, Cairo"
- [ ] Wait for autocomplete suggestions
- [ ] See list of matching addresses
- [ ] Tap a suggestion
- [ ] Map flies to that location
- [ ] Marker updates
- [ ] Address populates in bottom panel

**Expected:** Fast search with Nominatim autocomplete (1-2 second delay)

---

### Test 15: Zone Detection
**Location:** Map picker → Pan to delivery zone

✅ **Checklist:**
- [ ] Pan map to a location INSIDE a delivery zone
- [ ] Bottom panel shows zone info:
  - ✅ "Delivery available"
  - Zone name (e.g., "Downtown Cairo")
  - Delivery fee (e.g., "25 EGP")
- [ ] Pan to location OUTSIDE all zones
- [ ] Bottom panel shows:
  - ❌ "Outside delivery area"
  - No zone name or fee
- [ ] "Use This Location" button disabled for out-of-zone

**Expected:** Real-time zone detection as you move the map

---

### Test 16: Select & Save Address
**Location:** Map picker → Confirm selection

✅ **Checklist:**
- [ ] Pick a location inside a delivery zone
- [ ] Verify address appears in bottom panel
- [ ] Verify zone name + fee appears
- [ ] Tap "Use This Location" button
- [ ] Map closes
- [ ] Address form auto-fills:
  - Street field
  - Area field
  - City field
  - Latitude/Longitude (hidden)
  - Zone name (hidden)
- [ ] Complete form and save
- [ ] Address saved with correct coordinates

**Expected:** Seamless address selection and form population

---

### Test 17: Mobile Performance
**Location:** Map picker on real device

✅ **Checklist:**
- [ ] Open map picker on physical Android/iOS device
- [ ] Tiles load within 2-3 seconds
- [ ] Smooth pan/zoom (60 FPS)
- [ ] No lag when dragging map
- [ ] Reverse geocoding completes in 1-2 seconds
- [ ] Battery drain reasonable (use for 5 minutes)
- [ ] Check data usage (OSM tiles ~50KB each)

**Expected:** Smooth experience on mid-range device (4-core, 4GB RAM)

---

### Test 18: Offline Behavior (Mobile)
**Location:** Map picker with no internet

✅ **Checklist:**
- [ ] Disable WiFi/mobile data
- [ ] Open map picker
- [ ] Cached tiles appear (if previously visited)
- [ ] New areas show gray tiles with error icon
- [ ] Reverse geocoding fails gracefully
- [ ] Error message: "No internet connection"
- [ ] GPS still works (location-only)
- [ ] Enable internet → tiles/geocoding resume

**Expected:** Graceful degradation, clear error messages

---

### Test 19: iOS vs Android Consistency
**Test on:** Android emulator + iOS simulator

✅ **Checklist:**
- [ ] Android: Map picker opens, tiles load
- [ ] iOS: Map picker opens, tiles load
- [ ] Both: WebView renders Leaflet correctly
- [ ] Both: Marker stays centered
- [ ] Both: GPS button works
- [ ] Both: Search works
- [ ] Both: Touch gestures (pinch zoom) work
- [ ] No platform-specific bugs

**Expected:** Identical behavior on both platforms

---

## 🌐 BACKEND API TESTING

### Test 20: Reverse Geocoding API (Nominatim)
**Location:** Test with cURL/Postman

```bash
# Test Laravel route (uses Nominatim internally)
curl http://127.0.0.1:8000/api/v1/geocode/reverse?lat=30.0444&lng=31.2357
```

✅ **Checklist:**
- [ ] Status: 200 OK
- [ ] Response includes `formatted_address`
- [ ] Response includes `components` (street, city, governorate)
- [ ] No Google Maps API references
- [ ] Check logs: Nominatim URL logged
- [ ] Second call is faster (caching works)
- [ ] Cache key in Redis/file: `geocode:reverse:30.0444:31.2357`

**Expected Response:**
```json
{
  "formatted_address": "Tahrir Square, Abdeen, Cairo, Egypt",
  "components": {
    "street": "Tahrir Square",
    "neighborhood": "Abdeen",
    "city": "Cairo",
    "governorate": "Cairo",
    "country": "Egypt"
  }
}
```

---

### Test 21: Forward Geocoding API (Nominatim)
**Location:** Test with cURL/Postman

```bash
curl "http://127.0.0.1:8000/api/v1/geocode/forward?address=Tahrir+Square+Cairo"
```

✅ **Checklist:**
- [ ] Status: 200 OK
- [ ] Response includes `latitude` and `longitude`
- [ ] Response includes `formatted_address`
- [ ] Coordinates are accurate (check on map)
- [ ] No Google Maps API key errors
- [ ] Subsequent calls use cache (faster response)

**Expected Response:**
```json
{
  "latitude": 30.0444,
  "longitude": 31.2357,
  "formatted_address": "Tahrir Square, Cairo, Egypt"
}
```

---

### Test 22: Zone Detection API
**Location:** Test with coordinates

```bash
# Inside zone
curl "http://127.0.0.1:8000/api/v1/delivery-zones/check?lat=30.0444&lng=31.2357"

# Outside zone
curl "http://127.0.0.1:8000/api/v1/delivery-zones/check?lat=29.0000&lng=31.0000"
```

✅ **Checklist:**
- [ ] Inside zone: Returns zone details + delivery fee
- [ ] Outside zone: Returns `zone: null`
- [ ] Response includes `serviceable: true/false`
- [ ] Ray-casting algorithm works correctly
- [ ] Edge case: Coordinates on polygon border handled

**Expected Inside:**
```json
{
  "serviceable": true,
  "zone": {
    "id": 1,
    "name": "Downtown Cairo",
    "delivery_fee": 25
  }
}
```

---

### Test 23: Nominatim Rate Limiting
**Location:** Make 100+ rapid requests

```bash
for i in {1..100}; do
  curl -s "http://127.0.0.1:8000/api/v1/geocode/reverse?lat=30.$i&lng=31.$i"
done
```

✅ **Checklist:**
- [ ] First request hits Nominatim (slow, ~500ms)
- [ ] Subsequent identical requests use cache (fast, ~10ms)
- [ ] No 429 Too Many Requests errors from Nominatim
- [ ] Cache TTL is 24 hours (check `cache:list`)
- [ ] If rate limited, error logged but not crashes
- [ ] User-Agent header sent: `ElBaraka-App/1.0`

**Expected:** Caching protects from rate limits (Nominatim allows ~1 req/sec)

---

### Test 24: Nominatim User-Agent Compliance
**Location:** Check HTTP headers in logs

```bash
# Enable HTTP logging in Laravel
tail -f storage/logs/laravel.log | grep "User-Agent"
```

✅ **Checklist:**
- [ ] All Nominatim requests include `User-Agent: ElBaraka-App/1.0`
- [ ] No requests with default PHP User-Agent
- [ ] Nominatim doesn't block requests (no 403 Forbidden)

**Expected:** Compliant with Nominatim usage policy

---

### Test 25: Geocoding Error Handling
**Location:** Test with invalid data

```bash
# Invalid coordinates (middle of ocean)
curl "http://127.0.0.1:8000/api/v1/geocode/reverse?lat=0&lng=0"

# Invalid address
curl "http://127.0.0.1:8000/api/v1/geocode/forward?address=xyz123invalid"
```

✅ **Checklist:**
- [ ] Invalid coordinates: Returns null or empty address
- [ ] Invalid address: Returns `null` or 404
- [ ] No 500 Internal Server Error
- [ ] Errors logged in `storage/logs/laravel.log`
- [ ] User-friendly error messages

**Expected:** Graceful failures, no crashes

---

### Test 26: Database Integrity
**Location:** Check zone coordinates in DB

```bash
cd D:\elbarakkaaaaa\unibackend
php artisan tinker
```

```php
// Test in tinker
$zone = App\Models\DeliveryZone::first();
$zone->coordinates; // Should return array of lat/lng pairs
$zone->delivery_fee; // Should be decimal
```

✅ **Checklist:**
- [ ] `delivery_zones` table has records
- [ ] `delivery_zone_coordinates` table has coordinate rows
- [ ] Coordinates are valid (lat: -90 to 90, lng: -180 to 180)
- [ ] Foreign keys intact (`zone_id` references exist)
- [ ] Polygon order preserved (first = last for closed polygon)

**Expected:** Clean relational data

---

## 🧪 EDGE CASES & STRESS TESTING

### Test 27: Large Polygon (100+ Points)
**Location:** Admin dashboard drawing

✅ **Checklist:**
- [ ] Draw polygon with 100+ vertices
- [ ] Polygon renders without lag
- [ ] Save to database succeeds
- [ ] Load from database succeeds
- [ ] Edit mode handles 100+ draggable vertices
- [ ] Zone detection still fast (<100ms)

**Expected:** Handles complex polygons

---

### Test 28: Overlapping Zones
**Location:** Create 2 zones with overlap

✅ **Checklist:**
- [ ] Create Zone A covering area X
- [ ] Create Zone B partially overlapping Zone A
- [ ] Both zones render on map
- [ ] Point in overlap: API returns FIRST matching zone
- [ ] Admin can select either zone by clicking
- [ ] No rendering glitches

**Expected:** Overlaps handled, first match wins

---

### Test 29: Empty Zones List
**Location:** Fresh database

✅ **Checklist:**
- [ ] Delete all zones from database
- [ ] Admin page loads without errors
- [ ] Map renders but no polygons
- [ ] "No zones yet" message appears
- [ ] Create first zone works

**Expected:** Graceful empty state

---

### Test 30: Very Slow Internet (Mobile)
**Location:** Throttle connection in DevTools

✅ **Checklist:**
- [ ] Enable "Slow 3G" throttling
- [ ] Open map picker
- [ ] Tiles load progressively (low-res first)
- [ ] Loading spinner shows while geocoding
- [ ] User can still interact (pan/zoom)
- [ ] No timeout errors (<30 seconds)

**Expected:** Acceptable UX on slow connections

---

### Test 31: Production Environment
**Location:** After deployment (if ready)

✅ **Checklist:**
- [ ] Admin dashboard on production domain
- [ ] Mobile app on TestFlight/Google Play internal test
- [ ] HTTPS enabled (not HTTP)
- [ ] OSM tiles load (no mixed content errors)
- [ ] Nominatim accessible from production server
- [ ] Cache works in production (Redis/Memcached)
- [ ] No hardcoded localhost URLs

**Expected:** Works identically to development

---

## 🔍 VERIFICATION CHECKLIST

### Code Verification
- [ ] No `mapbox` imports in any file
- [ ] No `MAPBOX_TOKEN` in any config
- [ ] No `Google Maps API key` in `.env`
- [ ] All map references use Leaflet
- [ ] No hardcoded API keys in code

```bash
# Run these searches - should return 0 results:
cd D:\elbarakkaaaaa
grep -r "mapbox" --include="*.tsx" --include="*.ts" --include="*.php"
grep -r "GOOGLE_MAPS_API_KEY" --include="*.php" --include="*.env"
```

---

### Performance Verification
- [ ] Admin page loads in <3 seconds
- [ ] Mobile map picker opens in <2 seconds
- [ ] Reverse geocoding completes in <2 seconds
- [ ] Zone detection completes in <500ms
- [ ] No memory leaks after 10 minutes usage
- [ ] CPU usage <50% on 4-core device

---

### Cost Verification
- [ ] Zero API key costs (no Mapbox subscription)
- [ ] Zero Google Maps API costs
- [ ] Nominatim: Free (public server or self-hosted)
- [ ] OSM tiles: Free (CDN bandwidth only)
- [ ] Esri satellite: Free (usage policy compliant)

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue 1: Tiles Not Loading
**Symptoms:** Gray tiles with error icon

**Solutions:**
1. Check internet connection
2. Open DevTools → Network tab → Filter XHR
3. Look for 404 errors on tile URLs
4. Verify tile URL in code: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
5. Check CORS errors (should be none for OSM)
6. Try different tile server (e.g., `https://a.tile.openstreetmap.org/...`)

---

### Issue 2: Marker Icon Not Showing
**Symptoms:** Blue box instead of marker icon

**Solution:** Leaflet bundler icon fix already applied in code:
```typescript
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
```

---

### Issue 3: Nominatim Rate Limited (429)
**Symptoms:** Geocoding fails after many requests

**Solutions:**
1. Check caching: `php artisan cache:clear` then verify cache writes
2. Increase cache TTL (currently 24 hours)
3. Self-host Nominatim:
   ```bash
   docker run -p 8080:8080 mediagis/nominatim:4.2
   ```
4. Switch to paid geocoding service (Mapbox, HERE, etc.)

---

### Issue 4: Zone Detection Inaccurate
**Symptoms:** Point inside zone shows "outside delivery area"

**Solutions:**
1. Check polygon coordinate order (must be counter-clockwise or consistent)
2. Verify first coordinate equals last coordinate (closed polygon)
3. Test ray-casting algorithm in isolation:
   ```php
   php artisan tinker
   $geoHelper = new App\Services\GeoHelper();
   $geoHelper->findZone(30.0444, 31.2357);
   ```
4. Log polygon coordinates and test point

---

### Issue 5: Mobile WebView Blank
**Symptoms:** Map picker shows white screen

**Solutions:**
1. Check React Native logs: `npx react-native log-android`
2. Verify WebView HTML string is valid
3. Check for JavaScript errors in WebView console
4. Test HTML in standalone browser first
5. Verify `originWhitelist={['*']}` prop on WebView

---

## 📊 SUCCESS CRITERIA

### ✅ Migration is successful if:
1. **Zero API keys required** (no Mapbox, no Google Maps)
2. **All zone CRUD works** (create, read, update, delete zones)
3. **Polygon drawing works** (admin can draw and edit zones)
4. **Address picking works** (mobile users can select location)
5. **Geocoding works** (coordinates ↔ addresses via Nominatim)
6. **Zone detection works** (correct zone identification)
7. **Performance acceptable** (map loads <3s, geocoding <2s)
8. **No errors in console** (clean logs, no 404s or 500s)
9. **Cross-platform consistent** (Chrome, Firefox, Safari, iOS, Android)
10. **Cost = $0/month** (self-hosted or free tier only)

---

## 🚀 NEXT STEPS AFTER TESTING

### If All Tests Pass:
1. **Merge to main:**
   ```bash
   git checkout main
   git merge feature/leaflet-osm-migration
   git push origin main
   ```

2. **Update production:**
   - Deploy admin dashboard
   - Release mobile app update
   - Update backend services config
   - Monitor error logs for 24 hours

3. **Documentation:**
   - Update README with Leaflet info
   - Remove Mapbox setup instructions
   - Add Nominatim setup guide (optional self-hosting)

### If Tests Fail:
1. Document failures in GitHub issue
2. Fix bugs on `feature/leaflet-osm-migration` branch
3. Re-test until all scenarios pass
4. Iterate until success criteria met

---

## 📞 SUPPORT

**Documentation:**
- [Leaflet.js Docs](https://leafletjs.com/reference.html)
- [Leaflet Draw Docs](https://leaflet.github.io/Leaflet.draw/docs/leaflet-draw-latest.html)
- [Nominatim API Docs](https://nominatim.org/release-docs/latest/api/Overview/)
- [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)

**Troubleshooting:**
- Check `storage/logs/laravel.log` for backend errors
- Check browser console (F12) for frontend errors
- Check `adb logcat` for Android errors
- Check Xcode console for iOS errors

---

**Testing Status:** Ready ✅  
**Estimated Test Time:** 2-3 hours for full coverage  
**Priority Tests:** 1-5 (Admin), 11-16 (Mobile), 20-22 (Backend)
