import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getCart = async (uid) => {
  if (!uid) return [];
  const snap = await getDoc(doc(db, 'carts', uid));
  if (!snap.exists()) return [];
  return snap.data().items || [];
};

export const setCart = async (uid, items) => {
  if (!uid) return;
  await setDoc(doc(db, 'carts', uid), { items }, { merge: true });
};

export const addToCart = async (uid, item) => {
  const current = await getCart(uid);
  const index = current.findIndex((cartItem) => cartItem.productId === item.productId && cartItem.color === item.color && cartItem.size === item.size);
  if (index >= 0) {
    current[index].quantity += item.quantity || 1;
  } else {
    current.push({ ...item, addedAt: new Date().toISOString() });
  }
  await setCart(uid, current);
  return current;
};

export const updateCartItem = async (uid, productId, color, size, quantity) => {
  const current = await getCart(uid);
  const next = current.map((item) => {
    if (item.productId === productId && item.color === color && item.size === size) {
      return { ...item, quantity };
    }
    return item;
  });
  await setCart(uid, next);
  return next;
};

export const removeCartItem = async (uid, productId, color, size) => {
  const current = await getCart(uid);
  const next = current.filter((item) => !(item.productId === productId && item.color === color && item.size === size));
  await setCart(uid, next);
  return next;
};

export const clearCart = async (uid) => {
  if (!uid) return;
  await setDoc(doc(db, 'carts', uid), { items: [] }, { merge: true });
};
