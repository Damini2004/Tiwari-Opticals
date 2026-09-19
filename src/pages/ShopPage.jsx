import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { isFirebaseConfigured } from '../firebase/config';
import { getProducts as getProductsFromDb } from '../services/productService';
import { getProducts as getLocalProducts } from '../lib/localData';

export default function ShopPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [productLists, setProductLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('featured');

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const nextProducts = isFirebaseConfigured ? await getProductsFromDb({ active: true }) : getLocalProducts().filter((product) => product.active !== false);
        setProductLists(nextProducts);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [location.search]);
  const urlSearch = params.get('search') || '';

  const filteredProducts = useMemo(() => {
    return productLists.filter((product) => {
      const matchesSearch = !urlSearch || [product.name, product.brandName, product.categoryName, product.sku, ...(product.tags || [])].join(' ').toLowerCase().includes(urlSearch.toLowerCase());
      return matchesSearch;
    });
  }, [productLists, urlSearch]);

  const sortedProducts = useMemo(() => [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return Number(a.sellingPrice || 0) - Number(b.sellingPrice || 0);
    if (sortBy === 'price-high') return Number(b.sellingPrice || 0) - Number(a.sellingPrice || 0);
    if (sortBy === 'rating') return Number(b.rating || 0) - Number(a.rating || 0);
    return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  }), [filteredProducts, sortBy]);

  return (
    <div className="container-shell py-10">
      <h1 className="mb-4 text-4xl font-black">Shop all eyewear</h1>
      <p className="max-w-2xl text-base">Browse premium styles, filter by category, gender, shape, material, and price, and find the right fit for every day.</p>
      <div className="mt-8">
        <div>
          <div className="mb-4 flex items-center justify-between text-sm text-brand-muted">
            <span>{loading ? 'Loading products…' : `${sortedProducts.length} products`}</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-brand">
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="rating">Highest rated</option>
            </select>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {!loading && sortedProducts.length === 0 && (
            <div className="card-surface mt-5 p-6 text-brand-muted">No products match these filters. Try clearing a filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}
