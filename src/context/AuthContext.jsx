import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isAdminIdentity, isFirebaseConfigured } from '../firebase/config';
import { getUsers, saveUser } from '../lib/localData';

const AuthContext = createContext(null);

const STORAGE_KEY = 'fashion_eye_care_user';
const OTP_API_URL = import.meta.env.VITE_OTP_API_URL || '/api';

const persistUserSession = (nextUser) => {
  if (typeof window === 'undefined') return;
  if (nextUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!isFirebaseConfigured || !auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let adminProfile = null;
        if (db) {
          try {
            const userDocSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDocSnap.exists()) {
              adminProfile = userDocSnap.data();
            }
          } catch (e) {
            console.warn('Could not read admin user profile from Firestore:', e);
          }
        }

        const nextAdmin = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          fullName: adminProfile?.fullName || firebaseUser.displayName || 'Administrator',
          role: 'admin',
          isAdmin: true,
          createdAt: adminProfile?.createdAt || new Date().toISOString(),
        };

        setUser(nextAdmin);
        persistUserSession(nextAdmin);
      } else {
        // If firebaseUser is null, only clear session if the active session was an Admin.
        // Customers authenticate against the Firestore datastore and do not have a Firebase Auth session.
        const currentSaved = localStorage.getItem(STORAGE_KEY);
        if (currentSaved) {
          try {
            const parsed = JSON.parse(currentSaved);
            if (parsed?.role === 'admin' || parsed?.isAdmin) {
              setUser(null);
              persistUserSession(null);
            }
          } catch {
            setUser(null);
            persistUserSession(null);
          }
        }
      }
    });

    return unsubscribe;
  }, []);

  const sendOtp = async ({ email }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error('Email is required to receive the OTP.');
    }

    try {
      const response = await fetch(`${OTP_API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to send OTP email.');
      }

      return {
        email: normalizedEmail,
        message: payload.message || `OTP sent to ${normalizedEmail}.`,
      };
    } catch (error) {
      throw new Error(error.message || 'Unable to send OTP email.');
    }
  };

  const verifyOtp = async ({ email, otp }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedOtp = String(otp || '').trim();

    if (!normalizedEmail || !normalizedOtp) {
      throw new Error('Email and OTP are required.');
    }

    try {
      const response = await fetch(`${OTP_API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, otp: normalizedOtp }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to verify OTP.');
      }

      return true;
    } catch (error) {
      throw new Error(error.message || 'Unable to verify OTP.');
    }
  };

  const signup = async ({ fullName, email, password, isEmailVerified = false }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!isEmailVerified) {
      throw new Error('Email must be verified before creating the account.');
    }

    if (isFirebaseConfigured && db) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', normalizedEmail));
      const existingSnap = await getDocs(q);

      if (!existingSnap.empty) {
        throw new Error('An account with this email already exists. Please login instead.');
      }

      const newDocRef = doc(usersRef);
      const customerRecord = {
        id: newDocRef.id,
        uid: newDocRef.id,
        fullName: fullName?.trim() || 'Customer',
        email: normalizedEmail,
        password,
        role: 'customer',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(newDocRef, customerRecord);

      const sessionUser = {
        id: customerRecord.id,
        uid: customerRecord.id,
        fullName: customerRecord.fullName,
        email: customerRecord.email,
        role: 'customer',
        isAdmin: false,
        createdAt: customerRecord.createdAt,
      };

      setUser(sessionUser);
      persistUserSession(sessionUser);
      return sessionUser;
    }

    // LocalStorage fallback when offline or database not configured
    const existingUsers = getUsers();
    if (existingUsers.some((entry) => String(entry.email || '').toLowerCase() === normalizedEmail)) {
      throw new Error('Account already exists. Please login instead.');
    }

    const newUser = {
      id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
      fullName: fullName || 'Customer',
      email: normalizedEmail,
      password,
      role: 'customer',
      isAdmin: false,
      createdAt: new Date().toISOString(),
    };

    saveUser(newUser);
    const storedUser = { ...newUser, password: undefined };
    setUser(storedUser);
    persistUserSession(storedUser);
    return storedUser;
  };

  const login = async ({ email, password }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // 1. Try Firebase Authentication (for Admin login via Authentication Tab)
    if (isFirebaseConfigured && auth) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        const firebaseUser = userCredential.user;

        let adminProfile = null;
        if (db) {
          try {
            const userDocSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDocSnap.exists()) {
              adminProfile = userDocSnap.data();
            }
          } catch (e) {
            console.warn('Could not read admin profile from Firestore:', e);
          }
        }

        const adminUser = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          fullName: adminProfile?.fullName || firebaseUser.displayName || 'Administrator',
          role: 'admin',
          isAdmin: true,
          createdAt: adminProfile?.createdAt || new Date().toISOString(),
        };

        setUser(adminUser);
        persistUserSession(adminUser);
        return adminUser;
      } catch {
        // If not in Firebase Auth or invalid credentials, proceed to check customer in Firestore datastore
      }
    }

    // 2. Check Customer record in Firestore Datastore (users collection)
    if (isFirebaseConfigured && db) {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', normalizedEmail));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const customerDoc = snap.docs[0].data();
          if (String(customerDoc.password || '') === String(password)) {
            const customerUser = {
              id: snap.docs[0].id,
              uid: snap.docs[0].id,
              fullName: customerDoc.fullName || 'Customer',
              email: customerDoc.email,
              role: customerDoc.role || 'customer',
              isAdmin: Boolean(customerDoc.isAdmin || customerDoc.role === 'admin'),
              createdAt: customerDoc.createdAt || new Date().toISOString(),
            };

            setUser(customerUser);
            persistUserSession(customerUser);
            return customerUser;
          }
          throw new Error('Invalid email or password.');
        }
      } catch (err) {
        if (err.message === 'Invalid email or password.') throw err;
        console.warn('Firestore customer lookup failed:', err);
      }
    }

    // 3. Check localData fallback for offline testing
    const existingUsers = getUsers();
    const matched = existingUsers.find(
      (entry) =>
        String(entry.email || '').toLowerCase() === normalizedEmail &&
        String(entry.password || '') === String(password),
    );

    if (matched) {
      const safeUser = {
        ...matched,
        id: matched.id,
        uid: matched.id,
        email: String(matched.email || normalizedEmail).toLowerCase(),
        role: matched.role || 'customer',
        isAdmin: Boolean(matched.isAdmin || matched.role === 'admin'),
        password: undefined,
      };
      setUser(safeUser);
      persistUserSession(safeUser);
      return safeUser;
    }

    throw new Error('Invalid email or password.');
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }

    setUser(null);
    persistUserSession(null);
  };

  const value = useMemo(
    () => ({ user, signup, login, logout, sendOtp, verifyOtp, isAdmin: isAdminIdentity(user) }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
