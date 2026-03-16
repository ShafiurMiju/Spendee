import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from '../constants';
import { Tenant, TenantInput } from '../types';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { toMonthKey } from '../utils/formatting';

const tenantsRef = () => firestore().collection(COLLECTIONS.TENANTS);

function getUserId(): string {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

// ─── Add tenant ──────────────────────────────────────────────────────────────
export async function addTenant(input: TenantInput): Promise<Tenant> {
  const userId = getUserId();
  const ref = tenantsRef().doc();
  const now = Date.now();
  const movedInAt = input.movedInAt ?? now;
  const tenant: Tenant = {
    ...input,
    id: ref.id,
    userId,
    movedInAt,
    joinMonth: toMonthKey(movedInAt),
    createdAt: now,
  };
  await ref.set(tenant);
  return tenant;
}

// ─── Update tenant ───────────────────────────────────────────────────────────
export async function updateTenant(
  id: string,
  updates: Partial<TenantInput>,
): Promise<void> {
  const userId = getUserId();
  const ref = tenantsRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Tenant not found or access denied');
  }
  await ref.update(updates);
}

// ─── Deactivate tenant ──────────────────────────────────────────────────────
export async function deactivateTenant(id: string): Promise<void> {
  const userId = getUserId();
  const ref = tenantsRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Tenant not found or access denied');
  }
  await ref.update({ isActive: false, leftAt: Date.now() });
}

// ─── Get active tenant for a specific flat ─────────────────────────────────
export async function getActiveTenantForFlat(flatId: string): Promise<Tenant | null> {
  const userId = getUserId();
  const snap = await tenantsRef()
    .where('userId', '==', userId)
    .where('flatId', '==', flatId)
    .where('isActive', '==', true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() as Tenant;
}

// ─── Get single tenant ──────────────────────────────────────────────────────
export async function getTenant(id: string): Promise<Tenant | null> {
  const userId = getUserId();
  const snap = await tenantsRef().doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() as Tenant;
  if (data.userId !== userId) return null;
  return data;
}

// ─── Get tenants active during a specific month ─────────────────────────────
// Returns tenants who occupied their flat at any point during the given month.
// This ensures historical reports show the correct tenant for each flat.
export async function getTenantsByMonth(month: string): Promise<Tenant[]> {
  const [y, m] = month.split('-').map(Number);
  const monthStart = new Date(y, m - 1, 1).getTime();
  const monthEnd   = new Date(y, m, 0, 23, 59, 59, 999).getTime();

  const all = await getTenants(false); // fetch active + inactive
  return all.filter(t => {
    const movedIn = t.movedInAt ?? t.createdAt; // fallback for old records
    if (movedIn > monthEnd) return false;        // moved in after this month
    if (!t.isActive && t.leftAt && t.leftAt < monthStart) return false; // left before this month
    return true;
  });
}

// ─── Get tenants ─────────────────────────────────────────────────────────────
export async function getTenants(activeOnly = true): Promise<Tenant[]> {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = tenantsRef().where(
    'userId',
    '==',
    userId,
  );

  const snap = await query.get();
  let results = snap.docs.map(doc => doc.data() as Tenant);

  // Filter active tenants client-side
  if (activeOnly) {
    results = results.filter(t => t.isActive);
  }

  // Sort client-side (by name ascending)
  results.sort((a, b) => a.name.localeCompare(b.name));

  return results;
}

// ─── Listen to ALL tenants in realtime (active + inactive) ──────────────────
export function onAllTenantsSnapshot(
  callback: (tenants: Tenant[]) => void,
  onError?: (error: Error) => void,
) {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = tenantsRef().where(
    'userId',
    '==',
    userId,
  );

  return query.onSnapshot(
    snap => {
      const tenants = snap.docs.map(doc => doc.data() as Tenant);
      callback(tenants);
    },
    error => onError?.(error),
  );
}

// ─── Listen to tenants in realtime ───────────────────────────────────────────
export function onTenantsSnapshot(
  callback: (tenants: Tenant[]) => void,
  onError?: (error: Error) => void,
) {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = tenantsRef().where(
    'userId',
    '==',
    userId,
  );

  return query.onSnapshot(
    snap => {
      let tenants = snap.docs.map(doc => doc.data() as Tenant);
      tenants = tenants.filter(t => t.isActive);
      tenants.sort((a, b) => a.name.localeCompare(b.name));
      callback(tenants);
    },
    error => onError?.(error),
  );
}

// ─── Listen to past (inactive) tenants in realtime ───────────────────────────
export function onPastTenantsSnapshot(
  callback: (tenants: Tenant[]) => void,
  onError?: (error: Error) => void,
) {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = tenantsRef().where(
    'userId',
    '==',
    userId,
  );

  return query.onSnapshot(
    snap => {
      let tenants = snap.docs.map(doc => doc.data() as Tenant);
      tenants = tenants.filter(t => !t.isActive);
      tenants.sort((a, b) => (b.leftAt ?? b.createdAt) - (a.leftAt ?? a.createdAt));
      callback(tenants);
    },
    error => onError?.(error),
  );
}
