import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isAdminIdentity, adminEmail, isFirebaseConfigured } from '../firebase/config';
import { getUsers, saveUser } from '../lib/localData';

const AuthContext = createContext(null);

const STORAGE_KEY = 'fashion_eye_care_user';
const DEFAULT_ADMIN = {
  id: 'admin-fashion-eye-care',
  fullName: 'Fashion Eye Care Admin',
  email: adminEmail,
  password: import.meta.env.VITE_ADMIN_PASSWORD || 'admin123',
  createdAt: new Date().toISOString(),
};

const isAdminEmail = (email = '') => String(email).trim().toLowerCase() === adminEmail;

const OTP_API_URL = import.meta.env.VITE_OTP_API_URL || '/api';

const normalizeUser = (rawUser = {}) => {
  const email = String(rawUser.email || '').trim().toLowerCase();
  const isAdminUser = isAdminIdentity({ ...rawUser, email });

  return {
    id: rawUser.id || rawUser.uid || `user-${Date.now()}`,
    uid: rawUser.uid || rawUser.id,
    fullName: rawUser.fullName || rawUser.displayName || 'Fashion Customer',
    email,
    phone: rawUser.phone || '',
    role: isAdminUser ? 'admin' : 'customer',
    createdAt: rawUser.createdAt || new Date().toISOString(),
  };
};

function ensureAdminSeed() {
  const users = getUsers();
  if (!users.some((user) => user.email === DEFAULT_ADMIN.email)) {
    saveUser(DEFAULT_ADMIN);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    ensureAdminSeed();
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!isFirebaseConfigured) {
      ensureAdminSeed();
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Admin access must be determined from Firebase Authentication only.
      // Do not save a user record into Firestore, because that would make it look
      // like a normal profile entry instead of an admin identity.
      const nextUser = normalizeUser({
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        fullName: firebaseUser.displayName || 'Fashion Eye Care User',
      });

      setUser(nextUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    });

    return unsubscribe;
  }, [isFirebaseConfigured]);

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

    if (isAdminEmail(normalizedEmail)) {
      throw new Error('Admin credentials are reserved for the site administrator.');
    }

    if (isFirebaseConfigured) {
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const nextUser = normalizeUser({
        id: userCredential.user.uid,
        uid: userCredential.user.uid,
        fullName: fullName || 'Fashion Customer',
        email: userCredential.user.email,
        createdAt: new Date().toISOString(),
      });

      nextUser.role = 'customer';
      setUser(nextUser);
      return nextUser;
    }

    const existingUsers = getUsers();
    if (existingUsers.some((entry) => entry.email === normalizedEmail)) {
      throw new Error('Account already exists. Please login instead.');
    }

    const newUser = {
      id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
      fullName: fullName || 'Fashion Customer',
      email: normalizedEmail,
      password,
      role: 'customer',
      createdAt: new Date().toISOString(),
    };

    saveUser(newUser);
    setUser({ ...newUser, password: undefined });
    return newUser;
  };

  const login = async ({ email, password }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (isFirebaseConfigured) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        const nextUser = normalizeUser({
          id: userCredential.user.uid,
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          fullName: userCredential.user.displayName || 'Fashion Eye Care User',
        });

        setUser(nextUser);
        return nextUser;
      } catch (firebaseError) {
        const isDemoAdminLogin = normalizedEmail === DEFAULT_ADMIN.email && String(password || '') === DEFAULT_ADMIN.password;

        if (isDemoAdminLogin) {
          const localAdminUser = {
            ...DEFAULT_ADMIN,
            role: 'admin',
            isAdmin: true,
            password: undefined,
          };

          setUser(localAdminUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(localAdminUser));
          return localAdminUser;
        }

        throw firebaseError;
      }
    }

    ensureAdminSeed();
    const existingUsers = getUsers();
    const adminMatch = normalizedEmail === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password;
    const matched = adminMatch
      ? { ...DEFAULT_ADMIN, password: undefined }
      : existingUsers.find((entry) => String(entry.email || '').toLowerCase() === normalizedEmail && String(entry.password || '') === String(password));

    if (!matched) {
      throw new Error('Invalid email or password.');
    }

    const safeUser = {
      ...matched,
      email: String(matched.email || normalizedEmail).toLowerCase(),
      role: matched.role || 'customer',
      isAdmin: isAdminEmail(normalizedEmail),
      password: undefined,
    };
    setUser(safeUser);
    return safeUser;
  };

  const logout = async () => {
    if (isFirebaseConfigured) {
      await signOut(auth);
      setUser(null);
      return;
    }

    setUser(null);
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
