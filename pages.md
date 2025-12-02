# 📱 COMPLETE ELBARAKA MOBILE APP - ALL PAGES & FLOWS

## 🎯 CUSTOMER APP (React Native - Mobile)

### 1️⃣ **AUTHENTICATION FLOW** (Pre-Login)

#### 1.1 Splash Screen

- **Route**: `/splash`
- **Elements**:
  - ElBaraka logo (animated)
  - Loading spinner
  - Brand tagline
- **Flow**: Auto-navigate to Onboarding (first time) or Home (returning user)

#### 1.2 Onboarding Screens (3 screens - swipeable)

- **Route**: `/onboarding`
- **Screen 1**: "Fresh Groceries Delivered" + illustration
- **Screen 2**: "Easy Shopping Experience" + illustration
- **Screen 3**: "Fast & Secure Checkout" + illustration
- **Elements**:
  - Skip button (top-right)
  - Next/Get Started button
  - Page indicators (dots)
- **Flow**: Skip/Get Started → Welcome Screen

#### 1.3 Welcome Screen

- **Route**: `/welcome`
- **Elements**:
  - ElBaraka logo
  - "Welcome to ElBaraka" heading
  - "Your daily groceries delivered fresh" subtitle
  - "Sign In" button (primary)
  - "Create Account" button (secondary)
  - "Continue as Guest" link
- **Flow**:
  - Sign In → Login Screen
  - Create Account → Register Screen
  - Guest → Home Screen (limited features)

#### 1.4 Login Screen

- **Route**: `/login`
- **Elements**:
  - "Welcome Back" heading
  - Email/Phone input field
  - Password input field (with show/hide)
  - "Remember Me" checkbox
  - "Forgot Password?" link
  - "Login" button (primary)
  - "Don't have an account? Sign Up" link
  - Social login buttons (Google, Apple)
- **Flow**:
  - Success → Home Screen
  - Forgot Password → Reset Password Flow
  - Sign Up → Register Screen

#### 1.5 Register Screen (Multi-step)

- **Route**: `/register`

**Step 1: Basic Info**

- Full name input
- Email input
- Phone number input (with country code picker)
- "Next" button

**Step 2: Password**

- Password input (with strength indicator)
- Confirm password input
- Password requirements checklist
- "Next" button

**Step 3: Verification**

- OTP input (6 digits)
- "Verify" button
- "Resend Code" link (with timer)
- Verification method toggle (Email/SMS)

**Step 4: Success**

- Success animation
- "Account created successfully" message
- "Continue" button → Home Screen

#### 1.6 Forgot Password Flow

- **Route**: `/forgot-password`

**Step 1: Email/Phone Entry**

- Email or phone input
- "Send Reset Code" button

**Step 2: OTP Verification**

- OTP input (6 digits)
- "Verify" button
- "Resend Code" link

**Step 3: New Password**

- New password input
- Confirm password input
- "Reset Password" button
- **Flow**: Success → Login Screen

---

### 2️⃣ **MAIN APP NAVIGATION** (Bottom Tab Navigator - 5 Tabs)

#### 2.1 HOME TAB 🏠

##### 2.1.1 Home Screen (Main)

- **Route**: `/home`
- **Header**:
  - "Good Morning [Name]" greeting (time-based)
  - Cart icon with badge
  - Notification bell with badge
- **Sections**:

  1. **Location Selector**

     - Current location display
     - "Deliver to: [Address]" (tap to change)
     - Chevron icon

  2. **Search Bar**

     - "Search for products..." placeholder
     - Search icon (left)
     - Filter icon button (right)
     - **Tap Flow**: → Search Screen

  3. **Promotional Banner Carousel** (auto-scroll)

     - Banner 1: "Fresh Deals - Up to 50% OFF"
     - Banner 2: "Free Delivery on Orders Above $50"
     - Banner 3: "Weekly Special Offers"
     - Page indicators (dots)
     - **Tap Flow**: → Deals Screen or Category Screen

  4. **Categories Horizontal Scroll**

     - Section title: "Shop by Category"
     - "See All" link → Categories Screen
     - Category cards (rounded-3xl, gradient):
       - 🍎 Fruits
       - 🥕 Vegetables
       - 🥛 Dairy
       - 🍞 Bakery
       - 🥩 Meat
       - 🥤 Beverages
       - 🧴 Household
       - 🍫 Snacks
     - **Tap Flow**: → Category Products Screen

  5. **Flash Deals Section**

     - Section title: "Flash Deals ⚡" with countdown timer
     - Horizontal scroll product cards
     - "View All" link
     - **Tap Flow**: → Flash Deals Screen

  6. **Featured Products Grid** (2 columns)

     - Section title: "Featured Products"
     - "See All" link → All Products Screen
     - Product cards (6-8 items):
       - Product image
       - Name (2 lines max)
       - Price (emerald green, bold)
       - Old price (strikethrough if discount)
       - Discount badge (orange, top-right)
       - "Add" button (emerald green)
     - **Tap Flow**:
       - Card → Product Details Screen
       - Add button → Add to cart + toast notification

  7. **Best Sellers Section**

     - Section title: "Best Sellers 🔥"
     - Horizontal scroll product cards
     - **Tap Flow**: → Product Details

  8. **Recently Viewed** (if user has history)
     - Section title: "Recently Viewed"
     - Horizontal scroll product cards
     - "Clear History" link

- **Floating Action**: Cart button (bottom-right) with badge

##### 2.1.2 Search Screen

- **Route**: `/search`
- **Header**:
  - Back button
  - Search input (auto-focus)
  - Cancel button
- **Elements**:
  - Search suggestions (as user types)
  - **Recent Searches** section (with X to remove)
  - **Popular Searches** section (chips/tags)
  - **Search by Category** quick filters
- **Results View**:
  - Sort dropdown (Relevance, Price Low-High, Price High-Low, Rating)
  - Filter button → Filter Bottom Sheet
  - Product grid (2 columns)
  - "No results" empty state

##### 2.1.3 Filter Bottom Sheet (Modal)

- **Elements**:
  - "Filters" title with "Reset All" link
  - **Category Filter** (expandable)
    - All categories with checkboxes
  - **Price Range Filter**
    - Min/Max inputs
    - Slider
  - **Rating Filter**
    - Star ratings checkboxes (5⭐, 4⭐+, 3⭐+, etc.)
  - **Availability**
    - "In Stock" checkbox
    - "On Sale" checkbox
  - **Brand Filter** (if applicable)
  - "Apply Filters" button
  - "Cancel" button

##### 2.1.4 Notification Screen

- **Route**: `/notifications`
- **Header**:
  - "Notifications" title
  - "Mark all as read" link
- **Tabs**:
  - All
  - Orders
  - Offers
  - Account
- **Notification Items**:
  - Icon (based on type)
  - Title
  - Message
  - Time
  - Read/unread indicator
  - **Tap Flow**: Navigate to relevant screen (order, product, etc.)
- **Empty State**: "No notifications yet"

