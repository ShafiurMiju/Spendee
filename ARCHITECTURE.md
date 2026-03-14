# Spendee — Expense Management App

A production-ready React Native CLI application for household and personal expense tracking, powered by Firebase.

---

## Tech Stack & Library Choices

| Area | Library | Why |
|---|---|---|
| **Navigation** | `@react-navigation/native` + `native-stack` + `bottom-tabs` | Industry standard; native transitions, deep linking, type-safe params |
| **State / Data** | React Context + Firebase real-time listeners | No need for Redux — Firebase snapshots push state; Context handles auth & theme |
| **Backend** | `@react-native-firebase/*` | Official Firebase SDK; native performance, offline persistence out-of-the-box |
| **Auth** | `@react-native-google-signin/google-signin` | Best-maintained Google Sign-In library for RN |
| **Charts** | `react-native-chart-kit` | Pie + Bar charts, simple API, SVG-based |
| **PDF** | `react-native-html-to-pdf` | Generate PDF from HTML templates; no server needed |
| **Share** | `react-native-share` | Native share sheet for exporting PDFs |
| **i18n** | `i18next` + `react-i18next` | Most popular i18n solution; async language detection, namespace support |
| **Date picker** | `@react-native-community/datetimepicker` | Official community date/time picker |
| **Storage** | `@react-native-async-storage/async-storage` | Lightweight key-value store for preferences & offline queue |
| **Network** | `@react-native-community/netinfo` | Detect connectivity for offline sync |

---

## Folder Structure

```
Spendee/
├── src/
│   ├── App.tsx                        # Root component (providers, navigation)
│   ├── assets/
│   │   ├── fonts/
│   │   └── images/
│   ├── components/
│   │   ├── common/                    # Button, Input, Card, LoadingOverlay, EmptyState
│   │   ├── charts/                    # Chart wrapper components
│   │   └── expense/                   # ExpenseListItem
│   ├── config/
│   │   └── firebase.ts               # Firebase init
│   ├── constants/
│   │   ├── index.ts                   # Collection names, storage keys
│   │   └── categories.ts             # Default categories, colors
│   ├── contexts/
│   │   ├── AuthContext.tsx            # Auth state, sign-in/out
│   │   └── ThemeContext.tsx           # Theme preference, system detection
│   ├── hooks/                         # Custom hooks (future)
│   ├── i18n/
│   │   ├── index.ts                   # i18next config
│   │   └── locales/
│   │       ├── en.json
│   │       └── bn.json
│   ├── navigation/
│   │   └── AppNavigator.tsx           # Stack + Tab navigators
│   ├── screens/
│   │   ├── splash/SplashScreen.tsx
│   │   ├── auth/LoginScreen.tsx
│   │   ├── dashboard/DashboardScreen.tsx
│   │   ├── expense/
│   │   │   ├── ExpenseListScreen.tsx
│   │   │   ├── AddExpenseScreen.tsx
│   │   │   └── ExpenseDetailsScreen.tsx
│   │   ├── reports/
│   │   │   ├── ReportsScreen.tsx
│   │   │   └── PDFExportScreen.tsx
│   │   ├── category/CategoryManagementScreen.tsx
│   │   └── settings/SettingsScreen.tsx
│   ├── services/
│   │   ├── authService.ts             # Google sign-in, user CRUD
│   │   ├── expenseService.ts          # Expense CRUD, filters, snapshots
│   │   ├── categoryService.ts         # Category CRUD, seeding
│   │   ├── pdfService.ts              # HTML→PDF generation & share
│   │   ├── offlineService.ts          # Offline queue & sync
│   │   └── index.ts
│   ├── store/slices/                  # Reserved for Redux/Zustand if needed
│   ├── theme/
│   │   └── index.ts                   # Light/Dark palettes, spacing, typography
│   ├── types/
│   │   └── index.ts                   # TypeScript interfaces
│   └── utils/
│       ├── formatting.ts              # Currency, date, color helpers
│       └── index.ts
├── firestore.rules                    # Security rules
├── firestore.indexes.json             # Composite indexes
├── android/                           # Native Android project
├── ios/                               # Native iOS project
└── package.json
```

---

## Firestore Database Schema

### `users` collection

```
users/{userId}
{
  id: string              // Firebase Auth UID
  name: string            // From Google profile
  email: string
  profilePhoto: string    // URL
  language: "en" | "bn"
  theme: "default" | "light" | "dark"
  createdAt: number       // timestamp ms
}
```

### `expenses` collection

```
expenses/{expenseId}
{
  id: string
  userId: string          // FK → users
  type: "household" | "personal"
  title: string
  category: string
  amount: number
  date: number            // timestamp ms
  note: string
  createdAt: number
}
```

### `categories` collection

```
categories/{categoryId}
{
  id: string
  userId: string          // FK → users
  name: string
  type: "household" | "personal"
  icon?: string
  isDefault: boolean
  createdAt: number
}
```

### Why this schema scales well

1. **Flat collections** — No sub-collections means simpler queries and better support for composite indexes.
2. **userId field + security rules** — Every document carries its owner's ID, so queries are always scoped to one user and Firestore rules enforce access control.
3. **Composite indexes** — Pre-defined indexes on `(userId, date)`, `(userId, type, date)`, and `(userId, category, date)` enable fast filtered queries without client-side sorting.
4. **No joins** — Categories are stored by name in expenses, not by reference, avoiding the need for joins and enabling offline-first reads.
5. **Timestamp-based dates** — Store dates as millisecond timestamps for uniform querying with range operators (`>=`, `<=`).

