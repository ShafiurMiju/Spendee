import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from '../constants';
import { Income, IncomeInput, DateRange } from '../types';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

const incomeRef = () => firestore().collection(COLLECTIONS.INCOME);

function getUserId(): string {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

// ─── Add income ──────────────────────────────────────────────────────────────
export async function addIncome(input: IncomeInput): Promise<Income> {
  const userId = getUserId();
  const ref = incomeRef().doc();
  const income: Income = {
    ...input,
    id: ref.id,
    userId,
    createdAt: Date.now(),
  };
  await ref.set(income);
  return income;
}

// ─── Update income ───────────────────────────────────────────────────────────
export async function updateIncome(
  id: string,
  updates: Partial<IncomeInput>,
): Promise<void> {
  const userId = getUserId();
  const ref = incomeRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Income not found or access denied');
  }
  await ref.update(updates);
}

// ─── Delete income ───────────────────────────────────────────────────────────
export async function deleteIncome(id: string): Promise<void> {
  const userId = getUserId();
  const ref = incomeRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Income not found or access denied');
  }
  await ref.delete();
}

// ─── Get single income ───────────────────────────────────────────────────────
export async function getIncome(id: string): Promise<Income | null> {
  const userId = getUserId();
  const snap = await incomeRef().doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() as Income;
  if (data.userId !== userId) return null;
  return data;
}

// ─── Get incomes with filters ────────────────────────────────────────────────
export interface IncomeFilter {
  source?: string;
  dateRange?: DateRange;
  limit?: number;
}

export async function getIncomes(filter: IncomeFilter = {}): Promise<Income[]> {
  const userId = getUserId();
  let query: FirebaseFirestoreTypes.Query = incomeRef().where(
    'userId',
    '==',
    userId,
  );

  if (filter.source) {
    query = query.where('source', '==', filter.source);
  }

  const snap = await query.get();
  let results = snap.docs.map(doc => doc.data() as Income);

  // Filter date range client-side to avoid needing composite indexes
  if (filter.dateRange) {
    results = results.filter(
      i => i.date >= filter.dateRange!.startDate && i.date <= filter.dateRange!.endDate,
    );
  }

  // Sort client-side (newest first)
  results.sort((a, b) => b.date - a.date);

  if (filter.limit) {
    results = results.slice(0, filter.limit);
  }

  return results;
}

// ─── Get incomes for a specific month ────────────────────────────────────────
export async function getIncomesByMonth(
  year: number,
  month: number,
): Promise<Income[]> {
  const startDate = new Date(year, month, 1).getTime();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  return getIncomes({ dateRange: { startDate, endDate } });
}

// ─── Listen to incomes in realtime ───────────────────────────────────────────
export function onIncomesSnapshot(
  filter: IncomeFilter,
  callback: (incomes: Income[]) => void,
  onError?: (error: Error) => void,
) {
  const userId = getUserId();
  let query: FirebaseFirestoreTypes.Query = incomeRef().where(
    'userId',
    '==',
    userId,
  );

  if (filter.source) {
    query = query.where('source', '==', filter.source);
  }

  return query.onSnapshot(
    snap => {
      let incomes = snap.docs.map(doc => doc.data() as Income);
      if (filter.dateRange) {
        incomes = incomes.filter(
          i => i.date >= filter.dateRange!.startDate && i.date <= filter.dateRange!.endDate,
        );
      }
      incomes.sort((a, b) => b.date - a.date);
      if (filter.limit) {
        incomes = incomes.slice(0, filter.limit);
      }
      callback(incomes);
    },
    error => onError?.(error),
  );
}
