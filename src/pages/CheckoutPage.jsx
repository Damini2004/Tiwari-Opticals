import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { storeOrder } from '../services/storeService';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  paymentMethod: 'Card',
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const [form, setForm] = useState({
    ...initialForm,
    fullName: user?.fullName || '',
    email: user?.email || '',
  });
  const [error, setError] = useState('');

  const shipping = subtotal > 0 ? 199 : 0;
  const total = subtotal + shipping;

  const canCheckout = useMemo(() => items.length > 0 && user, [items.length, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!canCheckout) {
      navigate('/login');
      return;
    }

    const order = {
      id: `ORD-${Date.now()}`,
      userId: user.id,
      userEmail: form.email,
      customerName: form.fullName,
      shippingAddress: {
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
      },
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal,
      shipping,
      total,
      status: 'Placed',
      paymentMethod: form.paymentMethod,
      createdAt: new Date().toISOString(),
    };

    try {
      const savedOrder = await storeOrder(order);
      clearCart();
      navigate('/order-success', { state: { order: savedOrder } });
    } catch (error) {
      console.error('Unable to place order', error);
      setError('We could not place your order. Please try again.');
    }
  };

  return (
    <div className="container-shell py-10">
      <h1 className="text-4xl font-black">Checkout</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="card-surface p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-brand">Full name</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" required />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-brand">Address</label>
              <textarea name="address" value={form.address} onChange={handleChange} rows="3" className="w-full rounded-xl border border-slate-200 px-3 py-3" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand">City</label>
              <input name="city" value={form.city} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand">State</label>
              <input name="state" value={form.state} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand">Pincode</label>
              <input name="pincode" value={form.pincode} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand">Payment</label>
              <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3">
                <option>Card</option>
                <option>UPI</option>
                <option>Cash on Delivery</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary mt-6 w-full">Place order</button>
          {error && <p className="mt-3 text-sm text-brand-error">{error}</p>}
        </form>

        <aside className="card-surface h-fit p-6">
          <h2 className="text-xl font-bold">Order summary</h2>
          <div className="mt-4 space-y-3 text-sm text-brand-muted">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <p className="font-semibold text-brand">{item.productName}</p>
                  <p>{item.color} / {item.size} × {item.quantity}</p>
                </div>
                <span>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3 text-sm text-brand-muted">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>₹{shipping.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between text-base font-bold text-brand"><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
