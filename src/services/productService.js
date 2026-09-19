import { collection, getDocs, query, where, orderBy, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getProducts as getLocalProducts } from '../lib/localData';

const filterProducts = (products, { categoryId, gender, brandId, featured, active = true } = {}) =>
  products.filter((product) => {
    const matchesCategory = !categoryId || product.categoryId === categoryId;
    const matchesGender = !gender || product.gender === gender || product.gender === 'unisex';
    const matchesBrand = !brandId || product.brandId === brandId;
    const matchesFeatured = featured === undefined || product.featured === featured;
    // Older catalog documents may not have an active field. Treat them as
    // visible until they are explicitly disabled, so a missing field cannot
    // empty the public shop.
    const matchesActive = active === undefined
      ? true
      : active === false
        ? product.active === false
        : product.active !== false;

    return matchesCategory && matchesGender && matchesBrand && matchesFeatured && matchesActive;
  });

export const getProducts = async ({ categoryId, gender, brandId, featured, active = true } = {}) => {
  const filters = { categoryId, gender, brandId, featured, active };
  const localFallback = filterProducts(getLocalProducts(), filters);

  if (!db) {
    return localFallback;
  }

  try {
    const productsRef = collection(db, 'products');
    // Fetch once and filter in the client. This is deliberately unfiltered:
    // Firestore's equality filter excluded every legacy document that did not
    // yet contain `active: true`.
    const snapshot = await getDocs(productsRef);
    const firestoreProducts = filterProducts(
      snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
      filters,
    );
    return firestoreProducts.length ? firestoreProducts : localFallback;
  } catch (error) {
    console.warn('Firestore product fetch failed, using local fallback data.', error);
    return localFallback;
  }
};

export const saveProductToDb = async (product) => {
  const productId = product.id || `p-${Date.now()}`;
  const payload = {
    ...product,
    id: productId,
    updatedAt: new Date().toISOString(),
    createdAt: product.createdAt || new Date().toISOString(),
    thumbnail: product.thumbnail || product.images?.[0] || '',
    images: product.images?.length ? product.images : [product.thumbnail || ''],
    active: product.active ?? true,
  };

  await setDoc(doc(db, 'products', productId), payload, { merge: true });
  return { id: productId, ...payload };
};

export const deleteProductFromDb = async (id) => {
  await deleteDoc(doc(db, 'products', id));
  return id;
};

export const getProductById = async (id) => {
  const localFallback = getLocalProducts().find((product) => product.id === id) || null;

  if (!db) {
    return localFallback;
  }

  try {
    const snap = await getDoc(doc(db, 'products', id));
    if (!snap.exists()) return localFallback;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.warn('Firestore product lookup failed, using local fallback data.', error);
    return localFallback;
  }
};

export const getFeaturedProducts = async () => {
  const localFallback = getLocalProducts().filter((product) => product.featured && product.active).slice(0, 8);

  if (!db) {
    return localFallback;
  }

  try {
    const snapshot = await getDocs(collection(db, 'products'));
    const products = filterProducts(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })), { featured: true, active: true });
    return products.length ? products.slice(0, 8) : localFallback;
  } catch (error) {
    console.warn('Firestore featured product fetch failed, using local fallback data.', error);
    return localFallback;
  }
};

export const getCategories = async () => {
  const snapshot = await getDocs(query(collection(db, 'categories'), where('active', '==', true), orderBy('order', 'asc')));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const getBrands = async () => {
  const snapshot = await getDocs(query(collection(db, 'brands'), where('active', '==', true), orderBy('name', 'asc')));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const productSearch = async (term) => {
  if (!term || !term.trim()) return [];
  const lower = term.trim().toLowerCase();
  const snapshot = await getDocs(collection(db, 'products'));
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((product) => {
      const haystack = [product.name, product.brandName, product.categoryName, product.sku, ...(product.tags || [])].join(' ').toLowerCase();
      return haystack.includes(lower);
    })
    .slice(0, 12);
};
