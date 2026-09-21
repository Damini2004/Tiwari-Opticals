import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { getOrdersForUser } from '../services/storeService';
import { getProducts as getProductsFromDb } from '../services/productService';
import { getProducts as getLocalProducts } from '../lib/localData';
import { isFirebaseConfigured } from '../firebase/config';

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { items: wishlistIds } = useWishlist();
  const [orders, setOrders] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      setWishlistProducts([]);
      return;
    }

    let active = true;
    setOrdersLoading(true);
    getOrdersForUser(user.id)
      .then((nextOrders) => {
        if (active) setOrders(nextOrders);
      })
      .catch((error) => {
        console.error('Unable to load customer orders', error);
        if (active) setOrders([]);
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });

    const loadWishlistProducts = async () => {
      const products = isFirebaseConfigured ? await getProductsFromDb({ active: true }) : getLocalProducts();
      if (active) {
        setWishlistProducts(products.filter((product) => wishlistIds.includes(product.id)));
      }
    };

    loadWishlistProducts();

    return () => { active = false; };
  }, [user?.id, wishlistIds]);

  if (!user) {
    return (
      <div className="container-shell py-16 text-center">
        <h1 className="text-4xl font-black">My Account</h1>
        <p className="mt-3 text-brand-muted">Please log in to manage your orders and personal details.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/login" className="btn-primary">Login</Link>
          <Link to="/signup" className="btn-secondary">Create account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-shell py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-black">My Account</h1>
          <p className="mt-2 text-brand-muted">Welcome back, {user.fullName}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="btn-secondary"
        >
          Logout
        </button>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card-surface p-6">
          <h3 className="text-xl font-bold">Profile</h3>
          <p className="mt-3 text-sm text-brand-muted">Email: {user.email}</p>
        </div>
        <div className="card-surface p-6 lg:col-span-2">
          <h3 className="text-xl font-bold">Orders</h3>
          {ordersLoading ? (
            <p className="mt-3 text-sm text-brand-muted">Loading your orders…</p>
          ) : orders.length === 0 ? (
            <p className="mt-3 text-sm text-brand-muted">No orders yet. Your completed purchases will appear here.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="rounded-xl border border-slate-200 p-4 text-sm text-brand-muted">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-brand">Order {order.id}</strong>
                    <span className="badge-gold">{order.status || 'Placed'}</span>
                  </div>
                  <p className="mt-2">{(order.items || []).map((item) => `${item.productName} × ${item.quantity}`).join(', ')}</p>
                  <p className="mt-1 font-semibold text-brand">₹{Number(order.total || 0).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card-surface p-6">
          <h3 className="text-xl font-bold">Wishlist</h3>
          {wishlistProducts.length === 0 ? (
            <p className="mt-3 text-sm text-brand-muted">No saved items yet. Add styles to your wishlist from the shop.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {wishlistProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <img src={product.thumbnail || product.images?.[0]} alt={product.name} className="h-14 w-14 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="font-semibold text-brand">{product.name}</p>
                    <p className="text-xs text-brand-muted">₹{Number(product.sellingPrice || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
