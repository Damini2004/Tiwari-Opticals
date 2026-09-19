import { Heart, MessageCircle, ShoppingBag, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const { items: wishlist, toggleItem } = useWishlist();
  const { addToCart } = useCart();

  const inWishlist = wishlist.includes(product.id);
  const colors = Array.isArray(product.availableColors) ? product.availableColors : [];
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '919011886479';
  const whatsappMessage = encodeURIComponent(`Hi, I am interested in ${product.name} (${product.brandName || 'Eyewear'}). Price: ₹${Number(product.sellingPrice || 0).toLocaleString('en-IN')}.`);

  return (
    <article className="card-surface group overflow-hidden luxury-ring">
      <div className="relative overflow-hidden">
        <Link to={`/product/${product.id}`}>
          <img
            src={product.thumbnail}
            alt={product.name}
            className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>
        <button
          type="button"
          onClick={() => toggleItem(product.id)}
          className={`absolute right-3 top-3 rounded-full border p-2 ${
            inWishlist ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white/90 text-brand'
          }`}
          aria-label="Toggle wishlist"
        >
          <Heart size={16} fill={inWishlist ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-brand-muted">
          <span>{product.brandName}</span>
          <span className="inline-flex items-center gap-1">
            <Star size={12} className="fill-brand-gold text-brand-gold" />
            {product.rating}
          </span>
        </div>

        <Link to={`/product/${product.id}`} className="block text-xl font-bold text-brand transition hover:text-brand-gold">
          {product.name}
        </Link>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-lg font-bold text-brand">₹{product.sellingPrice.toLocaleString('en-IN')}</span>
          <span className="text-sm text-brand-muted line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
          <span className="badge-gold">{product.discount}% Off</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {colors.slice(0, 3).map((color) => (
            <span key={color} className="rounded-full border border-slate-200 px-2 py-1 text-[10px] uppercase tracking-wide text-brand-muted">
              {color}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => addToCart(product)}
            className="btn-primary flex items-center justify-center gap-2 text-xs"
          >
            <ShoppingBag size={14} /> Add to Cart
          </button>
          <Link to={`/product/${product.id}`} className="btn-secondary text-xs">
            Quick View
          </Link>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary flex items-center justify-center text-xs text-[#128C7E]"
            aria-label={`Ask about ${product.name} on WhatsApp`}
          >
            <MessageCircle size={15} />
          </a>
        </div>
      </div>
    </article>
  );
}
