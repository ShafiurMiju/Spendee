import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from '../constants';
import { ExpenseTypeItem } from '../types';
import { DEFAULT_EXPENSE_TYPES } from '../constants/categories';

const typesRef = () => firestore().collection(COLLECTIONS.EXPENSE_TYPES);

function getUserId(): string {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

export async function seedDefaultExpenseTypes(): Promise<void> {
  const userId = getUserId();
  const existing = await typesRef().where('userId', '==', userId).limit(1).get();
  if (!existing.empty) return;

  const batch = firestore().batch();
  DEFAULT_EXPENSE_TYPES.forEach(({ name, icon }) => {
    const ref = typesRef().doc();
    const item: ExpenseTypeItem = {
      id: ref.id,
      userId,
      name,
      icon,
      isDefault: true,
      createdAt: Date.now(),
    };
    batch.set(ref, item);
  });
  await batch.commit();
}

export async function getExpenseTypes(): Promise<ExpenseTypeItem[]> {
  const userId = getUserId();
  const snap = await typesRef().where('userId', '==', userId).get();
  const results = snap.docs.map(doc => doc.data() as ExpenseTypeItem);
  return results.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addExpenseType(name: string, icon: string): Promise<ExpenseTypeItem> {
  const userId = getUserId();
  const ref = typesRef().doc();
  const item: ExpenseTypeItem = {
    id: ref.id,
    userId,
    name,
    icon,
    isDefault: false,
    createdAt: Date.now(),
  };
  await ref.set(item);
  return item;
}

export async function deleteExpenseType(id: string): Promise<void> {
  const userId = getUserId();
  const ref = typesRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Type not found or access denied');
  }
  if (snap.data()?.isDefault) {
    throw new Error('Cannot delete a default expense type');
  }
  await ref.delete();
}

export function onExpenseTypesSnapshot(
  callback: (types: ExpenseTypeItem[]) => void,
  onError?: (error: Error) => void,
) {
  const userId = getUserId();
  return typesRef()
    .where('userId', '==', userId)
    .onSnapshot(
      snap => {
        const results = snap.docs.map(doc => doc.data() as ExpenseTypeItem);
        callback(results.sort((a, b) => a.createdAt - b.createdAt));
      },
      error => onError?.(error),
    );
}
