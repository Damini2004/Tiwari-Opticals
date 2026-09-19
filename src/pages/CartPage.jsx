import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, updateQuantity, removeItem, subtotal, clearCart } = useCart();
  const [status, setStatus] = useState('');

  const shipping = subtotal > 0 ? 199 : 0;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    if (items.length === 0) {
      setStatus('Your cart is empty.');
      return;
    }

    if (!user) {
      setStatus('Please login to place an order.');
      navigate('/login');
      return;
    }

    navigate('/checkout');
  };

  return (
    <div className="container-shell py-10">
      <h1 className="text-4xl font-black">Your cart</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="card-surface p-8 text-brand-muted">Your cart is empty. Add some premium frames to get started.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="card-surface flex gap-4 p-4">
                <img src={item.productImage} alt={item.productName} className="h-28 w-24 rounded-2xl object-cover" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{item.productName}</h3>
                  <p className="text-sm text-brand-muted">{item.color} / {item.size}</p>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity - 1)} className="rounded-full border px-2">-</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity + 1)} className="rounded-full border px-2">+</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-brand">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                      <button type="button" onClick={() => removeItem(item.productId, item.color, item.size)} className="text-sm text-brand-gold">Remove</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="card-surface h-fit p-6">
          <h3 className="mb-4 text-xl font-bold">Summary</h3>
          <div className="space-y-3 text-sm text-brand-muted">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>₹{shipping.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span>Total</span><span className="text-lg font-bold text-brand">₹{total.toLocaleString('en-IN')}</span></div>
          </div>
          <button type="button" onClick={handleCheckout} className="btn-primary mt-6 w-full" disabled={items.length === 0}>Proceed to Checkout</button>
          <button type="button" onClick={clearCart} className="btn-secondary mt-3 w-full">Clear cart</button>
          {status && <p className="mt-3 text-sm text-brand-error">{status}</p>}
        </div>
      </div>
    </div>
  );
}
