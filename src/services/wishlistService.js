import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getWishlist = async (uid) => {
  if (!uid) return [];
  const snap = await getDoc(doc(db, 'wishlists', uid));
  if (!snap.exists()) return [];
  return snap.data().items || [];
};

export const toggleWishlist = async (uid, productId) => {
  if (!uid) return [];
  const current = await getWishlist(uid);
  const exists = current.includes(productId);
  const next = exists ? current.filter((id) => id !== productId) : [...current, productId];
  await setDoc(doc(db, 'wishlists', uid), { items: next }, { merge: true });
  return next;
};