---

## Security Rules Summary

Defined in `firestore.rules`:

- **users**: Read/write only if `request.auth.uid == userId`
- **expenses**: CRUD only if the `userId` field matches the authenticated user
- **categories**: CRUD only if the `userId` field matches the authenticated user
- **Default deny** for everything else

---

## Implementation Plan

### Step 1: Project Setup
- [x] `npx @react-native-community/cli init Spendee`
- [x] Create folder structure
- [x] Install all dependencies
- [x] Configure TypeScript types

### Step 2: Firebase Integration
- [ ] Create Firebase project at console.firebase.google.com
- [ ] Download `google-services.json` → `android/app/`
- [ ] Download `GoogleService-Info.plist` → `ios/`
- [ ] Enable Google Sign-In in Firebase Auth
- [ ] Deploy Firestore security rules
- [ ] Deploy Firestore indexes

### Step 3: Authentication
- [x] `authService.ts` — Google sign-in, sign-out, session persistence
- [x] `AuthContext.tsx` — Global auth state
- [x] `LoginScreen.tsx` — Login UI
- [x] Auto-redirect based on auth state

### Step 4: Expense CRUD
- [x] `expenseService.ts` — Add, update, delete, filter, real-time listener
- [x] `AddExpenseScreen.tsx` — Form with type toggle, category selector, date picker
- [x] `ExpenseListScreen.tsx` — Filterable list with FAB
- [x] `ExpenseDetailsScreen.tsx` — Detail view with edit/delete

### Step 5: Dashboard
- [x] `DashboardScreen.tsx` — Monthly summary, household/personal split, recent expenses, quick-add

### Step 6: Reports
- [x] `ReportsScreen.tsx` — Date range picker, Pie chart (categories), Bar chart (household vs personal), legend table

### Step 7: PDF Export
- [x] `pdfService.ts` — HTML template → PDF generation
- [x] `PDFExportScreen.tsx` — Date range selection, generate & share

### Step 8: Settings & Extras
- [x] `SettingsScreen.tsx` — Profile, language switch, theme switch, navigation to categories & PDF
- [x] `CategoryManagementScreen.tsx` — Add/delete custom categories
- [x] i18n with Bengali + English
- [x] Light/Dark/System theme
- [x] Offline queue & auto-sync

---

## Firebase Setup Instructions

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project called "Spendee"
3. Enable **Google Analytics** (optional)

### 2. Add Android App
1. Register app with package name: `com.spendee`
2. Download `google-services.json`
3. Place it in `android/app/google-services.json`

### 3. Add iOS App
1. Register app with bundle ID: `com.spendee`
2. Download `GoogleService-Info.plist`
3. Add to Xcode project root

### 4. Enable Google Sign-In
1. Go to **Authentication → Sign-in method**
2. Enable **Google** provider
3. Copy the **Web client ID** and replace `YOUR_WEB_CLIENT_ID` in `src/services/authService.ts`

### 5. Enable Firestore
1. Go to **Firestore Database → Create database**
2. Choose **production mode**
3. Deploy the security rules from `firestore.rules`

### 6. Deploy Indexes
```bash
firebase deploy --only firestore:indexes
```

---

## Running the App

```bash
# Install dependencies
cd Spendee
npm install

# iOS
cd ios && bundle install && bundle exec pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

---

## Key Code Examples

### Firebase Google Login
```typescript
// src/services/authService.ts
export async function signInWithGoogle(): Promise<User> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult.data?.idToken;
  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  const userCredential = await auth().signInWithCredential(googleCredential);
  return upsertUserProfile(userCredential.user);
}
```

### Add Expense
```typescript
// src/services/expenseService.ts
export async function addExpense(input: ExpenseInput): Promise<Expense> {
  const userId = getUserId();
  const ref = expensesRef().doc();
  const expense: Expense = { ...input, id: ref.id, userId, createdAt: Date.now() };
  await ref.set(expense);
  return expense;
}
```

### Fetch Filtered Expenses
```typescript
// Fetch expenses for a date range
const data = await getExpenses({
  type: 'household',
  dateRange: { startDate: startOfMonth, endDate: endOfMonth },
});
```

### Generate PDF Report
```typescript
// src/services/pdfService.ts
const file = await RNHTMLtoPDF.convert({ html, fileName: 'report', directory: 'Documents' });
await Share.open({ url: `file://${file.filePath}`, type: 'application/pdf' });
```

---

## NPM Packages Summary

### Production Dependencies
| Package | Purpose |
|---|---|
| `@react-native-firebase/app` | Firebase core |
| `@react-native-firebase/auth` | Authentication |
| `@react-native-firebase/firestore` | Cloud Firestore |
| `@react-native-google-signin/google-signin` | Google OAuth |
| `@react-navigation/native` | Navigation core |
| `@react-navigation/native-stack` | Stack navigator |
| `@react-navigation/bottom-tabs` | Tab navigator |
| `react-native-screens` | Native screen optimization |
| `react-native-safe-area-context` | Safe area handling |
| `@react-native-async-storage/async-storage` | Local key-value storage |
| `@react-native-community/datetimepicker` | Date/time picker |
| `@react-native-community/netinfo` | Network status |
| `react-native-chart-kit` | Charts (Pie + Bar) |
| `react-native-svg` | SVG rendering (chart dependency) |
| `react-native-html-to-pdf` | PDF generation |
| `react-native-share` | Native share sheet |
| `i18next` | Internationalization core |
| `react-i18next` | React bindings for i18next |
