import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { User } from '../types';
import {
  onAuthStateChanged,
  getCurrentUserProfile,
  signInWithGoogle as googleSignIn,
  signInWithEmail as emailSignIn,
  signUpWithEmail as emailSignUp,
  signOut as firebaseSignOut,
} from '../services/authService';
import { seedDefaultCategories } from '../services/categoryService';

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseAuthTypes.User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  firebaseUser: null,
  loading: true,
  signIn: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseAuthTypes.User | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async fbUser => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const profile = await getCurrentUserProfile();
          setUser(profile);
        } catch {
          // Firestore may not be set up yet — allow auth to proceed
          setUser(null);
        }
        // Seed categories if not done yet (e.g. Firestore was unavailable at signup)
        seedDefaultCategories().catch(() => {});
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async () => {
    setLoading(true);
    try {
      const userProfile = await googleSignIn();
      setUser(userProfile);
      await seedDefaultCategories().catch(() => {});
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const userProfile = await emailSignIn(email, password);
      setUser(userProfile);
      await seedDefaultCategories().catch(() => {});
    } finally {
      setLoading(false);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const userProfile = await emailSignUp(email, password, name);
      setUser(userProfile);
      await seedDefaultCategories().catch(() => {});
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await getCurrentUserProfile();
    setUser(profile);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, signIn, signInWithEmail, signUpWithEmail, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