##### 2.1.5 Location Selector Screen

- **Route**: `/location-selector`
- **Header**:
  - "Select Delivery Location" title
  - Close button
- **Elements**:
  - Search address input
  - "Use Current Location" button (with GPS icon)
  - **Saved Addresses** section:
    - Address cards with:
      - Label (Home, Work, Other)
      - Full address
      - Edit icon
      - Delete icon
      - Select radio button
  - "Add New Address" button → Add Address Screen
- **Map View** (optional):
  - Interactive map
  - Pin marker
  - "Confirm Location" button

---

#### 2.2 BROWSE TAB 📂

##### 2.2.1 Categories Screen (Main)

- **Route**: `/categories`
- **Header**:
  - "Categories" title
  - Search icon → Search Screen
  - Cart icon with badge
- **View Options**:
  - Grid view toggle
  - List view toggle
- **Categories Grid** (2 columns or list):
  - Category image/icon
  - Category name
  - Product count badge
  - **Tap Flow**: → Category Products Screen

##### 2.2.2 Category Products Screen

- **Route**: `/category/:categoryId`
- **Header**:
  - Back button
  - Category name title
  - Search icon
  - Cart icon with badge
- **Sub-categories** (if applicable):
  - Horizontal scroll chips
  - "All", "Subcategory 1", "Subcategory 2", etc.
- **Toolbar**:
  - View toggle (Grid/List)
  - Sort dropdown
  - Filter button
- **Products Grid/List**:
  - Product cards (same as home)
  - Infinite scroll / Load more
- **Empty State**: "No products in this category"

##### 2.2.3 All Products Screen

- **Route**: `/products`
- **Same as Category Products** but shows all products across categories

---

#### 2.3 CART TAB 🛒

##### 2.3.1 Cart Screen (Main)

- **Route**: `/cart`
- **Header**:
  - "My Cart" title
  - Clear cart button (with confirmation)
- **Cart Items List**:
  - **Each item card**:
    - Product image (thumbnail)
    - Product name
    - Price per unit
    - Quantity controls:
      - Minus button
      - Quantity display
      - Plus button
    - Item subtotal
    - Remove icon (trash)
  - Swipe to delete gesture
- **Suggested Products Section**:
  - "You might also like" title
  - Horizontal scroll product cards
- **Bottom Fixed Section**:
  - **Price Breakdown**:
    - Subtotal: $XX.XX
    - Delivery Fee: $X.XX (or "FREE" in green)
    - Discount: -$X.XX (if applied)
    - Tax: $X.XX
    - **Total**: $XX.XX (large, bold, green)
  - **Promo Code Input**:
    - "Have a promo code?" expandable
    - Input field
    - "Apply" button
    - Success/Error message
  - "Proceed to Checkout" button (primary, full-width)
- **Empty State**:
  - Empty cart illustration
  - "Your cart is empty"
  - "Start Shopping" button → Home

##### 2.3.2 Checkout Flow (Multi-step)

- **Route**: `/checkout`

**Step 1: Delivery Address**

- **Route**: `/checkout/address`
- **Header**:
  - Back button
  - "Delivery Address" title
  - Progress indicator (1/4)
- **Saved Addresses**:
  - Address cards with select radio
- "Add New Address" button → Add Address Screen
- "Continue" button (disabled until selection)

**Step 2: Delivery Time**

- **Route**: `/checkout/delivery-time`
- **Header**:
  - Back button
  - "Select Delivery Time" title
  - Progress indicator (2/4)
- **Delivery Date**:
  - Date picker (next 7 days)
  - Today, Tomorrow chips
- **Time Slots**:
  - Morning (9AM - 12PM)
  - Afternoon (12PM - 3PM)
  - Evening (3PM - 6PM)
  - Night (6PM - 9PM)
  - Radio buttons
  - Available/Unavailable indicators
- **Express Delivery Option**:
  - Checkbox with extra fee
  - "Delivery within 2 hours"
- **Delivery Instructions**:
  - Text area input
  - "e.g., Call when arrived, Ring doorbell"
- "Continue" button

**Step 3: Payment Method**

- **Route**: `/checkout/payment`
- **Header**:
  - Back button
  - "Payment Method" title
  - Progress indicator (3/4)
- **Payment Options**:
  - **Saved Cards** (if any):
    - Card icon (Visa/Mastercard)
    - •••• •••• •••• 1234
    - Expiry date
    - Select radio button
    - Remove icon
  - "Add New Card" button → Add Card Screen
  - **Cash on Delivery**:
    - COD icon
    - "Pay when you receive"
    - Select radio button
  - **Wallet Balance** (if available):
    - Current balance display
    - "Use wallet balance" checkbox
- "Continue" button

**Step 4: Order Review**

- **Route**: `/checkout/review`
- **Header**:
  - Back button
  - "Review Order" title
  - Progress indicator (4/4)
- **Order Summary**:
  - **Delivery Address** (with edit icon)
  - **Delivery Time** (with edit icon)
  - **Payment Method** (with edit icon)
  - **Order Items** (expandable/collapsible):
    - Item list with quantities
    - "View cart" link
  - **Price Breakdown**:
    - Subtotal
    - Delivery fee
    - Discount (if applied)
    - Tax
    - **Total** (large, bold)
- **Terms & Conditions**:
  - Checkbox: "I agree to terms and conditions"
  - Link to T&C modal
- **"Place Order" button** (primary, full-width)
  - Loading state while processing
- **Bottom Sheet**: Payment processing → Success/Failure

**Order Success Screen**

- **Route**: `/order-success`
- Success animation (checkmark)
- "Order Placed Successfully!" message
- Order number display
- Estimated delivery time
- "Track Order" button → Order Details
- "Continue Shopping" button → Home

**Order Failure Screen**

- **Route**: `/order-failure`
- Error animation
- "Payment Failed" message
- Error reason
- "Try Again" button → Back to payment step
- "Cancel Order" button → Cart

##### 2.3.3 Add Address Screen

- **Route**: `/add-address`
- **Header**:
  - Back button
  - "Add New Address" title
  - Save button
- **Form Fields**:
  - Address Label dropdown (Home, Work, Other)
  - Custom label input (if Other)
  - **Location Selection**:
    - "Use Current Location" button
    - Map view with draggable pin
    - "Confirm Location" button
  - Street address input
  - Apartment/Floor/Building input
  - Landmark input (optional)
  - City input
  - State input
  - Postal code input
  - Phone number input
  - "Set as default address" checkbox
- "Save Address" button

##### 2.3.4 Add Card Screen

- **Route**: `/add-card`
- **Header**:
  - Back button
  - "Add Payment Card" title
- **Card Preview** (visual representation updates as user types)
- **Form Fields**:
  - Card number input (with auto-formatting)
  - Card holder name input
  - Expiry date input (MM/YY)
  - CVV input
  - "Save card for future use" checkbox
- "Add Card" button
- Security badges (PCI DSS, SSL)

---

#### 2.4 ORDERS TAB 📦

##### 2.4.1 Orders Screen (Main)

