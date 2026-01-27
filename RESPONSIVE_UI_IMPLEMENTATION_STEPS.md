# Responsive UI Implementation - Step by Step

## ✅ COMPLETED: Login Screen
- Added `useResponsive` hook
- Made styles dynamic (moved StyleSheet.create inside component)
- Applied responsive spacing and font sizes based on device

## 🔨 REMAINING SCREENS

### For Each Remaining Screen, Follow This Pattern:

#### 1. Import useResponsive (DONE for all)
```typescript
import { useResponsive } from '@/hooks/useResponsive';
```

#### 2. Use Hook in Component (DONE for all)
```typescript
const { wp, hp, isSmallDevice, isLargeDevice, width } = useResponsive();
```

#### 3. Move StyleSheet INSIDE Component Function
Because styles use responsive values, they must be created inside the component where hooks are available.

**Before:**
```typescript
export default function MyScreen() {
  // component code
}

const styles = StyleSheet.create({
  // styles here
});
```

**After:**
```typescript
export default function MyScreen() {
  const { wp, isSmallDevice } = useResponsive();
  
  // component code
  
  const styles = StyleSheet.create({
    padding: isSmallDevice ? Spacing.md : Spacing.lg,
    // other styles
  });
  
  return (<View style={styles.container}>...</View>);
}
```

---

## 📋 Specific Fixes Needed

### HOME SCREEN (index.tsx)
**Current Issues:**
- Uses `Dimensions.get("window").width` - should use `width` from useResponsive
- Product grid uses fixed calculations
- No responsive font sizes

**Fix:**
1. Move `const styles = StyleSheet.create({})` INSIDE the component function (after the useResponsive hook)
2. Replace:
   ```typescript
   productItem: {
     width: (Dimensions.get("window").width - Spacing.lg * 2 - Spacing.md) / 2,
   },
   bannerCard: {
     width: Dimensions.get("window").width - Spacing.lg * 2,
   },
   ```
   
   With:
   ```typescript
   productItem: {
     width: (width - Spacing.lg * 2 - Spacing.md) / 2,
   },
   bannerCard: {
     width: width - Spacing.lg * 2,
   },
   ```

3. Add responsive sizing:
   ```typescript
   title: {
     fontSize: isSmallDevice ? Typography.h2 : Typography.h1,
   },
   content: {
     paddingHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
   },
   ```

---

### SIGNUP SCREEN (signup.tsx)
**Current Issues:**
- Multi-step form with potentially small buttons/inputs
- No responsive spacing

**Fix:**
1. Move `const styles = StyleSheet.create({})` INSIDE component
2. Add responsive input heights:
   ```typescript
   input: {
     minHeight: isSmallDevice ? 50 : 56,
   },
   ```
3. Add responsive button heights:
   ```typescript
   nextButton: {
     minHeight: isSmallDevice ? 50 : 56,
     paddingVertical: isSmallDevice ? Spacing.sm : Spacing.md,
   },
   ```
4. Responsive font sizes for steps:
   ```typescript
   stepTitle: {
     fontSize: isSmallDevice ? Typography.h3 : Typography.h2,
   },
   ```

---

### ORDERS LIST SCREEN (orders.tsx)
**Current Issues:**
- Order cards may be too large/small
- Tab bar needs responsive sizing
- Image sizes are fixed

**Fix:**
1. Move styles INSIDE component
2. Responsive card padding:
   ```typescript
   orderCard: {
     padding: isSmallDevice ? Spacing.md : Spacing.lg,
     marginBottom: isSmallDevice ? Spacing.sm : Spacing.md,
   },
   ```
3. Responsive product images:
   ```typescript
   productImage: {
     width: isSmallDevice ? 60 : 70,
     height: isSmallDevice ? 60 : 70,
   },
   ```
4. Responsive tab sizing:
   ```typescript
   tab: {
     paddingHorizontal: isSmallDevice ? Spacing.sm : Spacing.md,
   },
   ```

---

### ORDER DETAIL SCREEN (orders/[id].tsx)
**Current Issues:**
- Long page with many sections
- Product images and details need responsive sizing
- Status timeline needs better spacing

**Fix:**
1. Move styles INSIDE component
2. Responsive section spacing:
   ```typescript
   section: {
     marginBottom: isSmallDevice ? Spacing.md : Spacing.lg,
     padding: isSmallDevice ? Spacing.md : Spacing.lg,
   },
   ```
3. Responsive product images:
   ```typescript
   productImage: {
     width: isSmallDevice ? 60 : 80,
     height: isSmallDevice ? 60 : 80,
   },
   ```
4. Responsive buttons:
   ```typescript
   actionButton: {
     minHeight: isSmallDevice ? 44 : 50,
   },
   ```

---

### NOTIFICATIONS SCREEN (notifications.tsx)
**Current Issues:**
- Notification cards need better spacing
- Tab bar needs responsive sizing

**Fix:**
1. Move styles INSIDE component
2. Responsive card layout:
   ```typescript
   notificationCard: {
     padding: isSmallDevice ? Spacing.md : Spacing.lg,
     marginBottom: isSmallDevice ? Spacing.sm : Spacing.md,
   },
   ```
3. Responsive icon sizes:
   ```typescript
   iconContainer: {
     width: isSmallDevice ? 40 : 48,
     height: isSmallDevice ? 40 : 48,
   },
   ```
4. Responsive font sizes:
   ```typescript
   title: {
     fontSize: isSmallDevice ? Typography.bodyBase : Typography.bodyLarge,
   },
   ```

---

## 🎯 Quick Implementation Checklist

For each screen:
- [ ] Verify useResponsive is imported and used
- [ ] Move `const styles = StyleSheet.create({})` INSIDE component function (after hooks)
- [ ] Replace `Dimensions.get("window")` with `width` from useResponsive
- [ ] Add `isSmallDevice ?` ternaries for padding/margins (use Spacing.md vs Spacing.lg)
- [ ] Add `isSmallDevice ?` ternaries for font sizes (use smaller Typography values)
- [ ] Add `isSmallDevice ?` ternaries for button/input heights (use 50 vs 56)
- [ ] Test on small device (iPhone SE), medium (iPhone 14), large (iPhone 14 Pro Max)

---

## 💡 Common Patterns

### Spacing
```typescript
padding: isSmallDevice ? Spacing.md : Spacing.lg
marginVertical: isSmallDevice ? Spacing.sm : Spacing.md
gap: isSmallDevice ? Spacing.xs : Spacing.sm
```

### Typography
```typescript
fontSize: isSmallDevice ? Typography.h3 : Typography.h2
fontSize: isSmallDevice ? Typography.bodyMedium : Typography.bodyBase
```

### Dimensions
```typescript
width: wp(90)  // 90% of screen width
height: hp(30)  // 30% of screen height
minHeight: isSmallDevice ? 50 : 56
```

### Images/Icons
```typescript
width: isSmallDevice ? 60 : 80
height: isSmallDevice ? 60 : 80
```

---

## 🚀 Next Steps

Would you like me to:
1. **Implement all remaining screens automatically** (I'll update all 5 screens)
2. **Implement one screen at a time** (so you can review each)
3. **Create example code** for you to apply manually

Let me know your preference!
