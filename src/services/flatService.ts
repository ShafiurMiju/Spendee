import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from '../constants';
import { Flat, FlatInput } from '../types';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

const flatsRef = () => firestore().collection(COLLECTIONS.FLATS);

function getUserId(): string {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

export async function addFlat(input: FlatInput): Promise<Flat> {
  const userId = getUserId();
  const ref = flatsRef().doc();
  const flat: Flat = {
    ...input,
    id: ref.id,
    userId,
    createdAt: Date.now(),
  };
  await ref.set(flat);
  return flat;
}

export async function updateFlat(
  id: string,
  updates: Partial<FlatInput>,
): Promise<void> {
  const userId = getUserId();
  const ref = flatsRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Flat not found or access denied');
  }
  await ref.update(updates);
}

export async function deactivateFlat(id: string): Promise<void> {
  await updateFlat(id, { isActive: false });
}

export async function getFlats(activeOnly = true): Promise<Flat[]> {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = flatsRef().where(
    'userId',
    '==',
    userId,
  );
  const snap = await query.get();
  let results = snap.docs.map(doc => doc.data() as Flat);
  if (activeOnly) {
    results = results.filter(f => f.isActive);
  }
  results.sort((a, b) => a.flatNumber.localeCompare(b.flatNumber));
  return results;
}

export function onFlatsSnapshot(
  callback: (flats: Flat[]) => void,
  onError?: (error: Error) => void,
) {
  const userId = getUserId();
  const query: FirebaseFirestoreTypes.Query = flatsRef().where(
    'userId',
    '==',
    userId,
  );
  return query.onSnapshot(
    snap => {
      let flats = snap.docs.map(doc => doc.data() as Flat);
      flats = flats.filter(f => f.isActive);
      flats.sort((a, b) => a.flatNumber.localeCompare(b.flatNumber));
      callback(flats);
    },
    error => onError?.(error),
  );
}
