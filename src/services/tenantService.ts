import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from '../constants';
import { Tenant, TenantInput } from '../types';

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
  const tenant: Tenant = {
    ...input,
    id: ref.id,
    userId,
    createdAt: Date.now(),
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
  await updateTenant(id, { isActive: false });
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

  // Sort client-side (by flatNumber ascending)
  results.sort((a, b) => a.flatNumber.localeCompare(b.flatNumber));

  return results;
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
      tenants.sort((a, b) => a.flatNumber.localeCompare(b.flatNumber));
      callback(tenants);
    },
    error => onError?.(error),
  );
}

// We need this import for the query type
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
