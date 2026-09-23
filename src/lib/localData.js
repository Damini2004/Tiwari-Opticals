import { products as defaultProducts } from '../data/products';

const readStorage = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(key, JSON.stringify(value));
};

// =========================
// USERS
// =========================

export const getUsers = () =>
  readStorage('fashion_eye_care_users', []);

export const saveUser = (user) => {
  const users = getUsers();

  const existingIndex = users.findIndex(
    (entry) => entry.email === user.email
  );

  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }

  writeStorage('fashion_eye_care_users', users);

  return user;
};

// =========================
// ORDERS
// =========================

export const getOrders = () =>
  readStorage('fashion_eye_care_orders', []);

export const saveOrder = (order) => {
  const orders = getOrders();

  const record = {
    ...order,
    id: order.id || `ORD-${Date.now()}`,
    createdAt: order.createdAt || new Date().toISOString(),
  };

  writeStorage('fashion_eye_care_orders', [
    ...orders,
    record,
  ]);

  return record;
};

// =========================
// APPOINTMENTS
// =========================

export const getAppointments = () =>
  readStorage('fashion_eye_care_appointments', []);

export const saveAppointment = (appointment) => {
  const appointments = getAppointments();

  const record = {
    ...appointment,
    id: appointment.id || `APT-${Date.now()}`,
    createdAt: appointment.createdAt || new Date().toISOString(),
  };

  writeStorage('fashion_eye_care_appointments', [
    ...appointments,
    record,
  ]);

  return record;
};

// =========================
// CONTACT MESSAGES
// =========================

// FIX:
// Previously this was incorrectly named:
// storeOrdergetContactMessages
//
// storeService.js expects:
// getContactMessages

export const getContactMessages = () =>
  readStorage('fashion_eye_care_contacts', []);

export const saveContactMessage = (message) => {
  const messages = getContactMessages();

  const record = {
    ...message,
    id: message.id || `MSG-${Date.now()}`,
    createdAt: message.createdAt || new Date().toISOString(),
  };

  writeStorage('fashion_eye_care_contacts', [
    ...messages,
    record,
  ]);

  return record;
};

// =========================
// PRODUCTS
// =========================

export const getProducts = () => {
  const storedProducts = readStorage(
    'fashion_eye_care_products',
    null
  );

  if (
    Array.isArray(storedProducts) &&
    storedProducts.length > 0
  ) {
    return storedProducts;
  }

  writeStorage(
    'fashion_eye_care_products',
    defaultProducts
  );

  return defaultProducts;
};

export const saveProducts = (productsList) => {
  const nextProducts = Array.isArray(productsList)
    ? productsList
    : defaultProducts;

  writeStorage(
    'fashion_eye_care_products',
    nextProducts
  );

  return nextProducts;
};

export const upsertProduct = (product) => {
  const productsList = getProducts();

  const record = {
    ...product,

    id: product.id || `p-${Date.now()}`,

    createdAt:
      product.createdAt ||
      new Date().toISOString(),

    updatedAt: new Date().toISOString(),

    images: product.images?.length
      ? product.images
      : [
          product.thumbnail ||
            'https://images.unsplash.com/photo-1577803947579-9f5b87d9c5f1?auto=format&fit=crop&w=1200&q=80',
        ],

    thumbnail:
      product.thumbnail ||
      product.images?.[0] ||
      'https://images.unsplash.com/photo-1577803947579-9f5b87d9c5f1?auto=format&fit=crop&w=1200&q=80',

    active: product.active ?? true,
  };

  const existingIndex = productsList.findIndex(
    (entry) => entry.id === record.id
  );

  const nextProducts = [...productsList];

  if (existingIndex >= 0) {
    nextProducts[existingIndex] = record;
  } else {
    nextProducts.unshift(record);
  }

  writeStorage(
    'fashion_eye_care_products',
    nextProducts
  );

  return record;
};

export const deleteProduct = (productId) => {
  const nextProducts = getProducts().filter(
    (product) => product.id !== productId
  );

  writeStorage(
    'fashion_eye_care_products',
    nextProducts
  );

  return nextProducts;
};

// =========================
// LOW STOCK
// =========================

export const getLowStockProducts = (products) =>
  products.filter((product) => product.stock < 10);
