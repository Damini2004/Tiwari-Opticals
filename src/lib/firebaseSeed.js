import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { brands, categories, products } from '../data/products';

export const seedDemoCatalog = async () => {
  if (!db) {
    throw new Error('Firebase is not configured. Add your project credentials first.');
  }

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
    const cleanProduct = {
      ...product,
      price: product.sellingPrice ?? product.mrp,
      createdAt: product.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    batch.set(doc(db, 'products', product.id), cleanProduct);
  });

  await batch.commit();

  return {
    categories: categories.length,
    brands: brands.length,
    products: products.length,
  };
};
