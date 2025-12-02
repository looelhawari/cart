# 🛒 ElBaraka - E-commerce Mobile App

A full-stack e-commerce mobile application built with React Native (Expo) and Laravel backend.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)

## ✨ Features

### User Features

- 🔐 Authentication (Email/Phone OTP, Social Login - Google, Apple)
- 👤 Profile Management with Avatar Upload (Cloudinary)
- 📍 Multiple Delivery Addresses Management
- 🔒 Secure Password Change
- 🛍️ Product Browsing & Search
- 🛒 Shopping Cart
- 💳 Multiple Payment Methods
- 📦 Order Tracking
- ⭐ Product Reviews & Ratings
- 🎁 Deals & Flash Sales
- ❤️ Favorites/Wishlist
- 💰 Wallet System
- 📱 Push Notifications
- 🌐 Multi-language Support (Arabic/English)

### Admin Features

- Product Management
- Order Management
- User Management
- Analytics Dashboard

## 🛠 Tech Stack

### Frontend

- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router (File-based routing)
- **State Management**: Zustand
- **Styling**: StyleSheet (Native)
- **Icons**: Lucide React Native
- **Language**: TypeScript

### Backend

- **Framework**: Laravel 11
- **Authentication**: Laravel Sanctum
- **Database**: MySQL
- **Image Storage**: Cloudinary
- **Mail**: SMTP (Gmail)
- **API**: RESTful API

## 📁 Project Structure

```
BBB/
├── frontend/                 # React Native app
│   ├── app/                 # Expo Router screens
│   │   ├── (auth)/         # Auth screens
│   │   ├── (tabs)/         # Main tab screens
│   │   ├── profile/        # Profile-related screens
│   │   ├── categories/     # Category screens
│   │   ├── checkout/       # Checkout flow
│   │   └── ...
│   ├── components/          # Reusable components
│   ├── constants/           # Colors, Typography, Spacing
│   ├── services/            # API services
│   │   └── api/            # Organized API modules
│   ├── store/              # Zustand store
│   └── types/              # TypeScript types
│
├── backend/                 # Laravel API
│   ├── app/
│   │   ├── Http/
│   │   │   └── Controllers/
│   │   │       └── Api/    # API Controllers
│   │   ├── Models/         # Eloquent Models
│   │   └── Services/       # Service classes
│   ├── config/             # Configuration files
│   ├── database/           # Migrations & seeders
│   └── routes/
│       └── api.php         # API routes
│
└── docs/                    # Documentation files
```

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PHP 8.2 or higher
- Composer
- MySQL
- Expo CLI
- Android Studio / Xcode (for emulators)

### Backend Setup

1. **Navigate to backend directory**

   ```bash
   cd backend
   ```

2. **Install PHP dependencies**

   ```bash
   composer install
   ```

3. **Copy environment file**

   ```bash
   cp .env.example .env
   ```

4. **Generate application key**

   ```bash
   php artisan key:generate
   ```

5. **Configure database**
   - Create a MySQL database named `elbaraka`
   - Update `.env` with your database credentials:
     ```env
     DB_DATABASE=elbaraka
     DB_USERNAME=root
     DB_PASSWORD=your_password
     ```

6. **Configure Cloudinary** (for image uploads)
   - Sign up at https://cloudinary.com
   - Add credentials to `.env`:
     ```env
     CLOUDINARY_CLOUD_NAME=your_cloud_name
     CLOUDINARY_API_KEY=your_api_key
     CLOUDINARY_API_SECRET=your_api_secret
     ```

7. **Run migrations**

   ```bash
   php artisan migrate
   ```

8. **Seed database** (optional)

   ```bash
   php artisan db:seed
   ```

9. **Start development server**
   ```bash
   php artisan serve
   ```
   Server will run at `http://127.0.0.1:8000`

### Frontend Setup

1. **Navigate to frontend directory**

   ```bash
   cd frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Copy environment file**

   ```bash
   cp .env.example .env
   ```

4. **Configure API URL** (in `services/api/base.ts`)
   - For Android Emulator: `http://10.0.2.2:8000/api/v1`
   - For iOS Simulator: `http://localhost:8000/api/v1`
   - For Physical Device: `http://YOUR_IP:8000/api/v1`

5. **Start Expo dev server**

   ```bash
   npx expo start
   ```

6. **Run on device/emulator**
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app for physical device

## 🔐 Environment Variables

### Backend (.env)

**Required:**

- `APP_KEY` - Laravel application key
- `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` - Database credentials
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - Cloudinary credentials

**Optional:**

- `MAIL_USERNAME`, `MAIL_PASSWORD` - Email credentials for OTP
- `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_WEB_CLIENT_SECRET` - Google OAuth
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` - Apple OAuth

### Frontend (.env)

```env
API_URL=http://10.0.2.2:8000/api/v1
```

## 📱 Running the Application

### Development Mode

**Backend:**

```bash
cd backend
php artisan serve
```

**Frontend:**

```bash
cd frontend
npx expo start
```

### Production Build

**Frontend (Android):**

```bash
cd frontend
eas build --platform android
```

**Frontend (iOS):**

```bash
cd frontend
eas build --platform ios
```

## 📚 API Documentation

### Base URL

```
http://127.0.0.1:8000/api/v1
```

### Authentication Endpoints

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `POST /auth/verify-email` - Verify email OTP
- `POST /auth/verify-phone` - Verify phone OTP
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/refresh-token` - Refresh access token

### Profile Endpoints

- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update profile
- `POST /auth/upload-avatar` - Upload avatar
- `DELETE /auth/delete-avatar` - Delete avatar
- `POST /auth/change-password` - Change password

### Address Endpoints

- `GET /addresses` - Get all addresses
- `POST /addresses` - Create address
- `GET /addresses/{id}` - Get single address
- `PUT /addresses/{id}` - Update address
- `DELETE /addresses/{id}` - Delete address
- `POST /addresses/{id}/default` - Set as default

For complete API documentation, see [apis.md](./apis.md)

## 🧪 Testing

See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for comprehensive testing guide.

## 📖 Additional Documentation

- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Setup & Testing Guide](./SETUP_AND_TESTING_GUIDE.md)
- [Security Implementation](./SECURITY_IMPLEMENTATION.md)
- [API Specifications](./apis.md)
- [Project Instructions](./project-instructions.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and confidential.

## 👥 Team

ElBaraka Development Team

---

**Note:** Make sure to never commit `.env` files to version control. Use `.env.example` as a template.
