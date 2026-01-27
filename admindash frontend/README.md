# ElBaraka Admin Dashboard

A comprehensive admin dashboard for managing the ElBaraka grocery delivery platform. Built with React, TypeScript, and modern web technologies.

## 🚀 Features

### 📦 Product Management
- Complete CRUD operations for products
- Barcode-based product identification
- Image upload support
- Stock management with low-stock alerts
- Multi-language support (English/Arabic)
- Category assignment
- Bulk operations

### 📁 Category Management
- Hierarchical category tree structure
- Drag-and-drop reordering
- Multi-language category names
- Active/inactive status management
- Product count tracking

### 🛒 Order Management
- Real-time order tracking
- 7-stage order lifecycle (Pending → Delivered)
- Order status updates
- Order cancellation with reasons
- Customer information display
- Payment status tracking
- Delivery address management
- Order timeline view

### 💬 Customer Support
- Support ticket management
- Message threading
- Internal notes (not visible to customers)
- Ticket assignment to support agents
- Priority levels (Low, Medium, High, Urgent)
- Status tracking (Open → Closed)
- File attachments
- SLA tracking

### 💰 Financial Management
- Revenue dashboard
- Transaction history
- Payment method breakdown
- Cash vs Online revenue tracking
- Refund processing
- Promo code management
- Financial report export (Excel/CSV)
- Payment reconciliation

### 👥 User Management
- Admin user CRUD operations
- Role-based access control:
  - Super Admin
  - Admin
  - Sales Manager
  - Accountant
  - Customer Support
- 2FA support
- Activity logging
- Session management
- Password reset

### 📊 Analytics & Reporting
- Sales analytics with charts
- Product performance metrics
- Customer insights
- Revenue trends
- Top-selling products
- Category distribution
- Customer lifetime value
- Export capabilities

## 🛠️ Technology Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + Custom Components
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Routing**: React Router v6
- **Charts**: Recharts
- **HTTP Client**: Axios

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running (Laravel)

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd barakadashboard
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and set your API base URL:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## 🎨 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Input, etc.)
│   ├── DashboardLayout.tsx
│   └── ProtectedRoute.tsx
├── pages/              # Page components
│   ├── products/       # Product management pages
│   ├── categories/     # Category management pages
│   ├── orders/         # Order management pages
│   ├── support/        # Support ticket pages
│   ├── financial/      # Financial pages
│   ├── users/          # User management pages
│   ├── analytics/      # Analytics pages
│   ├── DashboardPage.tsx
│   └── LoginPage.tsx
├── services/           # API service layer
│   ├── auth.service.ts
│   ├── product.service.ts
│   ├── category.service.ts
│   ├── order.service.ts
│   ├── support.service.ts
│   ├── financial.service.ts
│   ├── user.service.ts
│   └── analytics.service.ts
├── store/              # State management
│   └── auth.store.ts
├── lib/                # Utility functions
│   ├── api-client.ts
│   └── utils.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## 🔐 Authentication

The dashboard uses token-based authentication:

1. Login with email and password
2. Receive JWT token
3. Token stored in localStorage
4. Automatic token refresh
5. Protected routes with role-based access

### Default Credentials (Development)

```
Email: admin@elbaraka.com
Password: (check your backend seeder)
```

## 🎯 Key Features by Role

### Super Admin
- Full access to all modules
- User management
- System settings
- Activity logs

### Admin
- Most features except deleting super admins
- Cannot change user roles

### Sales Manager
- Products, Categories, Orders
- Sales analytics

### Accountant
- Financial dashboard
- Transactions
- Reports
- Refunds

### Customer Support
- Support tickets only
- View orders for context

## 📱 Responsive Design

The dashboard is fully responsive and works on:
- Desktop (1920px+)
- Laptop (1366px+)
- Tablet (768px+)
- Mobile (320px+)

## 🌐 API Integration

The dashboard communicates with a Laravel backend API. All API endpoints are documented in the backend repository.

### API Configuration

Edit `src/lib/api-client.ts` to customize:
- Base URL
- Request/Response interceptors
- Error handling
- Authentication headers

## 🎨 Customization

### Brand Colors

Edit `tailwind.config.js`:

```javascript
colors: {
  'elbaraka-primary': '#2D5A3D',    // Deep Green
  'elbaraka-secondary': '#4A7C59',  // Medium Green
  'elbaraka-accent': '#F4A259',     // Warm Orange
  'elbaraka-bg': '#F7F9F7',         // Light Mint
  'elbaraka-text': '#2C3E3A',       // Dark Green-Gray
}
```

### Adding New Features

1. Create service in `src/services/`
2. Define types in `src/types/`
3. Create page component in `src/pages/`
4. Add route in `src/main.tsx`
5. Update navigation in `src/components/DashboardLayout.tsx`

## 🧪 Development

### Code Quality

```bash
# Run linter
npm run lint

# Type checking
npx tsc --noEmit
```

### Best Practices

- Use TypeScript for type safety
- Follow component composition patterns
- Implement proper error handling
- Use React Query for server state
- Keep components small and focused
- Write reusable utility functions

## 📦 Dependencies

### Core
- `react` & `react-dom` - UI framework
- `typescript` - Type safety
- `vite` - Build tool

### Routing & State
- `react-router-dom` - Client-side routing
- `zustand` - State management
- `@tanstack/react-query` - Server state management

### Forms & Validation
- `react-hook-form` - Form handling
- `zod` - Schema validation
- `@hookform/resolvers` - Form resolvers

### UI Components
- `@radix-ui/*` - Accessible UI primitives
- `lucide-react` - Icons
- `recharts` - Charts and graphs

### Utilities
- `axios` - HTTP client
- `date-fns` - Date utilities
- `tailwindcss` - Styling
- `class-variance-authority` - Component variants
- `clsx` & `tailwind-merge` - Class management

## 🚀 Deployment

### Netlify

```bash
npm run build
# Deploy dist folder to Netlify
```

### Vercel

```bash
npm run build
# Deploy dist folder to Vercel
```

### Docker

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📝 License

This project is proprietary software for ElBaraka platform.

## 🤝 Support

For support, email support@elbaraka.com or contact the development team.

## 📚 Documentation

For detailed API documentation, see the backend repository.

## 🔄 Updates

Check the changelog for recent updates and new features.

---

**Built with ❤️ for ElBaraka**
