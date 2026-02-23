# 🌍 Admin Dashboard Internationalization (i18n) Guide

## Overview

Full internationalization support has been added to the ElBaraka Admin Dashboard with:
- **English (en)** - Left-to-Right (LTR)
- **Arabic (ar)** - Right-to-Left (RTL)

## What's Implemented

### 1. Core i18n Setup
- **i18next** - Core translation library
- **react-i18next** - React bindings
- **i18next-browser-languagedetector** - Auto-detects browser language

### 2. Translation Files
Located in `src/i18n/locales/`:
- `en.json` - English translations (~500 keys)
- `ar.json` - Arabic translations (~500 keys)

### 3. RTL Support
- CSS rules for RTL layout in `index.css`
- Cairo font for Arabic text (loaded from Google Fonts)
- Inter font for English text
- Direction-aware components

### 4. Language Switcher
- Located in header (top-right corner)
- Available on login page
- Shows flag + language name
- Instant switching without page reload

## How to Use

### In Components
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    
    return (
        <div className={isRTL ? 'text-right' : 'text-left'}>
            <h1>{t('dashboard.title')}</h1>
            <p>{t('common.loading')}</p>
        </div>
    );
}
```

### Changing Language Programmatically
```tsx
import { changeLanguage } from '@/i18n';

// Switch to Arabic
changeLanguage('ar');

// Switch to English
changeLanguage('en');
```

### Using the Custom Hook
```tsx
import { useAppTranslation } from '@/hooks/useAppTranslation';

function MyComponent() {
    const { 
        t, 
        isRTL, 
        formatDate, 
        formatCurrency,
        getSpaceClass 
    } = useAppTranslation();
    
    return (
        <div className={getSpaceClass(3)}>
            <span>{formatCurrency(100)}</span> {/* EGP 100 or 100 ج.م */}
            <span>{formatDate(new Date())}</span>
        </div>
    );
}
```

## Translation Keys Structure

```json
{
  "common": { /* General UI elements */ },
  "navigation": { /* Sidebar menu items */ },
  "auth": { /* Login/logout */ },
  "dashboard": { /* Dashboard page */ },
  "products": { /* Products management */ },
  "categories": { /* Categories management */ },
  "orders": { /* Orders management */ },
  "promoCodes": { /* Promo codes */ },
  "promotions": { /* Promotions */ },
  "users": { /* User management */ },
  "support": { /* Support tickets */ },
  "financial": { /* Financial reports */ },
  "analytics": { /* Analytics */ },
  "logs": { /* Admin/app logs */ },
  "settings": { /* Settings */ },
  "validation": { /* Form validation messages */ },
  "errors": { /* Error messages */ },
  "confirmations": { /* Confirmation dialogs */ }
}
```

## RTL Styling Tips

### Spacing Classes
```tsx
// Use space-x-reverse for RTL
<div className={`flex ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>

// Or use the helper
<div className={`flex ${getSpaceClass(3)}`}>
```

### Icon Margins
```tsx
// Icons with text
<button>
    <Icon className={isRTL ? 'ml-2' : 'mr-2'} />
    {t('common.save')}
</button>
```

### Border Positioning
```tsx
// Left border for LTR, right border for RTL
<Card className={isRTL ? 'border-r-4 border-r-green-500' : 'border-l-4 border-l-green-500'}>
```

## Files Modified

### Core i18n Files (Created)
- `src/i18n/index.ts` - i18n configuration
- `src/i18n/locales/en.json` - English translations
- `src/i18n/locales/ar.json` - Arabic translations
- `src/components/LanguageSwitcher.tsx` - Language dropdown
- `src/components/ui/dropdown-menu.tsx` - Dropdown component
- `src/hooks/useAppTranslation.ts` - Custom hook with helpers

### Updated Files
- `src/main.tsx` - Imports i18n
- `src/index.css` - RTL CSS rules
- `index.html` - Google Fonts + RTL setup
- `src/components/DashboardLayout.tsx` - RTL-aware sidebar/header
- `src/pages/LoginPage.tsx` - Translated login
- `src/pages/DashboardPage.tsx` - Translated dashboard
- `src/pages/products/ProductsPage.tsx` - Translated products
- `src/pages/orders/OrdersPage.tsx` - Translated orders
- `src/pages/categories/CategoriesPage.tsx` - Translated categories
- `src/pages/promo-codes/PromoCodesPage.tsx` - i18n imports added

## Testing

1. Start the development server:
   ```bash
   cd "admindash frontend"
   npm run dev
   ```

2. Open in browser: http://localhost:5173

3. Click the language switcher (globe icon) in the header

4. Switch between English 🇺🇸 and Arabic 🇪🇬

5. Verify:
   - Sidebar navigaation translates
   - Page titles change
   - Date format changes (English vs Arabic)
   - Layout flips for RTL
   - Fonts change (Inter for EN, Cairo for AR)

## Adding New Translations

1. Add key to `en.json`:
   ```json
   "mySection": {
     "myKey": "English text"
   }
   ```

2. Add matching key to `ar.json`:
   ```json
   "mySection": {
     "myKey": "النص العربي"
   }
   ```

3. Use in component:
   ```tsx
   {t('mySection.myKey')}
   ```

## Currency Format

- English: `EGP 1,234.56`
- Arabic: `١٬٢٣٤٫٥٦ ج.م`

## Date Format

- English: `Jan 15, 2025`
- Arabic: `١٥ يناير ٢٠٢٥`

## Known Issues

- Some TypeScript errors exist in other pages (unrelated to i18n)
- Not all pages have been fully translated yet
- Some dynamic content still needs translation

## Next Steps

To complete translation coverage:
1. Update remaining pages with `useTranslation` hook
2. Replace hardcoded strings with `t('key')` calls
3. Add missing translation keys as needed
4. Test all features in both languages
