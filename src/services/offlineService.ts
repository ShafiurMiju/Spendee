import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ASYNC_STORAGE_KEYS } from '../constants';
import { addExpense } from './expenseService';
import { ExpenseInput } from '../types';

interface QueuedAction {
  type: 'ADD_EXPENSE';
  payload: ExpenseInput;
  timestamp: number;
}

// ─── Queue an action for offline processing ──────────────────────────────────
export async function queueOfflineAction(action: QueuedAction): Promise<void> {
  const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.OFFLINE_QUEUE);
  const queue: QueuedAction[] = raw ? JSON.parse(raw) : [];
  queue.push(action);
  await AsyncStorage.setItem(
    ASYNC_STORAGE_KEYS.OFFLINE_QUEUE,
    JSON.stringify(queue),
  );
}

// ─── Process all queued actions ─────────────────────────────────────────────
export async function processOfflineQueue(): Promise<number> {
  const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.OFFLINE_QUEUE);
  if (!raw) return 0;

  const queue: QueuedAction[] = JSON.parse(raw);
  if (queue.length === 0) return 0;

  let processed = 0;
  const remaining: QueuedAction[] = [];

  for (const action of queue) {
    try {
      if (action.type === 'ADD_EXPENSE') {
        await addExpense(action.payload);
        processed++;
      }
    } catch {
      remaining.push(action);
    }
  }

  await AsyncStorage.setItem(
    ASYNC_STORAGE_KEYS.OFFLINE_QUEUE,
    JSON.stringify(remaining),
  );

  return processed;
}

// ─── Start listening for connectivity changes and process queue ──────────────
export function startOfflineSync(): () => void {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      processOfflineQueue().catch(() => {});
    }
  });
  return unsubscribe;
}

// ─── Check if currently online ──────────────────────────────────────────────
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!state.isConnected;
}
