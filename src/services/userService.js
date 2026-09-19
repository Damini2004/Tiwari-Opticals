import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getUserDoc = async (uid) => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateUserDoc = async (uid, fields) => {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { ...fields, updatedAt: new Date().toISOString() }, { merge: true });
};
