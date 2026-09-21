import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, MessageCircle, ShoppingBag, Star } from 'lucide-react';
import { isFirebaseConfigured } from '../firebase/config';
import { getProductById } from '../services/productService';
import { getProducts as getLocalProducts } from '../lib/localData';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function ProductPage() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { items: wishlist, toggleItem } = useWishlist();
  const [product, setProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState('Black');
  const [selectedSize, setSelectedSize] = useState('M');
  const [activeMedia, setActiveMedia] = useState(null);

  useEffect(() => {
    const loadProduct = async () => {
      if (isFirebaseConfigured) {
        const nextProduct = await getProductById(id);
        setProduct(nextProduct);
        setSelectedColor(nextProduct?.availableColors?.[0] || 'Black');
        setSelectedSize(nextProduct?.size || 'M');
        return;
      }

      const localProduct = getLocalProducts().find((entry) => entry.id === id) || getLocalProducts()[0];
      setProduct(localProduct || null);
      setSelectedColor(localProduct?.availableColors?.[0] || 'Black');
      setSelectedSize(localProduct?.size || 'M');
    };

    loadProduct();
  }, [id]);

  useEffect(() => {
    if (!product) return;

    const mediaItems = [
      ...(product.images || []).filter(Boolean).map((url) => ({ type: 'image', url })),
      ...(product.videos || []).filter(Boolean).map((url) => ({ type: 'video', url })),
    ];

    const preferredVideo = mediaItems.find((item) => item.type === 'video');
    const fallback = { type: 'image', url: product.thumbnail || product.images?.find(Boolean) || '' };
    setActiveMedia(preferredVideo || mediaItems[0] || fallback);
  }, [product]);

  if (!product) {
    return <div className="container-shell py-16 text-center text-brand-muted">Loading product...</div>;
  }

  const mediaItems = [
    ...(product.images || []).filter(Boolean).map((url) => ({ type: 'image', url })),
    ...(product.videos || []).filter(Boolean).map((url) => ({ type: 'video', url })),
  ];

  const hasMainMedia = activeMedia?.url;

  const inWishlist = wishlist.includes(product.id);
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '919011886479';
  const whatsappMessage = encodeURIComponent(`Hi, I am interested in ${product.name} (${product.brandName || 'Eyewear'}). Price: ₹${Number(product.sellingPrice || 0).toLocaleString('en-IN')}.`);

  return (
    <div className="container-shell py-10">
      <div className="mb-5 text-sm text-brand-muted">
        <Link to="/shop">Shop</Link> / <span>{product.name}</span>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card-surface overflow-hidden p-4">
          <div className="overflow-hidden rounded-2xl bg-slate-100">
            {activeMedia?.type === 'video' && activeMedia.url ? (
              <video src={activeMedia.url} controls autoPlay muted playsInline className="h-[520px] w-full object-cover" />
            ) : hasMainMedia ? (
              <img src={activeMedia.url} alt={product.name} className="h-[520px] w-full object-cover" />
            ) : (
              <div className="flex h-[520px] w-full items-center justify-center bg-slate-100 text-sm text-brand-muted">
                No media available for this product
              </div>
            )}
          </div>

          {mediaItems.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {mediaItems.map((media, index) => (
                <button
                  key={`${media.type}-${media.url}-${index}`}
                  type="button"
                  onClick={() => setActiveMedia(media)}
                  className={`overflow-hidden rounded-xl border-2 ${activeMedia?.url === media.url && activeMedia?.type === media.type ? 'border-brand-gold' : 'border-slate-200'}`}
                >
                  {media.type === 'video' ? (
                    <video src={media.url} className="h-24 w-full object-cover bg-black" muted />
                  ) : (
                    <img src={media.url} alt={`${product.name} view ${index + 1}`} className="h-24 w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">{product.brandName}</p>
          <h1 className="text-4xl font-black">{product.name}</h1>
          <div className="mt-3 flex items-center gap-4 text-sm text-brand-muted">
            <span className="inline-flex items-center gap-1"><Star size={14} className="fill-brand-gold text-brand-gold" /> {product.rating}</span>
            <span>{product.reviewCount} reviews</span>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className="text-3xl font-black text-brand">₹{product.sellingPrice.toLocaleString('en-IN')}</span>
            <span className="text-lg line-through text-brand-muted">₹{product.mrp.toLocaleString('en-IN')}</span>
            <span className="badge-gold">{product.discount}% OFF</span>
          </div>
          <p className="mt-4 max-w-xl text-brand-muted">{product.description}</p>
          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-2 font-semibold text-brand">Color variants</p>
              <div className="flex flex-wrap gap-2">
                {(product.availableColors || ['Black']).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`rounded-full border px-3 py-2 text-sm ${selectedColor === color ? 'border-brand-gold bg-[#F7E9B3] text-brand' : 'border-slate-200 bg-white text-brand-muted'}`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-semibold text-brand">Size</p>
              <div className="flex flex-wrap gap-2">
                {['S', 'M', 'L', 'XL'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-full border px-3 py-2 text-sm ${selectedSize === size ? 'border-brand-gold bg-[#F7E9B3] text-brand' : 'border-slate-200 bg-white text-brand-muted'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary flex items-center gap-2"
              onClick={() => addToCart(product, { color: selectedColor, size: selectedSize })}
            >
              <ShoppingBag size={16} /> Add to Cart
            </button>
            <button type="button" className="btn-secondary">Buy Now</button>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex items-center gap-2 text-[#128C7E]"
            >
              <MessageCircle size={16} /> Ask on WhatsApp
            </a>
            <button type="button" onClick={() => toggleItem(product.id)} className="btn-secondary flex items-center gap-2">
              <Heart size={16} fill={inWishlist ? 'currentColor' : 'none'} />
              {inWishlist ? 'Saved' : 'Wishlist'}
            </button>
          </div>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-brand-muted">
            <p><strong className="text-brand">Frame shape:</strong> {product.frameShape}</p>
            <p><strong className="text-brand">Material:</strong> {product.frameMaterial}</p>
            <p><strong className="text-brand">Lens width:</strong> {product.lensWidth} mm</p>
            <p><strong className="text-brand">Bridge width:</strong> {product.bridgeWidth} mm</p>
            <p><strong className="text-brand">Temple length:</strong> {product.templeLength} mm</p>
          </div>
        </div>
      </div>
    </div>
  );
}
