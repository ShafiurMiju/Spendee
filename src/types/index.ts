// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  profilePhoto: string;
  language: 'en' | 'bn';
  theme: 'default' | 'light' | 'dark';
  createdAt: number; // timestamp ms
}

// ─── Expense ─────────────────────────────────────────────────────────────────
export type ExpenseType = string;

// ─── Expense Type Item ────────────────────────────────────────────────────────
export interface ExpenseTypeItem {
  id: string;
  userId: string;
  name: string;
  icon: string;
  isDefault: boolean;
  createdAt: number;
}

export interface Expense {
  id: string;
  userId: string;
  type: ExpenseType;
  title: string;
  category: string;
  amount: number;
  date: number; // timestamp ms (represents the day)
  note: string;
  createdAt: number;
}

export type ExpenseInput = Omit<Expense, 'id' | 'userId' | 'createdAt'>;

// ─── Category ────────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  userId: string;
  name: string;
  type: ExpenseType;
  icon?: string;
  isDefault: boolean;
  createdAt: number;
}

// ─── Date Range ──────────────────────────────────────────────────────────────
export interface DateRange {
  startDate: number;
  endDate: number;
}

// ─── Chart Data ──────────────────────────────────────────────────────────────
export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlyTotal {
  month: string; // 'YYYY-MM'
  typeTotals: Record<string, number>;
  total: number;
}

// ─── Rent Collection ────────────────────────────────────────────────────────
export interface Tenant {
  id: string;
  userId: string;
  name: string;
  flatNumber: string;
  rentAmount: number;
  phone: string;
  isActive: boolean;
  createdAt: number;
}

export type TenantInput = Omit<Tenant, 'id' | 'userId' | 'createdAt'>;

export interface RentPayment {
  id: string;
  userId: string;
  tenantId: string;
  month: string; // 'YYYY-MM'
  amount: number;
  paymentDate: number; // timestamp ms
  note: string;
  createdAt: number;
}

export type RentPaymentInput = Omit<RentPayment, 'id' | 'userId' | 'createdAt'>;

export interface RentCost {
  id: string;
  userId: string;
  title: string;
  category: string;
  amount: number;
  date: number;
  month: string; // 'YYYY-MM'
  note: string;
  createdAt: number;
}

export type RentCostInput = Omit<RentCost, 'id' | 'userId' | 'createdAt'>;

export interface TenantPaymentStatus {
  tenant: Tenant;
  payment: RentPayment | null;
}

// ─── Income ─────────────────────────────────────────────────────────────────
export interface Income {
  id: string;
  userId: string;
  source: string;      // e.g. 'salary', 'freelance', 'investment'
  title: string;       // e.g. 'March Salary', 'Website Project'
  amount: number;
  date: number;        // timestamp ms
  note: string;
  createdAt: number;
}

export type IncomeInput = Omit<Income, 'id' | 'userId' | 'createdAt'>;

// ─── Navigation ──────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Main: undefined;
  AddExpense: { expense?: Expense } | undefined;
  VoiceEntry: { defaultKind?: 'expense' | 'income' } | undefined;
  ExpenseDetails: { expenseId: string };
  CategoryManagement: undefined;
  PDFExport: { source?: 'expense' | 'income' | 'rent' | 'both' } | undefined;
  AddTenant: { tenant?: Tenant } | undefined;
  TenantDetails: { tenantId: string };
  AddRentCost: { cost?: RentCost } | undefined;
  ManageTypes: undefined;
  AddIncome: { income?: Income } | undefined;
  RentReport: undefined;
};

export type BottomTabParamList = {
  Dashboard: undefined;
  Expenses: undefined;
  Income: undefined;
  Reports: undefined;
  Rent: undefined;
  Settings: undefined;
};
