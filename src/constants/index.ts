export const COLLECTIONS = {
  USERS: 'users',
  EXPENSES: 'expenses',
  CATEGORIES: 'categories',
  EXPENSE_TYPES: 'expenseTypes',
  TENANTS: 'tenants',
  RENT_PAYMENTS: 'rentPayments',
  RENT_COSTS: 'rentCosts',
  INCOME: 'income',
} as const;

export const ASYNC_STORAGE_KEYS = {
  THEME: '@spendee/theme',
  LANGUAGE: '@spendee/language',
  OFFLINE_QUEUE: '@spendee/offline_queue',
} as const;

export const PAGINATION_LIMIT = 20;
