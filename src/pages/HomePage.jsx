import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck, Star } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { isFirebaseConfigured } from '../firebase/config';
import { getProducts as getProductsFromDb } from '../services/productService';
import { getProducts as getLocalProducts } from '../lib/localData';

const categoryCards = [
  { name: 'Eyeglasses', image: 'https://images.unsplash.com/photo-1577803947579-9f5b87d9c5f1?auto=format&fit=crop&w=900&q=80', href: '/shop?category=eyeglasses' },
  { name: 'Sunglasses', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80', href: '/shop?category=sunglasses' },
  { name: 'Computer Glasses', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80', href: '/shop?category=computer-glasses' },
  { name: 'Kids', image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80', href: '/shop?gender=kids' },
];

const highlights = [
  { title: 'Premium frames', text: 'Curated styles designed for everyday lifestyle and precision.', icon: Sparkles },
  { title: 'Certified eye care', text: 'Expert fitting, prescription support, and trusted guidance.', icon: ShieldCheck },
  { title: 'Loved by customers', text: 'Rated highly across premium fashion and comfort categories.', icon: Star },
];

export default function HomePage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      const nextProducts = isFirebaseConfigured ? await getProductsFromDb({ active: true }) : getLocalProducts();
      setProducts(nextProducts);
    };

    loadProducts();
  }, []);

  const featuredProducts = products.filter((product) => product.featured).slice(0, 8);
  const displayedProducts = products.length ? products : getLocalProducts().filter((product) => product.active !== false);
  const carouselProducts = featuredProducts.length ? featuredProducts : displayedProducts.slice(0, 8);
  const repeatingCarouselProducts = [...carouselProducts, ...carouselProducts];

  return (
    <div className="pb-14">
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <section className="container-shell py-10 md:py-16">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-6 text-white shadow-soft md:grid-cols-2 md:p-10 luxury-ring">
          <div>
            <span className="mb-4 inline-flex rounded-full border border-[#e8d68d] bg-[#F7E9B3] px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand">Premium Eyewear</span>
            <h1 className="max-w-lg text-4xl font-black leading-tight text-white md:text-6xl">See Better. Look Better.</h1>
            <p className="mt-4 max-w-xl text-base font-medium text-slate-200 md:text-lg">
              Discover premium eyewear designed for comfort, clarity and everyday style.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/shop?category=eyeglasses" className="btn-primary bg-brand-gold text-brand hover:bg-[#b7921d]">Shop Eyeglasses</Link>
              <Link to="/shop?category=sunglasses" className="btn-secondary border-white bg-transparent text-white hover:bg-white hover:text-brand">Shop Sunglasses</Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-brand-gold/20 blur-2xl" />  
<img
  src="/assets/images/Home-Page.jpeg"
  alt="Eyewear hero"
  className="relative h-[420px] w-full rounded-[2rem] object-contain shadow-2xl"
/>

          </div>
        </div>
      </section>

      <section className="container-shell py-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="section-title">Trending now</h2>
          <Link to="/shop" className="text-sm font-semibold text-brand-gold">Browse all</Link>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/50 shadow-soft">
          <div
            className="flex w-max gap-6 px-4 py-4"
            style={{ animation: 'marquee 24s linear infinite' }}
          >
            {repeatingCarouselProducts.map((product, index) => (
              <div key={`${product.id}-${index}`} className="w-[280px] shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="section-title">All products</h2>
          <Link to="/shop" className="text-sm font-semibold text-brand-gold">View all</Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="container-shell py-10">
        <div className="grid gap-6 md:grid-cols-3">
          {highlights.map(({ title, text, icon: Icon }) => (
            <div key={title} className="card-surface p-6">
              <div className="mb-4 inline-flex rounded-full bg-[#F7E9B3] p-3 text-brand-gold">
                <Icon size={22} />
              </div>
              <h3 className="mb-2 text-xl font-bold">{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
