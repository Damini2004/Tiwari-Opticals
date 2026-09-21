import { useEffect, useMemo, useState } from 'react';
import { brands, categories } from '../data/products';
import { isFirebaseConfigured } from '../firebase/config';
import { getProducts as getProductsFromDb, saveProductToDb, deleteProductFromDb } from '../services/productService';
import { getProducts as getLocalProducts, upsertProduct, deleteProduct } from '../lib/localData';
import { getContactMessages, getOrders, subscribeToAppointments } from '../services/storeService';

const emptyForm = {
  id: '',
  name: '',
  sku: '',
  brandId: '',
  brandName: '',
  categoryId: 'eyeglasses',
  categoryName: 'Eyeglasses',
  gender: 'women',
  description: '',
  shortDescription: '',
  sellingPrice: 2599,
  mrp: 3599,
  stock: 10,
  thumbnail: 'https://images.unsplash.com/photo-1577803947579-9f5b87d9c5f1?auto=format&fit=crop&w=1200&q=80',
  images: ['https://images.unsplash.com/photo-1577803947579-9f5b87d9c5f1?auto=format&fit=crop&w=1200&q=80'],
  videos: [],
  active: true,
};

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      setOrders(await getOrders());
      setMessages(await getContactMessages());
      setProducts(isFirebaseConfigured ? await getProductsFromDb({ active: undefined }) : getLocalProducts());
    };

    loadData();
    return subscribeToAppointments(setAppointments, (error) => {
      console.error('Unable to load appointments', error);
    });
  }, []);

  const lowStock = useMemo(
    () => products.filter((product) => product.stock < 10),
    [products],
  );

  const revenue = useMemo(
    () => orders.reduce((sum, order) => sum + (order.total || 0), 0),
    [orders],
  );

  const productStats = useMemo(() => ({
    total: products.length,
    active: products.filter((product) => product.active).length,
    inactive: products.filter((product) => !product.active).length,
    lowStock: lowStock.length,
  }), [products, lowStock]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...products]
      .filter((product) => {
        const matchesSearch = !normalizedSearch || [product.name, product.brandName, product.categoryName, product.sku].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
        const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter || product.categoryName === categoryFilter;
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? product.active : !product.active);
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price-low':
            return (a.sellingPrice || 0) - (b.sellingPrice || 0);
          case 'price-high':
            return (b.sellingPrice || 0) - (a.sellingPrice || 0);
          case 'stock-low':
            return (a.stock || 0) - (b.stock || 0);
          case 'stock-high':
            return (b.stock || 0) - (a.stock || 0);
          case 'name':
            return String(a.name || '').localeCompare(String(b.name || ''));
          case 'newest':
          default:
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
      });
  }, [products, searchTerm, categoryFilter, statusFilter, sortBy]);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setForm((current) => ({
      ...current,
      [name]: name === 'sellingPrice' || name === 'mrp' || name === 'stock' ? Number(nextValue) : nextValue,
    }));
  };

  const previewMedia = useMemo(() => {
    const imagePreview = (form.images || []).filter(Boolean).map((url) => ({ type: 'image', url }));
    const videoPreview = (form.videos || []).filter(Boolean).map((url) => ({ type: 'video', url }));
    return [...imagePreview, ...videoPreview].slice(0, 8);
  }, [form.images, form.videos]);

  const removeMediaItem = (type, url) => {
    if (type === 'image') {
      setForm((current) => ({
        ...current,
        images: (current.images || []).filter((item) => item !== url),
        thumbnail: (current.images || []).filter((item) => item !== url)[0] || current.thumbnail,
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      videos: (current.videos || []).filter((item) => item !== url),
    }));
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const readers = files.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    }));

    Promise.all(readers).then((imageUrls) => {
      const nextImages = imageUrls.filter(Boolean);
      setForm((current) => ({
        ...current,
        thumbnail: nextImages[0] || current.thumbnail,
        images: nextImages.length ? [...(current.images || []), ...nextImages] : current.images,
      }));
    });
  };

  const handleVideoUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const readers = files.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    }));

    Promise.all(readers).then((videoUrls) => {
      const nextVideos = videoUrls.filter(Boolean);
      setForm((current) => ({
        ...current,
        videos: nextVideos.length ? [...(current.videos || []), ...nextVideos] : current.videos,
      }));
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitMessage('');
    setSubmitError('');

    try {
      const normalizedBrandName = (form.brandName || '').trim() || 'Fashion Eye Care';
      const normalizedBrandId = (normalizedBrandName || 'fashion-eye-care').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'fashion-eye-care';

      const productPayload = {
        ...form,
        id: form.id || `p-${Date.now()}`,
        slug: (form.name || 'new-product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        brandId: normalizedBrandId,
        brandName: normalizedBrandName,
        categoryName: categories.find((category) => category.id === form.categoryId)?.name || 'Eyeglasses',
        images: form.images.length ? form.images : [form.thumbnail],
        videos: form.videos || [],
        thumbnail: form.thumbnail || form.images[0],
        discount: Math.max(5, Math.round(((Number(form.mrp || 0) - Number(form.sellingPrice || 0)) / (Number(form.mrp || 1))) * 100)),
        featured: true,
        bestSeller: false,
        newArrival: true,
        sale: true,
        active: form.active,
        rating: 4.5,
        reviewCount: 0,
        createdAt: form.id ? undefined : new Date().toISOString(),
      };

      if (isFirebaseConfigured) {
        await saveProductToDb(productPayload);
        setProducts(await getProductsFromDb({ active: undefined }));
      } else {
        upsertProduct(productPayload);
        setProducts(getLocalProducts());
      }

      setSubmitMessage(isEditing ? 'Product updated successfully.' : 'Product saved successfully.');
      setForm(emptyForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Unable to save product:', error);
      setSubmitError(error.message || 'Unable to save product. Please check Firebase permissions or login status.');
    }
  };

  const handleEdit = (product) => {
    setIsEditing(true);
    setForm({
      id: product.id,
      name: product.name,
      sku: product.sku || '',
      brandId: product.brandId || '',
      brandName: product.brandName || '',
      categoryId: product.categoryId || 'eyeglasses',
      categoryName: product.categoryName || 'Eyeglasses',
      gender: product.gender || 'women',
      description: product.description || '',
      shortDescription: product.shortDescription || '',
      sellingPrice: product.sellingPrice || 0,
      mrp: product.mrp || 0,
      stock: product.stock || 0,
      thumbnail: product.thumbnail || product.images?.[0] || '',
      images: product.images || [product.thumbnail || ''],
      videos: product.videos || [],
      active: product.active ?? true,
    });
  };

  const handleDelete = async (productId) => {
    if (isFirebaseConfigured) {
      await deleteProductFromDb(productId);
      setProducts(await getProductsFromDb({ active: undefined }));
      return;
    }

    deleteProduct(productId);
    setProducts(getLocalProducts());
  };

  const handleToggleStatus = async (product) => {
    const updatedProduct = { ...product, active: !product.active };

    if (isFirebaseConfigured) {
      await saveProductToDb(updatedProduct);
      setProducts(await getProductsFromDb({ active: undefined }));
    } else {
      upsertProduct(updatedProduct);
      setProducts(getLocalProducts());
    }
  };

  const refreshProducts = async () => {
    if (isFirebaseConfigured) {
      setProducts(await getProductsFromDb({ active: undefined }));
      return;
    }

    setProducts(getLocalProducts());
  };

  return (
    <div className="container-shell py-10">
      <h1 className="text-4xl font-black">Admin dashboard</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="card-surface p-6">
          <p className="text-sm text-brand-muted">Total Products</p>
          <h3 className="mt-3 text-3xl font-black">{productStats.total}</h3>
        </div>
        <div className="card-surface p-6">
          <p className="text-sm text-brand-muted">Active Products</p>
          <h3 className="mt-3 text-3xl font-black">{productStats.active}</h3>
        </div>
        <div className="card-surface p-6">
          <p className="text-sm text-brand-muted">Inactive</p>
          <h3 className="mt-3 text-3xl font-black">{productStats.inactive}</h3>
        </div>
        <div className="card-surface p-6">
          <p className="text-sm text-brand-muted">Low Stock</p>
          <h3 className="mt-3 text-3xl font-black">{productStats.lowStock}</h3>
        </div>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card-surface p-6">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <h2 className="text-xl font-bold">Product manager</h2>
            <button type="button" onClick={refreshProducts} className="btn-secondary px-3 py-2 text-xs">Refresh</button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search product, brand, category..."
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand">
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand">
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="mb-4 flex items-center justify-end">
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand">
              <option value="newest">Newest</option>
              <option value="name">Name A-Z</option>
              <option value="price-low">Price low to high</option>
              <option value="price-high">Price high to low</option>
              <option value="stock-low">Stock low to high</option>
              <option value="stock-high">Stock high to low</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-brand-muted">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Product</th>
                    <th className="px-3 py-3 font-semibold">Brand</th>
                    <th className="px-3 py-3 font-semibold">Price</th>
                    <th className="px-3 py-3 font-semibold">Stock</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-3 py-6 text-center text-brand-muted">No products match your filters.</td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="border-t border-slate-200 align-middle">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <img src={product.thumbnail || product.images?.[0]} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                            <div>
                              <p className="font-semibold text-brand">{product.name}</p>
                              <p className="text-xs text-brand-muted">{product.categoryName || product.categoryId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-brand-muted">{product.brandName || 'Fashion Eye Care'}</td>
                        <td className="px-3 py-3 font-semibold text-brand">₹{(product.sellingPrice || 0).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-3 text-brand-muted">{product.stock || 0}</td>
                        <td className="px-3 py-3">
                          <button type="button" onClick={() => handleToggleStatus(product)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                            {product.active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleEdit(product)} className="btn-secondary px-2.5 py-1.5 text-[11px]">Edit</button>
                            <button type="button" onClick={() => handleDelete(product.id)} className="btn-secondary px-2.5 py-1.5 text-[11px]">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card-surface p-6">
          <h2 className="mb-4 text-xl font-bold">{isEditing ? 'Edit product' : 'Add product'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand">Product name</label>
              <input name="name" value={form.name} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand">Brand name</label>
                <input name="brandName" value={form.brandName} onChange={handleInputChange} placeholder="Enter brand name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand">Category</label>
                <select name="categoryId" value={form.categoryId} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand">
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand">Selling price</label>
                <input name="sellingPrice" type="number" value={form.sellingPrice} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand">MRP</label>
                <input name="mrp" type="number" value={form.mrp} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand">Stock</label>
                <input name="stock" type="number" value={form.stock} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand">Gender</label>
                <select name="gender" value={form.gender} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand">
                  <option value="women">Women</option>
                  <option value="men">Men</option>
                  <option value="kids">Kids</option>
                  <option value="unisex">Unisex</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand">Image URL</label>
              <input name="thumbnail" value={form.thumbnail} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand" placeholder="https://example.com/image.jpg" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand">Upload images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none file:mr-3 file:rounded file:border-0 file:bg-brand-gold file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-brand">Upload videos</label>
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={handleVideoUpload}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none file:mr-3 file:rounded file:border-0 file:bg-brand-gold file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand focus:border-brand"
              />
            </div>

            {previewMedia.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-muted">Preview</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {previewMedia.map((media, index) => (
                    <div key={`${media.type}-${media.url}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {media.type === 'image' ? (
                        <img src={media.url} alt={`Preview ${index + 1}`} className="h-24 w-full object-cover" />
                      ) : (
                        <video src={media.url} controls className="h-24 w-full object-cover bg-black" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMediaItem(media.type, media.url)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-white"
                        aria-label={`Remove ${media.type}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-brand">Short description</label>
              <textarea name="shortDescription" value={form.shortDescription} onChange={handleInputChange} rows="3" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand">Description</label>
              <textarea name="description" value={form.description} onChange={handleInputChange} rows="4" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand" />
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-muted">
              <input type="checkbox" name="active" checked={form.active} onChange={handleInputChange} />
              Active product
            </label>
            {(submitMessage || submitError) && (
              <div className={`rounded-xl border px-3 py-2 text-sm ${submitError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {submitError || submitMessage}
              </div>
            )}
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">{isEditing ? 'Save changes' : 'Add product'}</button>
              <button type="button" onClick={() => { setForm(emptyForm); setIsEditing(false); setSubmitMessage(''); setSubmitError(''); }} className="btn-secondary">Clear</button>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="mb-4 text-xl font-bold">Recent orders</h2>
          <div className="space-y-3 text-sm text-brand-muted">
            {orders.length === 0 ? (
              <p>No orders placed yet.</p>
            ) : (
              orders.slice(-4).reverse().map((order) => (
                <div key={order.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-brand">{order.id}</strong>
                    <span>{order.status}</span>
                  </div>
                  <p>{order.customerName} • ₹{(order.total || 0).toLocaleString('en-IN')}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card-surface p-6">
          <h2 className="mb-4 text-xl font-bold">Appointments</h2>
          <div className="space-y-3 text-sm text-brand-muted">
            {appointments.length === 0 ? (
              <p>No appointments yet.</p>
            ) : (
              appointments.slice(0, 4).map((apt) => (
                <div key={apt.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="font-semibold text-brand">{apt.name}</p>
                  <p>{apt.date} • {apt.service}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 card-surface p-6">
        <h2 className="mb-4 text-xl font-bold">Customer enquiries</h2>
        <div className="space-y-3 text-sm text-brand-muted">
          {messages.length === 0 ? (
            <p>No customer messages yet.</p>
          ) : (
            messages.slice(-5).reverse().map((msg) => (
              <div key={msg.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-brand">{msg.subject}</p>
                <p>{msg.name} • {msg.email}</p>
                <p>{msg.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
