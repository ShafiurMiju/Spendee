import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from '../constants';
import { RentPayment, RentPaymentInput, RentCost, RentCostInput } from '../types';

const paymentsRef = () => firestore().collection(COLLECTIONS.RENT_PAYMENTS);
const costsRef = () => firestore().collection(COLLECTIONS.RENT_COSTS);

function getUserId(): string {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENT PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Add rent payment ────────────────────────────────────────────────────────
export async function addRentPayment(
  input: RentPaymentInput,
): Promise<RentPayment> {
  const userId = getUserId();
  const ref = paymentsRef().doc();
  const payment: RentPayment = {
    ...input,
    id: ref.id,
    userId,
    createdAt: Date.now(),
  };
  await ref.set(payment);
  return payment;
}

// ─── Delete rent payment ─────────────────────────────────────────────────────
export async function deleteRentPayment(id: string): Promise<void> {
  const userId = getUserId();
  const ref = paymentsRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Rent payment not found or access denied');
  }
  await ref.delete();
}

// ─── Get payments by month ───────────────────────────────────────────────────
export async function getPaymentsByMonth(
  month: string,
): Promise<RentPayment[]> {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = paymentsRef().where(
    'userId',
    '==',
    userId,
  );

  const snap = await query.get();
  let results = snap.docs.map(doc => doc.data() as RentPayment);

  // Filter by month client-side
  results = results.filter(p => p.month === month);

  return results;
}

// ─── Get payments by tenant ──────────────────────────────────────────────────
export async function getPaymentsByTenant(
  tenantId: string,
): Promise<RentPayment[]> {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = paymentsRef().where(
    'userId',
    '==',
    userId,
  );

  const snap = await query.get();
  let results = snap.docs.map(doc => doc.data() as RentPayment);

  // Filter by tenantId client-side
  results = results.filter(p => p.tenantId === tenantId);

  // Sort client-side (newest first by paymentDate)
  results.sort((a, b) => b.paymentDate - a.paymentDate);

  return results;
}

// ─── Listen to payments in realtime ──────────────────────────────────────────
export function onPaymentsSnapshot(
  month: string,
  callback: (payments: RentPayment[]) => void,
  onError?: (error: Error) => void,
) {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = paymentsRef().where(
    'userId',
    '==',
    userId,
  );

  return query.onSnapshot(
    snap => {
      let payments = snap.docs.map(doc => doc.data() as RentPayment);
      payments = payments.filter(p => p.month === month);
      callback(payments);
    },
    error => onError?.(error),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENT COSTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Add rent cost ───────────────────────────────────────────────────────────
export async function addRentCost(input: RentCostInput): Promise<RentCost> {
  const userId = getUserId();
  const ref = costsRef().doc();
  const cost: RentCost = {
    ...input,
    id: ref.id,
    userId,
    createdAt: Date.now(),
  };
  await ref.set(cost);
  return cost;
}

// ─── Update rent cost ────────────────────────────────────────────────────────
export async function updateRentCost(
  id: string,
  updates: Partial<RentCostInput>,
): Promise<void> {
  const userId = getUserId();
  const ref = costsRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Rent cost not found or access denied');
  }
  await ref.update(updates);
}

// ─── Delete rent cost ────────────────────────────────────────────────────────
export async function deleteRentCost(id: string): Promise<void> {
  const userId = getUserId();
  const ref = costsRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Rent cost not found or access denied');
  }
  await ref.delete();
}

// ─── Get costs by month ─────────────────────────────────────────────────────
export async function getCostsByMonth(month: string): Promise<RentCost[]> {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = costsRef().where(
    'userId',
    '==',
    userId,
  );

  const snap = await query.get();
  let results = snap.docs.map(doc => doc.data() as RentCost);

  // Filter by month client-side
  results = results.filter(c => c.month === month);

  // Sort client-side (newest first by date)
  results.sort((a, b) => b.date - a.date);

  return results;
}

// ─── Listen to costs in realtime ─────────────────────────────────────────────
export function onCostsSnapshot(
  month: string,
  callback: (costs: RentCost[]) => void,
  onError?: (error: Error) => void,
) {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = costsRef().where(
    'userId',
    '==',
    userId,
  );

  return query.onSnapshot(
    snap => {
      let costs = snap.docs.map(doc => doc.data() as RentCost);
      costs = costs.filter(c => c.month === month);
      costs.sort((a, b) => b.date - a.date);
      callback(costs);
    },
    error => onError?.(error),
  );
}

// We need this import for the query type
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
