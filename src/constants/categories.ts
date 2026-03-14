// Default categories shipped with the app

export const DEFAULT_HOUSEHOLD_CATEGORIES = [
  'House Rent',
  'Gas Bill',
  'Water Bill',
  'Electricity Bill',
  'Internet',
  'Grocery',
  'Maintenance',
];

export const DEFAULT_PERSONAL_CATEGORIES = [
  'Medicine',
  'Entertainment',
  'Subscriptions',
  'Healthcare',
];

export const DEFAULT_SHOPPING_CATEGORIES = [
  'Clothing',
  'Electronics',
  'Books',
  'Accessories',
  'Home Decor',
];

export const DEFAULT_TRANSPORT_CATEGORIES = [
  'Fuel',
  'Ride Share',
  'Parking',
  'Metro/Bus',
];

export const DEFAULT_FOOD_CATEGORIES = [
  'Restaurant',
  'Takeaway',
  'Coffee',
  'Snacks',
  'Groceries',
];

export const CATEGORY_ICONS: Record<string, string> = {
  'House Rent': 'home-outline',
  'Gas Bill': 'fire',
  'Water Bill': 'water-outline',
  'Electricity Bill': 'lightning-bolt-outline',
  Internet: 'wifi',
  Grocery: 'cart-outline',
  Maintenance: 'wrench-outline',
  Medicine: 'medical-bag',
  Entertainment: 'movie-open-outline',
  Subscriptions: 'repeat',
  Healthcare: 'hospital-box-outline',
  Clothing: 'hanger',
  Electronics: 'laptop',
  Books: 'book-open-outline',
  Accessories: 'glasses',
  'Home Decor': 'sofa-outline',
  Fuel: 'gas-station-outline',
  'Ride Share': 'car-outline',
  Parking: 'parking',
  'Metro/Bus': 'bus',
  Restaurant: 'silverware-fork-knife',
  Takeaway: 'bag-personal-outline',
  Coffee: 'coffee-outline',
  Snacks: 'food-apple-outline',
  Groceries: 'cart-outline',
};

export const DEFAULT_CATEGORY_ICON = 'tag-outline';

export const DEFAULT_EXPENSE_TYPES = [
  { name: 'household', icon: 'home-outline' },
  { name: 'personal', icon: 'account-outline' },
  { name: 'shopping', icon: 'shopping-outline' },
  { name: 'transport', icon: 'bus' },
  { name: 'food', icon: 'food-outline' },
];

export const TYPE_ICONS: Record<string, string> = {
  household: 'home-outline',
  personal: 'account-outline',
  shopping: 'shopping-outline',
  transport: 'bus',
  food: 'food-outline',
};

export const DEFAULT_TYPE_ICON = 'tag-outline';

// ─── Income Sources ──────────────────────────────────────────────────────────
export const DEFAULT_INCOME_SOURCES = [
  { name: 'salary', icon: 'briefcase-outline' },
  { name: 'freelance', icon: 'laptop' },
  { name: 'investment', icon: 'chart-line' },
  { name: 'business', icon: 'store-outline' },
  { name: 'gift', icon: 'gift-outline' },
  { name: 'other', icon: 'cash-plus' },
];

export const INCOME_SOURCE_ICONS: Record<string, string> = {
  salary: 'briefcase-outline',
  freelance: 'laptop',
  investment: 'chart-line',
  business: 'store-outline',
  gift: 'gift-outline',
  other: 'cash-plus',
};

export const DEFAULT_INCOME_ICON = 'cash-plus';

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
