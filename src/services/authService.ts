import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../constants';
import { User } from '../types';

// Configure Google Sign-In — replace webClientId with your own from Firebase Console
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
});

// ─── Sign in with Google ─────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<User> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult.data?.idToken;

  if (!idToken) {
    throw new Error('Google Sign-In failed – no ID token returned.');
  }

  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  const userCredential = await auth().signInWithCredential(googleCredential);
  const firebaseUser = userCredential.user;

  // Upsert user document in Firestore
  const userDoc = await upsertUserProfile(firebaseUser);
  return userDoc;
}

// ─── Upsert user profile ────────────────────────────────────────────────────
async function upsertUserProfile(
  firebaseUser: FirebaseAuthTypes.User,
): Promise<User> {
  const ref = firestore().collection(COLLECTIONS.USERS).doc(firebaseUser.uid);
  const snap = await ref.get();

  if (snap.exists) {
    // Merge latest Google profile info
    const updates: Partial<User> = {
      name: firebaseUser.displayName ?? '',
      email: firebaseUser.email ?? '',
      profilePhoto: firebaseUser.photoURL ?? '',
    };
    await ref.update(updates);
    return { ...snap.data(), ...updates } as User;
  }

  const newUser: User = {
    id: firebaseUser.uid,
    name: firebaseUser.displayName ?? '',
    email: firebaseUser.email ?? '',
    profilePhoto: firebaseUser.photoURL ?? '',
    language: 'en',
    theme: 'default',
    createdAt: Date.now(),
  };
  await ref.set(newUser);
  return newUser;
}

// ─── Sign in with Email & Password ──────────────────────────────────────────
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const userCredential = await auth().signInWithEmailAndPassword(
    email.trim(),
    password,
  );
  try {
    return await upsertUserProfile(userCredential.user);
  } catch {
    // Firestore unavailable — return a minimal profile from Firebase Auth
    return buildProfileFromFirebaseUser(userCredential.user);
  }
}

// ─── Register with Email & Password ─────────────────────────────────────────
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
): Promise<User> {
  const userCredential = await auth().createUserWithEmailAndPassword(
    email.trim(),
    password,
  );
  await userCredential.user.updateProfile({ displayName: name.trim() });
  const updatedUser = { ...userCredential.user, displayName: name.trim() } as any;
  try {
    return await upsertUserProfile(updatedUser);
  } catch {
    return buildProfileFromFirebaseUser(updatedUser);
  }
}

function buildProfileFromFirebaseUser(firebaseUser: FirebaseAuthTypes.User): User {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName ?? '',
    email: firebaseUser.email ?? '',
    profilePhoto: firebaseUser.photoURL ?? '',
    language: 'en',
    theme: 'default',
    createdAt: Date.now(),
  };
}

// ─── Sign out ────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  // Only revoke Google if user signed in with Google
  const isGoogleUser = await GoogleSignin.isSignedIn().catch(() => false);
  if (isGoogleUser) {
    await GoogleSignin.revokeAccess().catch(() => {});
    await GoogleSignin.signOut().catch(() => {});
  }
  await auth().signOut();
}

// ─── Auth state listener ────────────────────────────────────────────────────
export function onAuthStateChanged(
  callback: (user: FirebaseAuthTypes.User | null) => void,
) {
  return auth().onAuthStateChanged(callback);
}

// ─── Get current user profile from Firestore ────────────────────────────────
export async function getCurrentUserProfile(): Promise<User | null> {
  const uid = auth().currentUser?.uid;
  if (!uid) return null;
  const snap = await firestore()
    .collection(COLLECTIONS.USERS)
    .doc(uid)
    .get();
  return snap.exists ? (snap.data() as User) : null;
}

// ─── Update user preferences ────────────────────────────────────────────────
export async function updateUserPreferences(
  updates: Partial<Pick<User, 'language' | 'theme'>>,
): Promise<void> {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  await firestore().collection(COLLECTIONS.USERS).doc(uid).update(updates);
}
