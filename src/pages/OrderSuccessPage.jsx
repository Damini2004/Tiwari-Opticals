import { Link, useLocation } from 'react-router-dom';

export default function OrderSuccessPage() {
  const location = useLocation();
  const order = location.state?.order;

  return (
    <div className="container-shell flex min-h-[70vh] items-center justify-center py-12">
      <div className="card-surface max-w-xl p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F7EE] text-3xl text-brand-success">✓</div>
        <h1 className="text-4xl font-black">Order placed</h1>
        <p className="mt-3 text-brand-muted">Your order has been confirmed and is being prepared for dispatch.</p>
        {order && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-brand-muted">
            <p><strong className="text-brand">Order ID:</strong> {order.id}</p>
            <p><strong className="text-brand">Total:</strong> ₹{(order.total || 0).toLocaleString('en-IN')}</p>
            <p><strong className="text-brand">Payment:</strong> {order.paymentMethod}</p>
          </div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/shop" className="btn-primary">Continue shopping</Link>
          <Link to="/account" className="btn-secondary">View account</Link>
        </div>
      </div>
    </div>
  );
}
