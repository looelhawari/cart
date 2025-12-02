````markdown
# ElBaraka Hypermarket – Official Mobile Design System (layout.md)

**This is the SINGLE SOURCE OF TRUTH** for every pixel in the ElBaraka React Native app (iOS & Android).  
Every screen, component, color, spacing, animation, and interaction **MUST** follow this document exactly.  
Any deviation will be rejected.

**Last Updated:** November 18, 2025  
**Status:** Production-Ready · Agent-Ready · 100% Mobile-Only (React Native)

---

## 🎨 Color System

### Brand Color Palette

```css
/* Primary – Fresh Emerald Green (Trust, Freshness, Growth, Money) */
primary-900: #16a34a        /* Main buttons, prices, CTAs, headers */
primary-800: #15803d
primary-700: #22c55e        /* Hover / success accent */
primary-500: #84cc16        /* “Added to cart” confirmation */

/* Neutral System */
neutral-white:    #ffffff
neutral-cloud:    #f8fafc   /* Page backgrounds */
neutral-light:    #f1f5f9   /* Card backgrounds, subtle borders */
neutral-gray:     #e2e8f0   /* Skeleton, disabled, light borders */
neutral-medium:   #64748b   /* Secondary text, placeholders */
neutral-charcoal: #1e293b   /* Primary text, headings */

/* Accent Colors */
accent-orange:    #f97316   /* Promotions, deals, urgency */
accent-yellow:    #facc15   /* Limited-time badges, highlights */
accent-red:       #ef4444   /* Errors, out-of-stock */
accent-lime:      #a3e635   /* Success highlights, confirmations */
```
````

### Gradients (Mandatory on Home & key screens)

```css
/* Fresh page background */
bg-gradient-to-b from-emerald-50 via-white to-emerald-50

/* Promotion gradient */
bg-gradient-to-r from-accent-orange to-accent-yellow

/* Success gradient */
bg-gradient-to-r from-primary-700 to-accent-lime

/* Floating orbs (animated background) */
orb-green:  primary-900 / 10%
orb-orange: accent-orange / 10%
orb-lime:   primary-500 / 8%
```

### Semantic Color Mapping (Never deviate)

