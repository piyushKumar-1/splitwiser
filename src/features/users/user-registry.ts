import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { db, firebaseAuth } from '@/lib/firebase';

export interface RegisteredUser {
  email: string;
  name: string;
  registeredAt: string;
}

const USERS_COLLECTION = 'users';

/**
 * Sign into Firebase Auth using an existing Google OAuth access token.
 * This bridges the app's Google Identity Services auth with Firebase.
 */
export async function signInToFirebase(googleAccessToken: string): Promise<void> {
  const credential = GoogleAuthProvider.credential(null, googleAccessToken);
  await signInWithCredential(firebaseAuth, credential);
}

/**
 * Register or update the current user in the Firestore directory.
 * Uses email as the document ID (lowercased) for deduplication.
 */
export async function registerUser(email: string, name: string): Promise<void> {
  const docId = email.toLowerCase();
  await setDoc(
    doc(db, USERS_COLLECTION, docId),
    {
      email: docId,
      name,
      registeredAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

/**
 * Search users by email prefix or name prefix.
 * Returns up to `maxResults` matches.
 */
export async function searchUsers(
  queryStr: string,
  maxResults = 10,
): Promise<RegisteredUser[]> {
  const q = queryStr.trim().toLowerCase();
  if (!q) return [];

  // Search by email prefix
  const emailResults = await searchByField('email', q, maxResults);

  // Search by name prefix (case-insensitive via lowercased field)
  const nameResults = await searchByNamePrefix(q, maxResults);

  // Merge and deduplicate
  const seen = new Set<string>();
  const merged: RegisteredUser[] = [];

  for (const user of [...emailResults, ...nameResults]) {
    if (!seen.has(user.email)) {
      seen.add(user.email);
      merged.push(user);
    }
    if (merged.length >= maxResults) break;
  }

  return merged;
}

async function searchByField(
  field: string,
  prefix: string,
  maxResults: number,
): Promise<RegisteredUser[]> {
  const end = prefix.slice(0, -1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1);

  const q = query(
    collection(db, USERS_COLLECTION),
    where(field, '>=', prefix),
    where(field, '<', end),
    orderBy(field),
    limit(maxResults),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as RegisteredUser);
}

async function searchByNamePrefix(
  prefix: string,
  maxResults: number,
): Promise<RegisteredUser[]> {
  // Firestore doesn't support case-insensitive queries natively.
  // We store a 'nameLower' field for prefix search.
  const end = prefix.slice(0, -1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1);

  const q = query(
    collection(db, USERS_COLLECTION),
    where('nameLower', '>=', prefix),
    where('nameLower', '<', end),
    orderBy('nameLower'),
    limit(maxResults),
  );

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as RegisteredUser);
  } catch {
    // nameLower field might not exist yet for older users
    return [];
  }
}

/**
 * Register user with the nameLower field for search support.
 * `registered: true` means the user signed into the app themselves.
 */
export async function registerUserWithSearch(email: string, name: string): Promise<void> {
  const docId = email.toLowerCase();
  await setDoc(
    doc(db, USERS_COLLECTION, docId),
    {
      email: docId,
      name,
      nameLower: name.toLowerCase(),
      registered: true,
      registeredAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

/**
 * Add a user to the directory who was manually added to a group
 * but hasn't signed into the app themselves.
 * Uses `merge: true` so it won't overwrite if they already exist.
 * Sets `registered: false` only if the doc doesn't already exist.
 */
export async function ensureUserInDirectory(email: string, name: string): Promise<void> {
  const docId = email.toLowerCase();
  const { getDoc: getDocument } = await import('firebase/firestore');
  const docRef = doc(db, USERS_COLLECTION, docId);
  const existing = await getDocument(docRef);

  if (!existing.exists()) {
    await setDoc(docRef, {
      email: docId,
      name,
      nameLower: name.toLowerCase(),
      registered: false,
      addedAt: new Date().toISOString(),
    });
  }
}
