import { auth, googleAuthProvider } from './firebase.ts';
import { signInWithPopup, signOut } from 'firebase/auth';

let currentIdToken: string | null = null;
let currentDemoUid = 'demo-candidate-01';

export interface QueuedMutation {
  id: string;
  url: string;
  body: any;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'pg_prep_arena_offline_mutations_v1';

export function getOfflineQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: QueuedMutation[]) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage quota errors
  }
}

export async function signInWithGooglePopup() {
  const result = await signInWithPopup(auth, googleAuthProvider);
  currentIdToken = await result.user.getIdToken();
  return result.user;
}

export async function signOutUser() {
  currentIdToken = null;
  await signOut(auth);
}

export function setActiveCandidateProfile(uid: string) {
  currentDemoUid = uid;
}

export function getActiveCandidateProfile() {
  return currentDemoUid;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (auth.currentUser) {
    try {
      currentIdToken = await auth.currentUser.getIdToken();
    } catch {
      // fallback if token refresh fails
    }
  }

  if (currentIdToken) {
    headers['Authorization'] = `Bearer ${currentIdToken}`;
  } else {
    headers['x-demo-user-uid'] = currentDemoUid;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMessage = `Request failed (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.error) errMessage = errJson.error;
    } catch {
      // ignore json parse failure
    }
    throw new Error(errMessage);
  }

  return response.json();
}

export async function flushOfflineMutations(): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedMutation[] = [];
  let flushedCount = 0;

  for (const item of queue) {
    try {
      await apiFetch(item.url, {
        method: 'POST',
        body: JSON.stringify(item.body),
      });
      flushedCount++;
    } catch (err: any) {
      // If server explicitly rejected due to locked section or completed exam, discard from retry queue
      if (
        err.message?.includes('locked') ||
        err.message?.includes('completed')
      ) {
        continue;
      }
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
  return flushedCount;
}

export function enqueueOfflineMutation(url: string, body: any) {
  const queue = getOfflineQueue();
  queue.push({
    id: body.eventId || `offline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    url,
    body,
    timestamp: Date.now(),
  });
  saveOfflineQueue(queue);
}