- **Route**: `/orders`
- **Header**:
  - "My Orders" title
  - Search icon (search by order number)
- **Tabs**:
  - Active (default)
  - Completed
  - Cancelled
- **Filters**:
  - Date range picker
  - Status filter dropdown
- **Order Cards List**:
  - **Each order card**:
    - Order number
    - Order date & time
    - Status badge (Processing, Confirmed, Out for Delivery, Delivered, Cancelled)
    - Items preview (first 2-3 product images)
    - Total items count
    - Total amount
    - "View Details" button or tap entire card
  - Pull-to-refresh
- **Empty States**:
  - Active: "No active orders"
  - Completed: "No completed orders yet"
  - Cancelled: "No cancelled orders"
  - Illustration + "Start Shopping" button

##### 2.4.2 Order Details Screen

- **Route**: `/order/:orderId`
- **Header**:
  - Back button
  - "Order Details" title
  - Share icon (share order details)
  - More menu (3 dots):
    - Download receipt
    - Report issue → Complaints
- **Order Status Timeline**:
  - Order Placed ✓
  - Confirmed ✓
  - Preparing ⏳ (current)
  - Out for Delivery
  - Delivered
  - Progress line connecting steps
- **Estimated Delivery**:
  - Large display of date & time
  - Countdown timer (if active)
- **Delivery Info**:
  - Delivery address
  - Delivery time slot
  - Delivery instructions
  - Edit option (if order not confirmed yet)
- **Order Items**:
  - List of products with:
    - Product image (thumbnail)
    - Name
    - Quantity × Price
    - Subtotal
- **Payment Summary**:
  - Subtotal
  - Delivery fee
  - Discount
  - Tax
  - **Total Paid**
  - Payment method (Visa ••••1234 or COD)
- **Action Buttons** (conditional based on status):
  - "Track Order" → Order Tracking Screen
  - "Cancel Order" (if allowed) → Confirmation dialog
  - "Reorder" → Add all items to cart
  - "Rate Order" → Rating Screen
  - "Report Issue" → Complaints Screen
  - "Download Receipt" → PDF download

##### 2.4.3 Order Tracking Screen (Live)

- **Route**: `/order/:orderId/track`
- **Header**:
  - Back button
  - "Track Order" title
  - Order number
- **Map View**:
  - User location marker
  - Delivery location marker
  - Driver location marker (real-time)
  - Route line
  - Zoom controls
- **Driver Info Card** (bottom sheet):
  - Driver photo
  - Driver name
  - Driver rating (⭐ 4.8)
  - Vehicle info
  - Call button
  - Message button
- **Status Updates**:
  - "Your order is on the way"
  - Estimated arrival time
  - Distance remaining
- **Live Updates** (WebSocket or polling)

##### 2.4.4 Rate Order Screen

- **Route**: `/order/:orderId/rate`
- **Header**:
  - Back button
  - "Rate Your Order" title
- **Elements**:
  - "How was your experience?" heading
  - **Overall Rating**:
    - 5 stars (tap to rate)
  - **Product Quality**:
    - 5 stars
  - **Delivery Experience**:
    - 5 stars
  - **Review Text Area**:
    - "Share your thoughts..." placeholder
    - Character count
  - **Photo Upload** (optional):
    - "Add Photos" button
    - Photo thumbnails (with remove X)
  - "Submit Review" button
- **Success**: Thank you message → Back to order details

---

#### 2.5 PROFILE TAB 👤

##### 2.5.1 Profile Screen (Main)

- **Route**: `/profile`
- **Header**:
  - "Profile" title
  - Settings icon → Settings Screen
- **Profile Header**:
  - Profile photo (tap to change)
  - Name
  - Email
  - Phone number
  - "Edit Profile" button
- **Account Stats** (3 cards):
  - Orders count
  - Wishlist count
  - Wallet balance
- **Menu Sections**:

  **Account Section**:

  - "Personal Information" → Edit Profile Screen
  - "My Addresses" → Addresses Screen
  - "Payment Methods" → Payment Methods Screen
  - "Wallet" → Wallet Screen

  **Orders Section**:

  - "My Orders" → Orders Screen
  - "Favorites/Wishlist" → Wishlist Screen

  **Support Section**:

  - "Help Center" → Help Center Screen
  - "My Complaints" → Complaints Screen
  - "Contact Support" → Contact Screen

  **App Section**:

  - "Settings" → Settings Screen
  - "About ElBaraka" → About Screen
  - "Terms & Conditions" → Terms Screen
  - "Privacy Policy" → Privacy Screen

  **Logout**:

  - "Logout" button (red) → Confirmation dialog

##### 2.5.2 Edit Profile Screen

- **Route**: `/profile/edit`
- **Header**:
  - Back button
  - "Edit Profile" title
  - Save button
- **Elements**:
  - Profile photo with change button
  - Full name input
  - Email input
  - Phone number input
  - Date of birth picker
  - Gender selection (Male/Female/Other)
  - "Change Password" button → Change Password Screen
  - "Save Changes" button

##### 2.5.3 Change Password Screen

- **Route**: `/profile/change-password`
- **Form**:
  - Current password input
  - New password input (with strength indicator)
  - Confirm new password input
  - "Update Password" button

##### 2.5.4 My Addresses Screen

- **Route**: `/profile/addresses`
- **Header**:
  - Back button
  - "My Addresses" title
  - Add new button
- **Address Cards List**:
  - Label badge (Home, Work, Other)
  - Full address
  - Phone number
  - Default badge (if default)
  - Actions:
    - Edit button
    - Delete button (with confirmation)
    - "Set as Default" button
- "Add New Address" button → Add Address Screen
- **Empty State**: "No saved addresses"

##### 2.5.5 Payment Methods Screen

- **Route**: `/profile/payment-methods`
- **Header**:
  - Back button
  - "Payment Methods" title
- **Saved Cards List**:
  - Card icon
  - •••• •••• •••• 1234
  - Expiry: MM/YY
  - Default badge
  - Actions:
    - "Set as Default" button
    - Remove button (with confirmation)
- "Add New Card" button → Add Card Screen
- **Empty State**: "No saved cards"

##### 2.5.6 Wallet Screen

- **Route**: `/profile/wallet`
- **Header**:
  - Back button
  - "My Wallet" title
- **Balance Card**:
  - Large balance display
  - "Add Money" button
  - "Withdraw" button (if applicable)
- **Tabs**:
  - Transactions
  - Rewards
- **Transaction History**:
  - Date
  - Description
  - Amount (+ green / - red)
  - Running balance
- **Add Money Bottom Sheet**:
  - Amount input
  - Payment method selection
  - "Add to Wallet" button

##### 2.5.7 Wishlist/Favorites Screen

- **Route**: `/profile/wishlist`
- **Header**:
  - Back button
  - "My Favorites" title
  - Sort/Filter options
- **View Toggle**: Grid / List
- **Product Cards**:
  - Same as home screen
  - Heart icon (filled, to remove)
  - "Move to Cart" button
  - Out of stock indicator
