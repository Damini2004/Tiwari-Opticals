import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';

export const setAdminRoleForUser = async (uid, isAdminValue = true) => {
  if (!db || !uid) return null;
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    isAdmin: Boolean(isAdminValue),
    role: isAdminValue ? 'admin' : 'customer',
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return { uid, isAdmin: Boolean(isAdminValue), role: isAdminValue ? 'admin' : 'customer' };
};

export const registerUser = async ({ email, password, fullName }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (normalizedEmail === 'admin@fashioneyecare.com') {
    throw new Error('Admin credentials are reserved for the site administrator.');
  }

  const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const user = userCredential.user;

  if (!user.emailVerified) {
    await sendEmailVerification(user);
  }

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    fullName,
    email: user.email,
    phone: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    avatar: '',
  }, { merge: true });

  return user;
};

export const loginUser = async ({ email, password }) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = async () => signOut(auth);
export const resetPassword = async (email) => sendPasswordResetEmail(auth, email);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    fullName: user.displayName || 'Google User',
    email: user.email,
    phone: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    avatar: user.photoURL || '',
  }, { merge: true });

  return user;
};

export const onAuthChanged = (callback) => onAuthStateChanged(auth, callback);

export const signInWithPhone = async ({ phoneNumber, appVerifier }) => {
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier || new RecaptchaVerifier(auth, 'otp-recaptcha', {}));
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};