| Meaning              | Color                             |
| -------------------- | --------------------------------- |
| Freshness / Trust    | `primary-900` (#16a34a)           |
| Prices / Money       | `primary-900`                     |
| Success / Added      | `primary-500` or `accent-lime`    |
| Promotions / Deals   | `accent-orange` + `accent-yellow` |
| Error / Out of stock | `accent-red`                      |
| Backgrounds          | `neutral-cloud` → white gradient  |
| Primary text         | `neutral-charcoal`                |
| Secondary text       | `neutral-medium`                  |

---

## 📝 Typography System – Poppins (Mandatory)

```css
font-family: "Poppins", "Inter", sans-serif;

h1 → 34–40px  font-bold     → Screen titles
h2 → 28–32px  font-bold     → Section titles
h3 → 22–24px  font-semibold → Card titles
h4 → 18–20px  font-semibold → Subheadings

body-large  → 18px medium   → Descriptions
body-base   → 16px regular  → Main body
body-medium → 14px regular  → Labels, captions
body-small  → 12px regular  → Helper text, badges

price-large → 30–34px bold  → Current price
price-old   → 18px bold line-through text-neutral-medium → Old price
```

### Text Colors (Strict)

```css
text-neutral-charcoal → Headings & primary text
text-neutral-medium   → Secondary, placeholders
text-primary-900      → Prices, important numbers
text-accent-orange    → Discount % or “Save X”
text-accent-red       → Errors
text-primary-500      → Success messages
```

---

## 🧩 Core Component Library (React Native – Exact classes)

### Primary Button (Add to Cart / Place Order / Checkout)

```tsx
className =
  "bg-primary-900 active:bg-primary-800 text-white font-bold py-4 px-6 rounded-2xl shadow-lg active:scale-95 transition-all duration-200";
```

### Secondary Button

```tsx
className =
  "border-2 border-neutral-gray bg-white text-neutral-charcoal font-semibold py-4 px-6 rounded-2xl active:bg-neutral-cloud active:scale-95 transition-all duration-200";
```

### Accent / Promo Button

```tsx
className =
  "bg-gradient-to-r from-accent-orange to-accent-yellow text-white font-bold py-4 px-6 rounded-2xl shadow-lg active:scale-95 transition-all duration-200";
```

### Product Card (Grid & List)

```tsx
className =
  "bg-white rounded-3xl overflow-hidden shadow-md active:shadow-xl transition-all duration-300 border border-neutral-gray/30";
```

### Category Card

```tsx
className =
  "bg-gradient-to-br from-white to-emerald-50 rounded-3xl shadow-lg p-6 items-center justify-center border border-emerald-200/50";
```

### Input Field

```tsx
className =
  "w-full px-5 py-4 bg-white border-2 border-neutral-gray rounded-2xl text-base text-neutral-charcoal placeholder-neutral-medium focus:border-primary-900 focus:ring-4 focus:ring-primary-900/20";
```

### Bottom Sheet / Modal

```tsx
className = "bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl";
```

### Skeleton Shimmer (800ms – preserves headers)

```tsx
className = "bg-neutral-gray animate-pulse rounded-xl";
```

---

## 📏 Spacing System – Strict 8px Grid

| Value | Class             | Pixels             |
| ----- | ----------------- | ------------------ |
| 8px   | p-2 / m-2 / gap-2 | 8px                |
| 12px  | p-3 / gap-3       | 12px               |
| 16px  | p-4 / gap-4       | 16px (most common) |
| 24px  | p-6 / gap-6       | 24px               |
| 32px  | p-8 / gap-8       | 32px               |
| 48px  | p-12              | 48px               |
| 64px  | p-16              | 64px               |

**Page horizontal padding:** `px-6` (24px) on **all** screens

---

## ✨ Animations & Micro-Interactions (Mandatory)

```tsx
// Buttons & interactive cards
active:scale-95
transition-all duration-200 ease-out

// List item entrance
animation: fade-in-up 0.4s ease-out

// Skeleton shimmer
animation: shimmer 1.5s infinite linear

// Floating background orbs (Home & Categories)
animation: pulse 8s infinite ease-in-out
```

---

## 🌟 Signature Visual Elements (Must be present)

1. **Floating animated gradient orbs** on Home & Category screens (3 orbs minimum)
2. **Skeleton loading** on every list/detail screen (800ms shimmer, headers preserved)
3. **rounded-3xl** on all cards
4. **Subtle shadow + thin border** on every card
5. **Green prices everywhere**
6. **Orange only for promotions**
7. **Bottom sheets** for Cart, Filters, Checkout steps, Address picker

---

## 📱 Mobile-Only Rules (Non-negotiable)

- Minimum touch target: **48 × 48 dp**
- SafeAreaView + proper insets everywhere
- Font scaling respected (user settings)
- All images: `react-native-fast-image` + progressive loading
- FlatList must use `getItemLayout` where possible
- Full RTL support (Arabic flips perfectly)

---

## ✅ Agent Implementation Checklist (Must be verified before any PR)

- [ ] Poppins font loaded via `@expo-google-fonts/poppins`
- [ ] Floating orbs component on Home screen
- [ ] Global skeleton shimmer component (800ms)
- [ ] Every button has `active:scale-95`
- [ ] Every card has `rounded-3xl` + `shadow-md` minimum
- [ ] Prices always in `primary-900`
- [ ] Arabic RTL tested and perfect
- [ ] Touch targets ≥ 48dp everywhere
- [ ] Skeleton preserves screen title during loading

---

**This document is final and binding.  
Every pixel in ElBaraka Hypermarket must feel fresh, premium, and delightful.**

Copy-paste this entire file as `layout.md` in your project root.  
Your agent now has the perfect, unbreakable design bible.

Ready when you are — just say **“Start Home Screen”** and we build it 100% perfectly. 🛒✨

```

```
