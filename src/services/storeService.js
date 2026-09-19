import { collection, addDoc, getDocs, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import {
  saveOrder as saveLocalOrder,
  getOrders as readLocalOrders,
  saveAppointment as saveLocalAppointment,
  getAppointments as readLocalAppointments,
  saveContactMessage as saveLocalContact,
  getContactMessages as readLocalContacts,
} from '../lib/localData';

export const storeOrder = async (order) => {
  if (!isFirebaseConfigured) {
    return saveLocalOrder(order);
  }

  const ref = await addDoc(collection(db, 'orders'), {
    ...order,
    createdAt: order.createdAt || new Date().toISOString(),
  });
  return { ...order, id: ref.id };
};

export const getOrders = async () => {
  if (!isFirebaseConfigured) {
    return readLocalOrders();
  }

  const snapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50)));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const storeAppointment = async (appointment) => {
  if (!isFirebaseConfigured) {
    return saveLocalAppointment(appointment);
  }

  const ref = await addDoc(collection(db, 'appointments'), {
    ...appointment,
    createdAt: appointment.createdAt || new Date().toISOString(),
  });
  return { ...appointment, id: ref.id };
};

export const getAppointments = async () => {
  if (!isFirebaseConfigured) {
    return readLocalAppointments();
  }

  const snapshot = await getDocs(query(collection(db, 'appointments'), orderBy('createdAt', 'desc'), limit(50)));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const getOrdersForUser = async (userId) => {
  if (!userId) return [];

  if (!isFirebaseConfigured) {
    return readLocalOrders()
      .filter((order) => order.userId === userId)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  const snapshot = await getDocs(query(
    collection(db, 'orders'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50),
  ));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const subscribeToAppointments = (onChange, onError) => {
  if (!isFirebaseConfigured) {
    onChange(readLocalAppointments());
    return () => {};
  }

  return onSnapshot(
    query(collection(db, 'appointments'), orderBy('createdAt', 'desc'), limit(50)),
    (snapshot) => onChange(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
    onError,
  );
};

export const storeContactMessage = async (message) => {
  if (!isFirebaseConfigured) {
    return saveLocalContact(message);
  }

  const ref = await addDoc(collection(db, 'contactMessages'), {
    ...message,
    createdAt: message.createdAt || new Date().toISOString(),
  });
  return { ...message, id: ref.id };
};

export const getContactMessages = async () => {
  if (!isFirebaseConfigured) {
    return readLocalContacts();
  }

  const snapshot = await getDocs(query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc'), limit(50)));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};
