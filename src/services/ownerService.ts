import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from '../constants';
import {
  Owner,
  OwnerInput,
  OwnerContribution,
  OwnerContributionInput,
  OwnerSettlement,
  Tenant,
  RentPayment,
  RentCost,
  Flat,
} from '../types';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

const ownersRef = () => firestore().collection(COLLECTIONS.OWNERS);
const contributionsRef = () =>
  firestore().collection(COLLECTIONS.OWNER_CONTRIBUTIONS);

function getUserId(): string {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OWNERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function addOwner(input: OwnerInput): Promise<Owner> {
  const userId = getUserId();
  const ref = ownersRef().doc();
  const owner: Owner = {
    ...input,
    id: ref.id,
    userId,
    createdAt: Date.now(),
  };
  await ref.set(owner);
  return owner;
}

export async function updateOwner(
  id: string,
  updates: Partial<OwnerInput>,
): Promise<void> {
  const userId = getUserId();
  const ref = ownersRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Owner not found or access denied');
  }
  await ref.update(updates);
}

export async function deactivateOwner(id: string): Promise<void> {
  await updateOwner(id, { isActive: false });
}

export async function getOwners(activeOnly = true): Promise<Owner[]> {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = ownersRef().where(
    'userId',
    '==',
    userId,
  );
  const snap = await query.get();
  let results = snap.docs.map(doc => doc.data() as Owner);
  if (activeOnly) {
    results = results.filter(o => o.isActive);
  }
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

export function onOwnersSnapshot(
  callback: (owners: Owner[]) => void,
  onError?: (error: Error) => void,
) {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = ownersRef().where(
    'userId',
    '==',
    userId,
  );
  return query.onSnapshot(
    snap => {
      let owners = snap.docs.map(doc => doc.data() as Owner);
      owners = owners.filter(o => o.isActive);
      owners.sort((a, b) => a.name.localeCompare(b.name));
      callback(owners);
    },
    error => onError?.(error),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OWNER CONTRIBUTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function addOwnerContribution(
  input: OwnerContributionInput,
): Promise<OwnerContribution> {
  const userId = getUserId();
  const ref = contributionsRef().doc();
  const contribution: OwnerContribution = {
    ...input,
    id: ref.id,
    userId,
    createdAt: Date.now(),
  };
  await ref.set(contribution);
  return contribution;
}

export async function deleteOwnerContribution(id: string): Promise<void> {
  const userId = getUserId();
  const ref = contributionsRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Contribution not found or access denied');
  }
  await ref.delete();
}

export async function getContributionsByMonth(
  month: string,
): Promise<OwnerContribution[]> {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = contributionsRef().where(
    'userId',
    '==',
    userId,
  );
  const snap = await query.get();
  let results = snap.docs.map(doc => doc.data() as OwnerContribution);
  results = results.filter(c => c.month === month);
  results.sort((a, b) => b.date - a.date);
  return results;
}

export function onContributionsSnapshot(
  month: string,
  callback: (contributions: OwnerContribution[]) => void,
  onError?: (error: Error) => void,
) {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = contributionsRef().where(
    'userId',
    '==',
    userId,
  );
  return query.onSnapshot(
    snap => {
      let contributions = snap.docs.map(
        doc => doc.data() as OwnerContribution,
      );
      contributions = contributions.filter(c => c.month === month);
      contributions.sort((a, b) => b.date - a.date);
      callback(contributions);
    },
    error => onError?.(error),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OWNER SETTLEMENT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateOwnerSettlements(
  owners: Owner[],
  flats: Flat[],
  tenants: Tenant[],
  payments: RentPayment[],
  costs: RentCost[],
  contributions: OwnerContribution[],
): OwnerSettlement[] {
  if (owners.length === 0) return [];

  // Build flat→owner mapping
  const flatOwnerMap = new Map<string, string>();
  flats.forEach(f => flatOwnerMap.set(f.id, f.ownerId));

  // Count flats per owner for proportional share
  const ownerFlatCount = new Map<string, number>();
  owners.forEach(o => ownerFlatCount.set(o.id, 0));
  flats.forEach(f => {
    if (ownerFlatCount.has(f.ownerId)) {
      ownerFlatCount.set(f.ownerId, (ownerFlatCount.get(f.ownerId) ?? 0) + 1);
    }
  });
  const totalFlats = flats.length;

  // Shared expenses (ownerOnly is empty)
  const sharedCosts = costs.filter(c => !c.ownerOnly);
  const totalSharedCosts = sharedCosts.reduce((s, c) => s + c.amount, 0);

  return owners.map(owner => {
    const flatCount = ownerFlatCount.get(owner.id) ?? 0;

    // Rent collected from owner's flats (via tenant.flatId → flat → owner)
    const ownerFlatIds = new Set(flats.filter(f => f.ownerId === owner.id).map(f => f.id));
    const ownerTenants = tenants.filter(t => ownerFlatIds.has(t.flatId));
    const ownerTenantIds = new Set(ownerTenants.map(t => t.id));
    const ownerPayments = payments.filter(p => ownerTenantIds.has(p.tenantId));
    const totalCollected = ownerPayments.reduce((s, p) => s + p.amount, 0);

    // Their share of shared expenses (based on flat count ratio)
    const shareRatio = totalFlats > 0 ? flatCount / totalFlats : (1 / owners.length);
    const sharedExpenses = totalSharedCosts * shareRatio;

    // Expenses only for this owner
    const ownCosts = costs.filter(c => c.ownerOnly === owner.id);
    const ownExpenses = ownCosts.reduce((s, c) => s + c.amount, 0);

    // Owner's own contributions
    const ownerContribs = contributions.filter(c => c.ownerId === owner.id);
    const ownContribution = ownerContribs.reduce((s, c) => s + c.amount, 0);

    const netAmount =
      totalCollected - sharedExpenses - ownExpenses + ownContribution;

    return {
      ownerId: owner.id,
      ownerName: owner.name,
      flatCount,
      totalCollected,
      sharedExpenses: Math.round(sharedExpenses * 100) / 100,
      ownExpenses,
      ownContribution,
      netAmount: Math.round(netAmount * 100) / 100,
    };
  });
}
