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
const OTP_STORAGE_KEY = 'fashion_eye_care_customer_otp';
const DEFAULT_ADMIN = {
  id: 'admin-fashion-eye-care',
  fullName: 'Fashion Eye Care Admin',
  email: adminEmail,
  password: import.meta.env.VITE_ADMIN_PASSWORD || 'admin123',
  createdAt: new Date().toISOString(),
};

const isAdminEmail = (email = '') => String(email).trim().toLowerCase() === adminEmail;

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));
const OTP_API_URL = import.meta.env.VITE_OTP_API_URL || '/api';

const getOtpStore = () => {
  if (typeof window === 'undefined') return {};

  try {
    const saved = window.localStorage.getItem(OTP_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveOtpStore = (nextStore) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(nextStore));
};

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

  const sendOtp = async ({ email, phone }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').trim();

    if (!normalizedEmail) {
      throw new Error('Email is required to receive the OTP.');
    }

    if (!normalizedPhone) {
      throw new Error('Phone number is required for your customer profile.');
    }

    try {
      const response = await fetch(`${OTP_API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, phone: normalizedPhone }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to send OTP email.');
      }

      const otpCode = payload.devCode || generateOtpCode();
      const store = getOtpStore();
      store[normalizedEmail] = {
        code: otpCode,
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      saveOtpStore(store);

      return {
        email: normalizedEmail,
        phone: normalizedPhone,
        demoCode: otpCode,
        expiresAt: store[normalizedEmail].expiresAt,
        message: payload.message || `OTP sent to ${normalizedEmail}.`,
      };
    } catch (error) {
      const otpCode = generateOtpCode();
      const store = getOtpStore();
      store[normalizedEmail] = {
        code: otpCode,
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      saveOtpStore(store);

      const fallbackMessage = `Email OTP service is unavailable right now. Local demo code: ${otpCode}`;
      return {
        email: normalizedEmail,
        phone: normalizedPhone,
        demoCode: otpCode,
        expiresAt: store[normalizedEmail].expiresAt,
        message: fallbackMessage,
      };
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

      const store = getOtpStore();
      delete store[normalizedEmail];
      saveOtpStore(store);
      return true;
    } catch (error) {
      const store = getOtpStore();
      const record = store[normalizedEmail];

      if (!record) {
        throw error;
      }

      if (Date.now() > record.expiresAt) {
        delete store[normalizedEmail];
        saveOtpStore(store);
        throw new Error('OTP expired. Please request a new one.');
      }

      if (record.code !== normalizedOtp) {
        throw new Error('Invalid OTP. Please check the code and try again.');
      }

      delete store[normalizedEmail];
      saveOtpStore(store);
      return true;
    }
  };

  const signup = async ({ fullName, email, password, phone, isPhoneVerified = false }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').trim();

    if (!normalizedPhone) {
      throw new Error('Phone number is required.');
    }

    if (!isPhoneVerified) {
      throw new Error('Phone number must be verified before creating the account.');
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
        phone: normalizedPhone,
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
      phone: normalizedPhone,
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
