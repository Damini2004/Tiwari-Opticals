import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { storeOrder } from '../services/storeService';

const ADMIN_QR_KEY = 'fashion_eye_care_admin_qr';

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
  const [qrCode, setQrCode] = useState('');
  const [receiptPreview, setReceiptPreview] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setQrCode(localStorage.getItem(ADMIN_QR_KEY) || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80');
    }
  }, []);

  const shipping = subtotal > 0 ? 199 : 0;
  const total = subtotal + shipping;

  const canCheckout = useMemo(() => items.length > 0 && user, [items.length, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setReceiptPreview('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!canCheckout) {
      navigate('/login', { state: { from: '/checkout' } });
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
        {!user ? (
          <div className="card-surface flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-2xl font-black">Login required to continue</h2>
            <p className="mt-3 max-w-md text-brand-muted">Please sign in before completing payment so we can verify your order and receipt.</p>
            <button type="button" onClick={() => navigate('/login', { state: { from: '/checkout' } })} className="btn-primary mt-6">Login to continue</button>
          </div>
        ) : (
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

              <div className="md:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-brand-muted">Payment QR code</p>
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                    <img src={qrCode} alt="Payment QR code" className="h-32 w-32 rounded-xl border border-slate-200 bg-white object-cover p-2" />
                    <div className="text-sm text-brand-muted">
                      <p>Please scan the QR code above and upload a screenshot of your payment receipt below.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-brand">Upload payment receipt</label>
                <input type="file" accept="image/*" onChange={handleReceiptChange} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none file:mr-3 file:rounded file:border-0 file:bg-brand-gold file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand" />
                {receiptPreview && (
                  <img src={receiptPreview} alt="Receipt preview" className="mt-3 h-40 w-full rounded-xl border border-slate-200 object-cover" />
                )}
              </div>
            </div>

            <button type="submit" className="btn-primary mt-6 w-full">Place order</button>
            {error && <p className="mt-3 text-sm text-brand-error">{error}</p>}
          </form>
        )}

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
