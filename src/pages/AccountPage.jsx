import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrdersForUser } from '../services/storeService';

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
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

    return () => { active = false; };
  }, [user?.id]);

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
          <p className="mt-3 text-sm text-brand-muted">Save your favorite styles and move them to cart easily.</p>
        </div>
      </div>
    </div>
  );
}
