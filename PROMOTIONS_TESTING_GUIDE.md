# Quick Testing Guide - Promotions System

## Prerequisites
1. Backend server running with promotion APIs
2. At least 1 active promotion in database
3. Mobile app running in Expo Go

## Test Flow

### 1. Homepage Hero Banner
```
Open app → Scroll to hero banner section
```
**Expected:**
- Banner shows with promotion image
- Auto-scrolls if multiple promotions (every 5s)
- Pagination dots visible
- "View All Offers →" button visible

**Actions:**
- Tap on promotion → Should navigate to details
- Tap "View All Offers" → Should navigate to offers tab

---

### 2. Offers Tab
```
Navigate to Offers tab (bottom navigation)
```
**Expected:**
- "Special Offers" header
- Filter buttons: All Offers, Category Sales, Product Deals
- List of promotions (horizontal cards)

**Actions:**
- Tap each filter → List updates
- Pull down → Refreshes
- Tap any promotion card → Navigate to details

---

### 3. Promotion Details
```
Tap any promotion from offers list or hero banner
```
**Expected:**
- Large promotion image at top
- Back button (top left)
- Featured badge (if featured)
- Discount badge (red, with correct text)
- Countdown timer (if has end_date)
- Promotion title & description
- Info card with type/min/max amounts
- Terms & conditions (if exists)
- Product list (if type = 'product')

**Actions:**
- Scroll down → See all content
- Wait 1 second → Timer updates
- Tap back → Return to previous screen
- Tap product (if shown) → Navigate to product details

---

### 4. Product Cards with Sale Badges
```
Go to Homepage → Scroll to products section
```
**Expected:**
- Products with discounts show red badge (top-right)
- Badge shows percentage: "-25%"
- Badge has shadow for visibility

---

## Quick API Test (Optional)

### Check Backend APIs
```bash
# Get all promotions
curl http://your-backend/api/v1/promotions

# Get featured promotion
curl http://your-backend/api/v1/promotions/featured

# Get specific promotion
curl http://your-backend/api/v1/promotions/1

# Get promotion products
curl http://your-backend/api/v1/promotions/1/products
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Summer Sale",
    "discount_type": "percentage",
    "discount_percentage": 30,
    ...
  }
}
```

---

## Common Issues & Fixes

### Hero Banner Not Showing
**Cause:** No promotions in database
**Fix:** Add promotions via admin dashboard

### "No Active Offers" Message
**Cause:** All promotions are expired or not started
**Fix:** Check `start_date` and `end_date` in database

### Images Not Loading
**Cause:** Invalid image URLs or CORS
**Fix:** Check `image_url` in database, ensure accessible

### Timer Not Counting Down
**Cause:** Invalid `end_date` format
**Fix:** Ensure end_date is ISO string: "2024-12-31T23:59:59Z"

### Products Not Showing in Promotion Details
**Cause:** Promotion type is not 'product'
**Fix:** Only product promotions show product list

---

## Manual Test Cases

### Test 1: Countdown Timer
1. Create promotion ending in 2 minutes
2. Open promotion details
3. Watch timer count down
4. Wait for expiration
**Expected:** Timer shows 0:00:00 and disappears

### Test 2: Featured Promotion
1. Set promotion as featured in admin
2. Open mobile app homepage
3. Check hero banner
**Expected:** Featured promotion shows with ⭐ badge

### Test 3: Filters
1. Create promotions of different types (all, category, product)
2. Go to Offers tab
3. Tap each filter
**Expected:** Only matching promotions show

### Test 4: Pull to Refresh
1. Go to Offers tab
2. Pull down list
3. Release
**Expected:** Loading indicator → List refreshes

### Test 5: Pagination
1. Create promotion with 20+ products
2. Open promotion details
3. Scroll to bottom of product list
**Expected:** More products load automatically

---

## Performance Checks

- [ ] Homepage loads in < 2 seconds
- [ ] Hero banner images load quickly
- [ ] No lag when scrolling offers list
- [ ] Smooth countdown timer (no jank)
- [ ] Fast navigation between screens

---

## Accessibility Checks

- [ ] All text readable on white/dark backgrounds
- [ ] Buttons have adequate touch targets (44x44dp)
- [ ] Images have fallbacks if failed to load
- [ ] Error messages are user-friendly

---

## Ready for Production Checklist

- [ ] All test cases pass
- [ ] No console errors
- [ ] Images load correctly
- [ ] Navigation works smoothly
- [ ] Timers count down accurately
- [ ] Pull-to-refresh works
- [ ] Empty states display
- [ ] Loading states display
- [ ] Error handling works
- [ ] Admin can manage promotions

---

## Next Steps After Testing

1. **If all tests pass:** Deploy to production
2. **If issues found:** Review error logs, fix issues
3. **For enhancements:** See Phase 2 in main documentation

---

## Support

For issues, check:
1. Console logs (Expo terminal)
2. Network tab (API responses)
3. Backend logs (Laravel)
4. Database (promotions table)
