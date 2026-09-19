import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isFirebaseConfigured } from '../firebase/config';
import { getProducts as getProductsFromDb } from '../services/productService';
import { getProducts as getLocalProducts } from '../lib/localData';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

export default function WishlistPage() {
  const { items: wishlistIds, toggleItem } = useWishlist();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      const nextProducts = isFirebaseConfigured ? await getProductsFromDb({ active: true }) : getLocalProducts();
      setProducts(nextProducts);
    };

    loadProducts();
  }, []);

  const wishlistProducts = products.filter((product) => wishlistIds.includes(product.id));

  return (
    <div className="container-shell py-10">
      <h1 className="text-4xl font-black">My wishlist</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {wishlistProducts.length === 0 ? (
          <div className="card-surface p-8 text-brand-muted sm:col-span-2 xl:col-span-3">
            Your wishlist is empty. <Link to="/shop" className="font-semibold text-brand-gold">Browse eyewear</Link>
          </div>
        ) : (
          wishlistProducts.map((product) => (
            <div key={product.id} className="card-surface overflow-hidden">
              <img src={product.thumbnail} alt={product.name} className="h-64 w-full object-cover" />
              <div className="p-5">
                <h3 className="text-xl font-bold">{product.name}</h3>
                <p className="mt-2 text-sm text-brand-muted">{product.shortDescription}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-brand">₹{product.sellingPrice.toLocaleString('en-IN')}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => addToCart(product)} className="btn-primary text-xs">Move to Cart</button>
                    <button type="button" onClick={() => toggleItem(product.id)} className="btn-secondary text-xs">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
