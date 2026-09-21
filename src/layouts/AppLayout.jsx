import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Search, Heart, ShoppingBag, User, MessageCircle, MapPin, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useState } from 'react';

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Book Eye Test', to: '/book-eye-test' },
];

function AppLayout() {
  const navigate = useNavigate();
  const { count: cartCount, toast } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '919011886479';

  const handleNavClick = () => setMobileOpen(false);

  const onSearch = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return navigate('/shop');
    navigate(`/shop?search=${encodeURIComponent(trimmed)}`);
    setQuery('');
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand">
      <div className="border-b border-slate-200 bg-brand px-4 py-2 text-center text-xs font-medium text-white">
        <div className="container-shell flex flex-wrap items-center justify-center gap-4">
          <span>Free Shipping Above ₹999</span>
          <span>•</span>
          <span>Easy Returns</span>
          <span>•</span>
          <span>Book Your Eye Test</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="container-shell flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full border border-slate-200 p-2 lg:hidden"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              <Menu size={18} />
            </button>
            <Link to="/" className="text-xl font-black tracking-tight text-brand">
              Tiwari Opticals
            </Link>
          </div>

          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? 'text-brand-gold' : 'text-brand hover:text-brand-gold'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <form onSubmit={onSearch} className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <Search size={16} className="text-brand-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search eyewear"
                className="w-32 bg-transparent text-sm text-brand outline-none placeholder:text-brand-muted"
              />
            </form>
            <Link to="/wishlist" className="relative rounded-full border border-slate-200 p-2.5 text-brand hover:border-brand" aria-label="Wishlist">
              <Heart size={18} />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-gold text-[10px] font-bold text-brand">{wishlistCount}</span>
            </Link>
            <Link to="/account" className="rounded-full border border-slate-200 p-2.5 text-brand hover:border-brand" aria-label="Account">
              <User size={18} />
            </Link>
            <Link to="/cart" className="relative rounded-full border border-slate-200 p-2.5 text-brand hover:border-brand" aria-label="Cart">
              <ShoppingBag size={18} />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-dark text-[10px] font-bold text-white">{cartCount}</span>
            </Link>
            <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="hidden rounded-full bg-[#25D366] p-2.5 text-white sm:inline-flex" aria-label="WhatsApp">
              <MessageCircle size={18} />
            </a>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="border-b border-slate-200 bg-white lg:hidden">
          <nav className="container-shell flex flex-col gap-2 py-3">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-gold/10 text-brand-gold' : 'text-brand hover:bg-slate-100'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      <main className="pb-16">
        <Outlet />
      </main>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg ring-2 ring-emerald-200">
            <CheckCircle2 size={18} className="text-emerald-600" />
            {toast}
          </div>
        </div>
      )}

      <footer className="border-t border-slate-200 bg-white">
        <div className="container-shell grid gap-8 py-10 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-bold">Tiwari Opticals</h3>
            <p className="mb-4">Premium eyewear and eye-care solutions crafted for everyday confidence.</p>
            <div className="flex items-center gap-2 text-sm text-brand-muted">
              <MapPin size={14} />
              <span>Malgujaripura, opposite Lohiya Hospital, Wardha</span>
            </div>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider">Shop</h4>
            <ul className="space-y-2 text-sm text-brand-muted">
              <li><Link to="/shop?category=eyeglasses">Eyeglasses</Link></li>
              <li><Link to="/shop?category=sunglasses">Sunglasses</Link></li>
              <li><Link to="/shop?category=computer-glasses">Computer Glasses</Link></li>
              <li><Link to="/shop?category=kids-glasses">Kids</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider">Support</h4>
            <ul className="space-y-2 text-sm text-brand-muted">
              <li><Link to="/book-eye-test">Book Eye Test</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/account">My Account</Link></li>
              <li><Link to="/wishlist">Wishlist</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider">Trust</h4>
            <div className="space-y-3 text-sm text-brand-muted">
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand-gold" /> 30-day returns</div>
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand-gold" /> Secure payments</div>
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand-gold" /> Certified opticians</div>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 py-4 text-center text-xs text-brand-muted">
          © 2026 Tiwari Opticals. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;
