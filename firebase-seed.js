import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { products, categories, brands } from './src/data/products.js';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCxPyGHWYVh0BbmguqWgrDbtlaZ81GbgXg',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'eyewear-eac76.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'eyewear-eac76',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'eyewear-eac76.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '373136884612',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:373136884612:web:b5b41cfd0e277d8f89d3d1',
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-FLT7N3CT7N',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export async function seedCatalog() {
  const batch = writeBatch(db);

  categories.forEach((category) => {
    batch.set(doc(db, 'categories', category.id), {
      ...category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  brands.forEach((brand) => {
    batch.set(doc(db, 'brands', brand.id), {
      ...brand,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  products.forEach((product) => {
    batch.set(doc(db, 'products', product.id), {
      ...product,
      price: product.sellingPrice ?? product.mrp,
      createdAt: product.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  await batch.commit();
  console.log('Catalog seeded successfully');
}

export async function ensureAdminUser(email = process.env.VITE_ADMIN_EMAIL || 'admin@fashioneyecare.com', password = process.env.ADMIN_PASSWORD) {
  if (!password) {
    throw new Error('Set ADMIN_PASSWORD before running the Firebase seed script.');
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      fullName: 'Fashion Eye Care Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('Admin user created:', user.uid);
    return user.uid;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        fullName: 'Fashion Eye Care Admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log('Existing admin user authenticated');
      return userCredential.user.uid;
    }
    throw error;
  }
}

async function main() {
  try {
    await ensureAdminUser();
    await seedCatalog();
    console.log('Firebase setup complete');
    process.exit(0);
  } catch (error) {
    console.error('Firebase setup failed:', error);
    process.exit(1);
  }
}

main();
