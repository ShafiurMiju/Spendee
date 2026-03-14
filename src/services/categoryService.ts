import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from '../constants';
import { Category, ExpenseType } from '../types';
import {
  DEFAULT_HOUSEHOLD_CATEGORIES,
  DEFAULT_PERSONAL_CATEGORIES,
  DEFAULT_SHOPPING_CATEGORIES,
  DEFAULT_TRANSPORT_CATEGORIES,
  DEFAULT_FOOD_CATEGORIES,
} from '../constants/categories';

const categoriesRef = () => firestore().collection(COLLECTIONS.CATEGORIES);

function getUserId(): string {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

// ─── Seed default categories for a new user ──────────────────────────────────
export async function seedDefaultCategories(): Promise<void> {
  const userId = getUserId();

  // Check if user already has categories
  const existing = await categoriesRef()
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (!existing.empty) return;

  const batch = firestore().batch();

  const createEntries = (names: string[], type: ExpenseType) => {
    names.forEach(name => {
      const ref = categoriesRef().doc();
      const category: Category = {
        id: ref.id,
        userId,
        name,
        type,
        isDefault: true,
        createdAt: Date.now(),
      };
      batch.set(ref, category);
    });
  };

  createEntries(DEFAULT_HOUSEHOLD_CATEGORIES, 'household');
  createEntries(DEFAULT_PERSONAL_CATEGORIES, 'personal');
  createEntries(DEFAULT_SHOPPING_CATEGORIES, 'shopping');
  createEntries(DEFAULT_TRANSPORT_CATEGORIES, 'transport');
  createEntries(DEFAULT_FOOD_CATEGORIES, 'food');

  await batch.commit();
}

// ─── Seed categories for a specific type (for existing users with new types) ──
export async function seedCategoriesForType(type: string): Promise<void> {
  const userId = getUserId();
  const existing = await categoriesRef()
    .where('userId', '==', userId)
    .where('type', '==', type)
    .limit(1)
    .get();
  if (!existing.empty) return;

  const defaultsMap: Record<string, string[]> = {
    household: DEFAULT_HOUSEHOLD_CATEGORIES,
    personal: DEFAULT_PERSONAL_CATEGORIES,
    shopping: DEFAULT_SHOPPING_CATEGORIES,
    transport: DEFAULT_TRANSPORT_CATEGORIES,
    food: DEFAULT_FOOD_CATEGORIES,
  };

  const names = defaultsMap[type];
  if (!names) return;

  const batch = firestore().batch();
  names.forEach(name => {
    const ref = categoriesRef().doc();
    const category: Category = {
      id: ref.id,
      userId,
      name,
      type,
      isDefault: true,
      createdAt: Date.now(),
    };
    batch.set(ref, category);
  });
  await batch.commit();
}

// ─── Get all categories for the user ─────────────────────────────────────────
export async function getCategories(
  type?: ExpenseType,
): Promise<Category[]> {
  const userId = getUserId();
  let query = categoriesRef().where('userId', '==', userId);

  if (type) {
    query = query.where('type', '==', type);
  }

  const snap = await query.get();
  const results = snap.docs.map(doc => doc.data() as Category);
  // Sort in memory to avoid requiring a composite Firestore index
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Add custom category ─────────────────────────────────────────────────────
export async function addCategory(
  name: string,
  type: ExpenseType,
): Promise<Category> {
  const userId = getUserId();
  const ref = categoriesRef().doc();
  const category: Category = {
    id: ref.id,
    userId,
    name,
    type,
    isDefault: false,
    createdAt: Date.now(),
  };
  await ref.set(category);
  return category;
}

// ─── Delete custom category ──────────────────────────────────────────────────
export async function deleteCategory(id: string): Promise<void> {
  const userId = getUserId();
  const ref = categoriesRef().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    throw new Error('Category not found or access denied');
  }
  if (snap.data()?.isDefault) {
    throw new Error('Cannot delete a default category');
  }
  await ref.delete();
}

// ─── Listen to categories in realtime ────────────────────────────────────────
export function onCategoriesSnapshot(
  callback: (categories: Category[]) => void,
  onError?: (error: Error) => void,
) {
  const userId = getUserId();
  return categoriesRef()
    .where('userId', '==', userId)
    .onSnapshot(
      snap => {
        const results = snap.docs.map(doc => doc.data() as Category);
        callback(results.sort((a, b) => a.name.localeCompare(b.name)));
      },
      error => onError?.(error),
    );
}

