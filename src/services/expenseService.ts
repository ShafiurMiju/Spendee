import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS, PAGINATION_LIMIT } from '../constants';
import { Expense, ExpenseInput, ExpenseType, DateRange } from '../types';

const expensesRef = () => firestore().collection(COLLECTIONS.EXPENSES);

function getUserId(): string {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

// ─── Add expense ─────────────────────────────────────────────────────────────
export async function addExpense(input: ExpenseInput): Promise<Expense> {
  const userId = getUserId();
  const ref = expensesRef().doc();
  const expense: Expense = {
    ...input,
    id: ref.id,
    userId,
    createdAt: Date.now(),
  };
  await ref.set(expense);
  return expense;
}

// ─── Update expense ──────────────────────────────────────────────────────────
export async function updateExpense(
  id: string,
  updates: Partial<ExpenseInput>,
): Promise<void> {
  const userId = getUserId();
  const ref = expensesRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Expense not found or access denied');
  }
  await ref.update(updates);
}

// ─── Delete expense ──────────────────────────────────────────────────────────
export async function deleteExpense(id: string): Promise<void> {
  const userId = getUserId();
  const ref = expensesRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Expense not found or access denied');
  }
  await ref.delete();
}

// ─── Get single expense ─────────────────────────────────────────────────────
export async function getExpense(id: string): Promise<Expense | null> {
  const userId = getUserId();
  const snap = await expensesRef().doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() as Expense;
  if (data.userId !== userId) return null;
  return data;
}

// ─── Get expenses with filters ───────────────────────────────────────────────
export interface ExpenseFilter {
  type?: ExpenseType;
  category?: string;
  dateRange?: DateRange;
  limit?: number;
}

export async function getExpenses(
  filter: ExpenseFilter = {},
): Promise<Expense[]> {
  const userId = getUserId();
  let query: FirebaseFirestoreTypes.Query = expensesRef().where(
    'userId',
    '==',
    userId,
  );

  if (filter.type) {
    query = query.where('type', '==', filter.type);
  }
  if (filter.category) {
    query = query.where('category', '==', filter.category);
  }
  const snap = await query.get();
  let results = snap.docs.map(doc => doc.data() as Expense);

  // Filter date range client-side to avoid needing composite indexes
  if (filter.dateRange) {
    results = results.filter(
      e => e.date >= filter.dateRange!.startDate && e.date <= filter.dateRange!.endDate,
    );
  }

  // Sort client-side (newest first)
  results.sort((a, b) => b.date - a.date);

  if (filter.limit) {
    results = results.slice(0, filter.limit);
  }

  return results;
}

// ─── Get expenses for a specific month ──────────────────────────────────────
export async function getExpensesByMonth(
  year: number,
  month: number,
): Promise<Expense[]> {
  const startDate = new Date(year, month, 1).getTime();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  return getExpenses({ dateRange: { startDate, endDate } });
}

// ─── Listen to expenses in realtime ─────────────────────────────────────────
export function onExpensesSnapshot(
  filter: ExpenseFilter,
  callback: (expenses: Expense[]) => void,
  onError?: (error: Error) => void,
) {
  const userId = getUserId();
  let query: FirebaseFirestoreTypes.Query = expensesRef().where(
    'userId',
    '==',
    userId,
  );

  if (filter.type) {
    query = query.where('type', '==', filter.type);
  }
  return query.onSnapshot(
    snap => {
      let expenses = snap.docs.map(doc => doc.data() as Expense);
      if (filter.dateRange) {
        expenses = expenses.filter(
          e => e.date >= filter.dateRange!.startDate && e.date <= filter.dateRange!.endDate,
        );
      }
      expenses.sort((a, b) => b.date - a.date);
      if (filter.limit) {
        expenses = expenses.slice(0, filter.limit);
      }
      callback(expenses);
    },
    error => onError?.(error),
  );
}

// We need this import for the query type
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