- **Bulk Actions**:
  - "Add All to Cart" button
  - "Clear All" button
- **Empty State**:
  - Heart illustration
  - "No favorites yet"
  - "Browse Products" button

##### 2.5.8 Complaints/Support Tickets Screen

- **Route**: `/profile/complaints`
- **Header**:
  - Back button
  - "My Complaints" title
  - "New Complaint" button → Create Complaint Screen
- **Filters**:
  - Status dropdown (All, Open, In Progress, Resolved, Closed)
  - Category filter
- **Complaint Cards List**:
  - Ticket number (#12345)
  - Subject
  - Category badge
  - Status badge (color-coded)
  - Priority badge
  - Date submitted
  - Last updated
  - **Tap**: → Complaint Details Screen
- **Empty State**: "No complaints submitted"

##### 2.5.9 Create Complaint Screen

- **Route**: `/complaints/new`
- **Header**:
  - Back button
  - "Submit Complaint" title
- **Form**:
  - **Related Order** (optional):
    - "Select Order" dropdown
    - Order number + date display
  - **Category** (required):
    - Dropdown:
      - Order Issue
      - Product Quality
      - Delivery Problem
      - Payment Issue
      - Technical Issue
      - General Inquiry
      - Suggestion
      - Other
  - **Subject** (required):
    - Text input
    - "Brief description of issue"
  - **Description** (required):
    - Text area
    - "Describe your issue in detail..."
    - Character counter
  - **Attachments** (optional):
    - "Add Photos/Documents" button
    - Photo thumbnails (with remove X)
    - Max 5 files
  - **Priority** (auto or user select):
    - Low / Medium / High / Urgent
  - "Submit Complaint" button
- **Success**:
  - Ticket number display
  - "View Complaint" button → Complaint Details

##### 2.5.10 Complaint Details Screen

- **Route**: `/complaints/:ticketId`
- **Header**:
  - Back button
  - "Complaint Details" title
  - More menu:
    - Close complaint (if open)
    - Download conversation (PDF)
- **Complaint Info Card**:
  - Ticket number
  - Status badge
  - Priority badge
  - Category
  - Date submitted
  - Last updated
  - Related order (if any) → Link to order
- **Issue Details**:
  - Subject
  - Description
  - Attachments (expandable gallery)
- **Message Thread** (chat-like):
  - Customer messages (right, blue)
  - Admin replies (left, gray)
  - Timestamp on each
  - Read receipts
  - Scrollable
- **Reply Section** (bottom):
  - Text input: "Type your message..."
  - Attach button
  - Send button
- **Actions** (conditional):
  - "Close Complaint" button (if resolved)
  - "Rate Resolution" → Rating dialog
- **Status History Timeline**:
  - Expandable section
  - Open → In Progress → Resolved → Closed
  - Timestamps

##### 2.5.11 Help Center Screen

- **Route**: `/help`
- **Header**:
  - Back button
  - "Help Center" title
  - Search icon
- **Search Bar**: "How can we help you?"
- **Quick Links**:
  - "Track my order"
  - "Return policy"
  - "Payment issues"
  - "Account help"
- **FAQ Categories** (Expandable accordion):
  - Orders & Delivery
  - Payments & Refunds
  - Products
  - Account Management
  - Technical Issues
- **Each FAQ**:
  - Question (tap to expand)
  - Answer (with formatting)
  - "Was this helpful?" (Yes/No buttons)
- **Contact Support** section:
  - "Didn't find what you need?"
  - "Contact Support" button → Contact Screen
  - "Submit Complaint" button → Create Complaint

##### 2.5.12 Contact Support Screen

- **Route**: `/contact`
- **Header**:
  - Back button
  - "Contact Us" title
- **Contact Methods**:
  - **Live Chat** (if available):
    - "Start Chat" button → Chat Screen
    - "Online now" status
  - **Email**:
    - support@elbaraka.com
    - "Send Email" button
  - **Phone**:
    - +1 234 567 890
    - "Call Now" button
  - **Working Hours**:
    - Mon-Sat: 9AM - 9PM
    - Sunday: 10AM - 6PM
- **Submit a Request** button → Create Complaint

##### 2.5.13 Settings Screen

- **Route**: `/settings`
- **Header**:
  - Back button
  - "Settings" title
- **Sections**:

  **Notifications**:

  - "Push Notifications" toggle
  - "Order Updates" toggle
  - "Offers & Promotions" toggle
  - "Email Notifications" toggle
  - "SMS Notifications" toggle

  **Language & Region**:

  - Language selector (English/العربية)
  - "Enable RTL" toggle (for Arabic)
  - Currency selector
  - Time format (12h/24h)

  **Display**:

  - Theme (Light/Dark/System)
  - Text size slider
  - Reduce animations toggle

  **Privacy & Security**:

  - "Enable Biometric Login" toggle
  - "Two-Factor Authentication" → 2FA Setup
  - "Clear Cache" button
  - "Clear Search History" button

  **App Info**:

  - App version
  - "Check for Updates" button
  - "Rate App" button → App Store
  - "Share App" button

  **Legal**:

  - Terms & Conditions
  - Privacy Policy
  - Licenses

##### 2.5.14 About Screen

- **Route**: `/about`
- **Content**:
  - ElBaraka logo
  - App name & version
  - "About ElBaraka" description
  - Mission statement
  - Contact information
  - Social media links
  - "Visit Website" button

---

### 3️⃣ **PRODUCT DETAIL SCREEN** (Standalone - accessed from anywhere)

#### 3.1 Product Details Screen

- **Route**: `/product/:productId`
- **Header**:
  - Back button
  - Product name title (scrollable)
  - Share icon
  - Wishlist heart icon (toggle)
  - Cart icon with badge
- **Image Gallery**:
  - Main image (swipeable, pinch-to-zoom)
  - Thumbnail strip (bottom)
  - Page indicators
  - Fullscreen button
- **Product Info Section**:
  - **Product Name** (large, bold)
  - **Brand** (if applicable)
  - **Rating & Reviews**:
    - Star rating (4.5 ⭐)
    - Review count (125 reviews)
    - Tap → Reviews Screen
  - **Price Section**:
    - Current price (emerald green, large, bold)
    - Old price (strikethrough, if discount)
    - Discount percentage badge (orange)
    - "Save $X.XX" text
  - **Stock Status**:
    - In Stock (green) / Out of Stock (red) / Limited Stock (orange)
    - Stock quantity (if low)
  - **Size/Weight/Variant Selector** (if applicable):
    - Chips or dropdown
    - Price updates on selection
- **Quantity Selector**:
  - Minus button
  - Quantity display
  - Plus button
  - Max quantity indicator
- **Description Section** (Expandable):
  - "About this product" heading
  - Full description text
  - "Read more" / "Read less" toggle
- **Nutrition Facts** (Expandable - for food items):
  - Calories, Fat, Protein, Carbs, etc.
  - Table format
- **Ingredients** (Expandable - for food items):
  - List of ingredients
- **Allergen Information** (if applicable):
  - Warning badges (Contains Nuts, Dairy, etc.)
- **Specifications** (Expandable):
  - Weight/Size
  - Brand
  - Manufacturer
  - Country of origin
  - SKU
- **Reviews & Ratings Section**:
  - Section title with total count
  - Star rating breakdown (5⭐: 80%, 4⭐: 15%, etc.)
  - "Write Review" button
  - Top 3 reviews preview:
    - Reviewer name
    - Rating stars
    - Date
    - Review text (truncated)
    - Photos (if any)
    - Helpful count
  - "View All Reviews" button → Reviews Screen
- **Related Products** (Horizontal scroll):
  - "You may also like" title
  - Product cards
- **Frequently Bought Together**:
  - "Customers also bought" title
  - Product cards with checkboxes
  - "Add Selected to Cart" button
  - Total price display
- **Bottom Fixed Bar**:
  - Total price (with quantity)
  - "Add to Cart" button (primary, emerald)
  - "Buy Now" button (checkout directly)

#### 3.2 Product Reviews Screen

- **Route**: `/product/:productId/reviews`
- **Header**:
  - Back button
  - "Reviews" title
  - "Write Review" button
- **Summary Section**:
  - Average rating (large)
  - Total reviews count
  - Star distribution bars
- **Sort/Filter**:
  - Sort: Most Recent, Highest Rated, Lowest Rated, Most Helpful
  - Filter: With Photos, Verified Purchase
- **Reviews List**:
  - Reviewer name
  - Verified badge (if verified purchase)
  - Star rating
  - Review date
  - Review text
  - Photos (scrollable thumbnails → Fullscreen)
  - Helpful button (👍 123)
- **Write Review Bottom Sheet**:
  - Star rating selector
  - Review text area
  - Photo upload
  - "Submit" button

#### 3.3 Product Image Fullscreen

- **Route**: `/product/:productId/gallery`
- **Elements**:
  - Close button (X)
  - Swipeable fullscreen images
  - Pinch-to-zoom
  - Page indicator (1/5)
  - Share button

---

### 4️⃣ **DEALS & OFFERS SCREENS**

#### 4.1 Flash Deals Screen

- **Route**: `/deals/flash`
- **Header**:
  - Back button
  - "Flash Deals ⚡" title
  - Countdown timer (large, prominent)
  - Filter icon
- **Products Grid** (2 columns):
  - Product cards with discount badges
  - Timer on each product (if individual timers)
- **Empty State** (when deals expire):
  - "No active flash deals"
  - "Check back later"
  - "Browse Regular Products" button

#### 4.2 All Offers Screen

- **Route**: `/offers`
- **Header**:
  - Back button
  - "Offers & Deals" title
  - Filter/Sort
- **Tabs**:
  - Flash Deals
  - Combo Offers
  - Category Deals
  - Clearance
- **Offer Cards**:
  - Banner image
  - Offer title
  - Discount percentage
  - Validity period
  - "Shop Now" button

---

### 5️⃣ **GUEST USER LIMITATIONS**

When user continues as guest (without login):

- ✅ Can browse products
- ✅ Can search
- ✅ Can view product details
- ✅ Can add to cart
- ❌ Cannot checkout (prompt to login)
- ❌ Cannot save wishlist
- ❌ Cannot view orders
- ❌ Cannot save addresses
- ❌ No profile access

**Login Prompt Modal** (appears when guest tries restricted action):

- "Sign in to continue"
- Benefits of signing in
- "Sign In" button
- "Create Account" button
- "Continue as Guest" (dismiss)

---

## 🖥️ ADMIN PANEL (Laravel Filament - Web Dashboard)

### 1️⃣ **AUTHENTICATION**

#### 1.1 Admin Login Page

- **Route**: `/admin/login`
- **Elements**:
  - ElBaraka Admin logo
  - "Admin Panel Login" heading
  - Email input
  - Password input
  - "Remember Me" checkbox
  - "Login" button
  - "Forgot Password?" link
- **2FA Screen** (if enabled):
  - OTP input
  - "Verify" button

#### 1.2 Forgot Password

- **Route**: `/admin/forgot-password`
- Email input → Send reset link

---

### 2️⃣ **DASHBOARD** (Main)

#### 2.1 Dashboard Overview

- **Route**: `/admin/dashboard`
- **Top Stats Cards** (4 cards):

  1. **Total Sales**: $XX,XXX (Today, Week, Month toggle)
     - Comparison with previous period (↑ 12%)
  2. **Total Orders**: XXX
     - Pending count badge
  3. **Total Customers**: XXX
     - New today count
  4. **Average Order Value**: $XX.XX
     - Trend indicator

- **Charts Section**:

  - **Sales Chart** (Line/Bar):
    - Daily/Weekly/Monthly toggle
    - Revenue over time
    - Comparison line (previous period)
  - **Orders by Status** (Pie/Donut):
    - Pending, Confirmed, Preparing, Out for Delivery, Delivered
  - **Sales by Category** (Bar):
    - Top 10 categories

- **Quick Stats Grid**:

  - Pending Orders (clickable → Orders page)
  - Low Stock Items (clickable → Inventory)
  - Out of Stock Items (clickable → Inventory)
  - Active Customers (online now)

- **Recent Activities** (Table):

  - Latest 10 orders
  - New customer registrations
  - Recent reviews
  - New complaints
  - Each row clickable to details

- **Alerts Section**:
  - Low stock alerts
  - Out of stock alerts
  - Pending refunds
  - Unresolved complaints
  - System notifications

---

### 3️⃣ **PRODUCT MANAGEMENT**

#### 3.1 Products List Page

- **Route**: `/admin/products`
- **Header**:
  - "Products" title
  - "Add New Product" button
  - "Bulk Import" button (CSV)
  - "Export" button (CSV/Excel)
- **Filters Panel** (left sidebar or top):
  - Search by name/SKU
  - Category dropdown
  - Brand dropdown
  - Status (Active/Inactive/Draft)
  - Stock status (In Stock/Low Stock/Out of Stock)
  - Price range
  - Date added range
- **Bulk Actions**:
  - Select all checkbox
  - Actions dropdown:
    - Delete selected
    - Update status (Active/Inactive)
    - Update price (bulk)
    - Update stock
    - Export selected
- **Products Table** (sortable columns):
  - Checkbox
  - Product Image (thumbnail)
  - SKU
  - Product Name
  - Category
  - Brand
  - Price (Regular/Sale)
  - Stock Quantity
  - Stock Status badge
  - Status (Active/Inactive) toggle
  - Rating (⭐ avg)
  - Actions (View/Edit/Delete)
- **Pagination**: 10/25/50/100 per page

#### 3.2 Add/Edit Product Page

- **Route**: `/admin/products/create` or `/admin/products/:id/edit`
- **Tabs**:

**Tab 1: Basic Information**

- Product Name (EN)
- Product Name (AR)
- Slug (auto-generated, editable)
- SKU (auto-generated or manual)
- Category (multi-select dropdown with hierarchy)
- Brand (dropdown)
- Tags (multi-input)
- Status (Active/Inactive/Draft)
- Featured (checkbox)

**Tab 2: Description**

- Short Description (EN) - WYSIWYG editor
- Short Description (AR)
- Full Description (EN) - WYSIWYG editor
- Full Description (AR)
- SEO Meta Title
- SEO Meta Description
- SEO Keywords

**Tab 3: Pricing**

- Regular Price
- Sale Price (optional)
- Cost Price (for profit calculation)
- Tax Class (dropdown)
- Discount Type (Percentage/Fixed)
- Discount Value
- Discount Start Date
- Discount End Date

**Tab 4: Inventory**

- SKU
- Manage Stock (checkbox)
- Stock Quantity
- Low Stock Threshold
- Stock Status (In Stock/Out of Stock)
- Backorders (Allow/Do not allow/Notify)
- Sold Individually (checkbox)

**Tab 5: Images**

- Main Product Image (upload, drag-drop)
- Gallery Images (multiple upload, drag-to-reorder)
- Image optimization options

**Tab 6: Attributes & Variants**

- Weight
- Dimensions (L × W × H)
- **Variants** (if applicable):
  - Variant Type (Size, Color, etc.)
  - Variant options
  - Price adjustments per variant
  - Stock per variant

**Tab 7: Nutrition & Details** (for food items)

- Nutrition Facts table
- Ingredients list
- Allergen information (checkboxes)
- Country of Origin
- Manufacturer
- Shelf Life
- Storage Instructions

**Tab 8: Shipping**

- Shippable (checkbox)
- Shipping Class
- Weight
- Dimensions

- **Action Buttons**:
  - "Save as Draft"
  - "Save & Publish"
  - "Save & Add Another"
  - "Cancel"

#### 3.3 Bulk Import Products

- **Route**: `/admin/products/import`
- **Elements**:
  - "Download CSV Template" button
  - File upload (drag-drop or browse)
  - Mapping fields (if columns don't match)
  - Validation preview
  - "Import" button
  - Progress bar
  - Success/Error report

#### 3.4 Product Categories Page

- **Route**: `/admin/categories`
- **View**: Tree structure (expandable/collapsible)
- **Actions**:
  - Add New Category
  - Add Subcategory
  - Edit
  - Delete (with warning if has products)
  - Reorder (drag-drop)
- **Category Form**:
  - Name (EN)
  - Name (AR)
  - Slug
  - Parent Category (dropdown)
  - Description
  - Image/Icon
  - SEO fields
  - Display Order
  - Status (Active/Inactive)

#### 3.5 Brands Page

- **Route**: `/admin/brands`
- **List View**:
  - Brand Logo
  - Brand Name
  - Product Count
  - Status
  - Actions (Edit/Delete)
- **Add/Edit Brand**:
  - Name
  - Slug
  - Logo upload
  - Description
  - Status

#### 3.6 Inventory Management

- **Route**: `/admin/inventory`
- **Filters**:
  - Stock status
  - Category
  - Low stock threshold
- **Table**:
  - Product name
  - SKU
  - Current stock
  - Low stock threshold
  - Stock status
  - Last updated
  - Quick adjust (+/- buttons)
  - "Update Stock" button
- **Bulk Stock Update**:
  - CSV import
  - Manual bulk edit

---

### 4️⃣ **ORDER MANAGEMENT**

#### 4.1 Orders List Page

- **Route**: `/admin/orders`
- **Header**:
  - "Orders" title
  - Date range picker
  - Export button
  - Print labels button
- **Filters**:
  - Search (order number, customer name, email)
  - Status (All, Pending, Confirmed, Preparing, Out for Delivery, Delivered, Cancelled)
  - Payment Status (Paid, Unpaid, Refunded)
  - Payment Method (Card, COD)
  - Date range
- **Bulk Actions**:
  - Update status
  - Export selected
  - Print invoices
- **Orders Table**:
  - Order # (clickable)
  - Date & Time
  - Customer Name
  - Total Amount
  - Payment Method
  - Payment Status badge
  - Order Status badge
  - Delivery Date
  - Actions (View/Edit/Invoice/Track)
- **Color Coding**:
  - Pending: Yellow
  - Confirmed: Blue
  - Out for Delivery: Purple
  - Delivered: Green
  - Cancelled: Red

#### 4.2 Order Details Page

- **Route**: `/admin/orders/:id`
- **Header**:
  - Order # title
  - "Print Invoice" button
  - "Send Email" dropdown (confirmation, tracking, etc.)
  - Status dropdown (quick update)
- **Order Info Card**:
  - Order number
  - Order date & time
  - Current status with timeline
  - **Change Status Dropdown**:
    - Pending
    - Confirmed
    - Preparing
    - Out for Delivery
    - Delivered
    - Cancelled
  - Add status note (internal)
  - "Update Status" button
- **Customer Info Card**:
  - Customer name (clickable → customer profile)
  - Email
  - Phone
  - Total orders count
  - Lifetime value
  - "View Customer" link
- **Delivery Info Card**:
  - Delivery address
  - Delivery date & time slot
  - Delivery instructions
  - **Assign Driver** (dropdown if needed)
  - Driver info (if assigned)
  - "Edit" button (if not shipped)
- **Payment Info Card**:
  - Payment method
  - Payment status
  - Transaction ID
  - Amount paid
  - **Refund** button (if applicable)
- **Order Items Table**:
  - Product image
  - Product name (clickable → product)
  - SKU
  - Price
  - Quantity
  - Subtotal
  - Actions (Remove if not shipped)
- **Order Summary**:
  - Subtotal
  - Delivery fee
  - Discount (with promo code)
  - Tax
  - **Total**
- **Order Notes Section**:
  - Customer notes
  - **Admin Notes** (internal, not visible to customer):
    - Add note text area
    - "Add Note" button
    - Notes history with timestamps
- **Order Timeline** (all status changes):
  - Status
  - Date & time
  - Admin user who made change
  - Note (if any)
- **Actions**:
  - "Cancel Order" (with reason dropdown)
  - "Refund Order" → Refund modal
  - "Resend Confirmation Email"
  - "Download Invoice" (PDF)
  - "Print Invoice"
  - "Track Shipment"

#### 4.3 Refunds Page

- **Route**: `/admin/refunds`
- **Filters**:
  - Status (Pending, Approved, Rejected, Processed)
  - Date range
  - Amount range
- **Refunds Table**:
  - Refund ID
  - Order #
  - Customer
  - Amount
  - Reason
  - Status
  - Date requested
  - Actions (Approve/Reject/Process)
- **Process Refund Modal**:
  - Order details
  - Refund amount (partial/full)
  - Refund method
  - Admin notes
  - "Process Refund" button

---

### 5️⃣ **CUSTOMER MANAGEMENT**

#### 5.1 Customers List Page

- **Route**: `/admin/customers`
- **Header**:
  - "Customers" title
  - "Add Customer" button
  - Export button
- **Filters**:
  - Search (name, email, phone)
  - Registration date range
  - Status (Active, Blocked)
  - Customer group/segment
  - Lifetime value range
  - Order count range
- **Customers Table**:
  - Profile photo
  - Name
  - Email
  - Phone
  - Registration date
  - Total orders
  - Lifetime value
  - Last order date
  - Status (Active/Blocked) toggle
  - Actions (View/Edit/Block/Delete)

#### 5.2 Customer Details Page

- **Route**: `/admin/customers/:id`
- **Header**:
  - Customer name
  - "Edit Customer" button
  - "Send Notification" button
  - "Block/Unblock" toggle
- **Tabs**:

**Tab 1: Overview**

- **Customer Info Card**:
  - Photo
  - Full name
  - Email (verified badge)
  - Phone (verified badge)
  - Date of birth
  - Gender
  - Registration date
  - Last login
  - Account status
  - "Edit" button
- **Stats Cards**:
  - Total Orders
  - Lifetime Value
  - Average Order Value
  - Total Reviews
  - Active Complaints
- **Recent Activity**:
  - Last 10 activities (orders, reviews, complaints)

**Tab 2: Orders**

- Orders table (same as Orders List)
- Filters specific to this customer

**Tab 3: Addresses**

- Saved addresses list
- Default address badge
- Edit/Delete actions

**Tab 4: Payment Methods**

- Saved cards (masked)
- Default badge

**Tab 5: Wishlist**

- Products in wishlist
- View/Remove actions

**Tab 6: Reviews**

- Reviews written by customer
- Product, rating, date
- Edit/Delete actions

**Tab 7: Complaints**

- Complaints list
- Status, priority, date
- View/Resolve actions

**Tab 8: Admin Notes**

- Internal notes about customer
- Add new note
- Notes history

- **Actions Section**:
  - "Send Email" button
  - "Send Notification" button
  - "Reset Password" button
  - "Block Customer" (with reason)
  - "Delete Customer" (with confirmation)

---

### 6️⃣ **PROMOTIONS & MARKETING**

#### 6.1 Promo Codes Page

- **Route**: `/admin/promos`
- **Header**:
  - "Promo Codes" title
  - "Create Promo Code" button
- **Filters**:
  - Status (Active, Expired, Disabled)
  - Type (Percentage, Fixed, Free Delivery)
  - Date range
- **Promo Codes Table**:
  - Code
  - Type
  - Value
  - Min. order amount
  - Usage limit
  - Used count
  - Valid from
  - Valid until
  - Status
  - Actions (Edit/Disable/Delete/Duplicate)

#### 6.2 Create/Edit Promo Code

- **Route**: `/admin/promos/create` or `/admin/promos/:id/edit`
- **Form**:
  - Code (auto-generate or manual)
  - Description
  - **Discount Type**:
    - Percentage
    - Fixed Amount
    - Free Delivery
  - Discount Value
  - Minimum Order Amount
  - Maximum Discount (for percentage)
  - **Usage Limits**:
    - Total usage limit
    - Per customer limit
  - **Validity Period**:
    - Valid from date & time
    - Valid until date & time
  - **Applicable To**:
    - All products
    - Specific categories (multi-select)
    - Specific products (multi-select)
  - **Customer Eligibility**:
    - All customers
    - Specific customers
    - New customers only
    - Minimum orders count
  - Status (Active/Inactive)
  - "Save" button

#### 6.3 Banners Management

- **Route**: `/admin/banners`
- **List View**:
  - Banner preview image
  - Title
  - Link/Action
  - Display order
  - Active status toggle
  - Actions (Edit/Delete/Reorder)
- **Add/Edit Banner**:
  - Title (EN/AR)
  - Banner image upload (desktop/mobile sizes)
  - **Link Type**:
    - Product
    - Category
    - External URL
    - No link
  - Link value (product ID, category, URL)
  - Display order (drag-drop or number)
  - **Schedule**:
    - Always active
    - Scheduled (from/to dates)
  - Target audience (all/specific segments)
  - Status (Active/Inactive)

#### 6.4 Push Notifications

- **Route**: `/admin/notifications`
- **Header**:
  - "Push Notifications" title
  - "Send Notification" button
- **Tabs**:
  - Sent
  - Scheduled
  - Drafts

**Send Notification Form**:

- Title (EN/AR)
- Message (EN/AR)
- **Target Audience**:
  - All users
  - Specific customer segments
  - Specific customers (multi-select)
  - Users with abandoned carts
  - Users who haven't ordered in X days
- **Action**:
  - Open app
  - Open specific product
  - Open specific category
  - Open URL
- **Schedule**:
  - Send now
  - Schedule for later (date & time)
- Image (optional)
- "Send" / "Schedule" / "Save Draft" button

**Notifications History Table**:

- Title
- Message preview
- Target audience
- Sent date & time
- Recipients count
- Opened count
- Clicked count
- Status
- Actions (View Stats/Duplicate/Delete)

---

### 7️⃣ **COMPLAINTS & SUPPORT**

#### 7.1 Complaints Dashboard

- **Route**: `/admin/complaints/dashboard`
- **Stats Cards**:
  - Total Complaints
  - Open Complaints
  - Pending Response
  - Average Resolution Time
  - Customer Satisfaction Score
- **Charts**:
  - Complaints by Status (Pie)
  - Complaints by Category (Bar)
  - Complaints trend (Line)
  - Resolution time trend
- **Priority Breakdown**:
  - Urgent, High, Medium, Low counts

#### 7.2 Complaints List Page

- **Route**: `/admin/complaints`
- **Header**:
  - "Complaints" title
  - Export button
- **Filters Panel**:
  - Search (ticket #, customer, subject)
  - Status (Open, In Progress, Awaiting Response, Resolved, Closed)
  - Priority (Urgent, High, Medium, Low)
  - Category (dropdown)
  - Date range
  - Assigned to (admin user)
  - Has attachments
  - Rating (if resolved)
- **Bulk Actions**:
  - Assign to admin
  - Update status
  - Update priority
  - Export selected
- **Complaints Table**:
  - Ticket #
  - Customer name (clickable)
  - Subject
  - Category badge
  - Status badge (color-coded)
  - Priority badge (color-coded)
  - Date submitted
  - Last updated
  - Assigned to
  - Response time indicator
  - Unread messages badge
  - Actions (View/Assign/Close)
- **Color Coding**:
  - Urgent: Red
  - High: Orange
  - Medium: Yellow
  - Low: Gray
  - Unread: Bold

#### 7.3 Complaint Details Page

- **Route**: `/admin/complaints/:id`
- **Header**:
  - Ticket # title
  - Status dropdown (quick update)
  - Priority dropdown (quick update)
  - "Close Complaint" button
  - "Export Conversation" button
- **Complaint Info Card**:
  - Ticket number
  - Customer info (name, email, phone) with link to customer profile
  - Status badge
  - Priority badge
  - Category
  - Date submitted
  - Last updated
  - Response time (hours)
  - Resolution time (if closed)
  - **Assigned To**:
    - Dropdown to assign/reassign to admin
    - "Assign to Me" button
  - **Related Order** (if applicable):
    - Order # (clickable → order details)
    - Order date
    - Order status
- **Subject & Description Card**:
  - Subject (large)
  - Full description
  - **Attachments** (if any):
    - File thumbnails/icons
    - Download links
    - Image preview gallery
- **Message Thread** (Chat interface):
  - Customer messages (left, blue background)
  - Admin replies (right, gray background)
  - Timestamps
  - Sender name (for admins)
  - Read receipts
  - Attachments in messages
  - **Reply Box** (bottom):
    - Text area (rich text editor)
    - Attach files button
    - **Canned Responses** dropdown (pre-written templates)
    - "Send Reply" button
    - "Save as Draft" button
- **Status Update Section**:
  - Current status display
  - **Change Status**:
    - Open
    - In Progress
    - Awaiting Customer Response
    - Resolved
    - Closed
  - **Add Internal Note** (not visible to customer)
  - "Update" button
- **Timeline/Activity Log**:
  - All status changes
  - Assignments
  - Internal notes
  - Timestamps
  - Admin user who made change
- **Actions Panel**:
  - "Send Email to Customer" button
  - "Request More Info" template
  - "Mark as Resolved" button
  - "Close Complaint" button
  - "Escalate" button (to manager/higher priority)
  - "Merge with Another Ticket"
- **Customer Satisfaction** (if closed):
  - Resolution rating (1-5 stars)
  - Customer feedback
  - "Was this helpful?" response

#### 7.4 Canned Responses Page

- **Route**: `/admin/complaints/canned-responses`
- **List**:
  - Title
  - Category
  - Response text preview
  - Usage count
  - Actions (Edit/Delete/Duplicate)
- **Add/Edit**:
  - Title
  - Category
  - Response text (rich text)
  - Variables support ({{customer_name}}, {{order_number}}, etc.)
  - "Save" button

---

### 8️⃣ **REPORTS & ANALYTICS**

#### 8.1 Reports Dashboard

- **Route**: `/admin/reports`
- **Report Categories**:
  - Sales Reports
  - Inventory Reports
  - Customer Reports
  - Order Reports
  - Complaints Reports
  - Marketing Reports

#### 8.2 Sales Reports

- **Route**: `/admin/reports/sales`
- **Filters**:
  - Date range (predefined: Today, Yesterday, This Week, This Month, Custom)
  - Category
  - Product
  - Payment method
- **Reports**:
  - **Sales Summary**:
    - Total revenue
    - Total orders
    - Average order value
    - Comparison with previous period
    - Chart (line/bar)
  - **Sales by Category**:
    - Table with category, revenue, orders count
    - Percentage breakdown
    - Chart (pie/bar)
  - **Sales by Product**:
    - Top selling products
    - Revenue per product
    - Quantity sold
  - **Sales by Payment Method**:
    - Card vs COD breakdown
  - **Daily/Weekly/Monthly Sales**:
    - Detailed breakdown
    - Trend analysis
- **Export**: Excel, PDF, CSV

#### 8.3 Inventory Reports

- **Route**: `/admin/reports/inventory`
- **Reports**:
  - **Stock Levels**:
    - Current stock by product
    - Low stock items
    - Out of stock items
  - **Stock Movement**:
    - Products added/sold
    - Date range
  - **Inventory Value**:
    - Total inventory worth
    - By category
  - **Stock Alerts**:
    - Products below threshold
    - Aging stock (slow-moving items)

#### 8.4 Customer Reports

- **Route**: `/admin/reports/customers`
- **Reports**:
  - **New Customers**:
    - Registration trend
    - By date range
  - **Customer Lifetime Value**:
    - Top customers by total spend
    - Average LTV
  - **Customer Retention**:
    - Repeat purchase rate
    - Churn rate
  - **Customer Segmentation**:
    - By order frequency
    - By total spend
    - By location

#### 8.5 Order Reports

- **Route**: `/admin/reports/orders`
- **Reports**:
  - **Orders by Status**:
    - Breakdown chart
    - Pending, Delivered, Cancelled counts
  - **Average Order Value**:
    - Trend over time
    - By category
  - **Order Fulfillment**:
    - Average delivery time
    - On-time delivery rate
  - **Payment Method Breakdown**
  - **Peak Order Times**:
    - By hour, day, month

#### 8.6 Complaints Reports

- **Route**: `/admin/reports/complaints`
- **Reports**:
  - **Complaints by Category**:
    - Bar chart
    - Count and percentage
  - **Complaints by Status**:
    - Open, Resolved, Closed
  - **Average Resolution Time**:
    - By category
    - By priority
    - Trend over time
  - **Customer Satisfaction**:
    - Average rating
    - Satisfaction trend
  - **Most Common Issues**:
    - Top complaint subjects
    - Frequency analysis
  - **Admin Performance**:
    - Response time by admin
    - Resolution rate
    - Tickets handled

---

### 9️⃣ **SETTINGS & CONFIGURATION**

#### 9.1 General Settings

- **Route**: `/admin/settings/general`
- **Sections**:
  - **Store Information**:
    - Store name
    - Logo upload
    - Favicon upload
    - Tagline
    - Contact email
    - Contact phone
    - Store address
    - Operating hours
  - **Currency Settings**:
    - Currency (USD, EGP, etc.)
    - Currency symbol position
    - Decimal separator
    - Thousand separator
  - **Tax Settings**:
    - Enable tax
    - Tax rate (%)
    - Tax name
    - Include tax in prices toggle
  - **Date & Time**:
    - Timezone
    - Date format
    - Time format

#### 9.2 Delivery Settings

- **Route**: `/admin/settings/delivery`
- **Sections**:
  - **Delivery Zones**:
    - Add/Edit zones
    - Zone name
    - Area coverage (map or list)
    - Delivery fee
    - Free delivery threshold
    - Estimated delivery time
    - Active status
  - **Time Slots**:
    - Add/Edit time slots
    - Slot name (Morning, Afternoon, etc.)
    - Time range
    - Maximum orders per slot
    - Active days
  - **General Delivery**:
    - Minimum order amount
    - Express delivery fee
    - Express delivery time (hours)
    - Default delivery time

#### 9.3 Payment Settings

- **Route**: `/admin/settings/payment`
- **Payment Methods**:
  - **Credit/Debit Card**:
    - Enable toggle
    - Paymob API credentials
      - API Key
      - Integration ID
      - HMAC Secret
    - Test mode toggle
    - Accepted cards (Visa, Mastercard)
  - **Cash on Delivery**:
    - Enable toggle
    - COD fee (if any)
  - **Wallet**:
    - Enable toggle
    - Maximum wallet usage per order

#### 9.4 Notification Settings

- **Route**: `/admin/settings/notifications`
- **Email Templates**:
  - Order Confirmation
  - Order Shipped
  - Order Delivered
  - Order Cancelled
