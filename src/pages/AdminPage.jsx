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
  brandId: 'vogue',
  categoryId: 'eyeglasses',
  gender: 'women',
  description: '',
  shortDescription: '',
  sellingPrice: 2599,
  mrp: 3599,
  stock: 10,
  thumbnail: 'https://images.unsplash.com/photo-1577803947579-9f5b87d9c5f1?auto=format&fit=crop&w=1200&q=80',
  images: ['https://images.unsplash.com/photo-1577803947579-9f5b87d9c5f1?auto=format&fit=crop&w=1200&q=80'],
  active: true,
};

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

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

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setForm((current) => ({
      ...current,
      [name]: name === 'sellingPrice' || name === 'mrp' || name === 'stock' ? Number(nextValue) : nextValue,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const productPayload = {
      ...form,
      id: form.id || `p-${Date.now()}`,
      slug: (form.name || 'new-product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      brandName: brands.find((brand) => brand.id === form.brandId)?.name || 'Vogue',
      categoryName: categories.find((category) => category.id === form.categoryId)?.name || 'Eyeglasses',
      images: form.images.length ? form.images : [form.thumbnail],
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

    setForm(emptyForm);
    setIsEditing(false);
  };

  const handleEdit = (product) => {
    setIsEditing(true);
    setForm({
      id: product.id,
      name: product.name,
      sku: product.sku || '',
      brandId: product.brandId || 'vogue',
      categoryId: product.categoryId || 'eyeglasses',
      gender: product.gender || 'women',
      description: product.description || '',
      shortDescription: product.shortDescription || '',
      sellingPrice: product.sellingPrice || 0,
      mrp: product.mrp || 0,
      stock: product.stock || 0,
      thumbnail: product.thumbnail || product.images?.[0] || '',
      images: product.images || [product.thumbnail || ''],
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

  return (
    <div className="container-shell py-10">
      <h1 className="text-4xl font-black">Admin dashboard</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="card-surface p-6">
          <p className="text-sm text-brand-muted">Total Revenue</p>
          <h3 className="mt-3 text-3xl font-black">₹{revenue.toLocaleString('en-IN')}</h3>
        </div>
        <div className="card-surface p-6">
          <p className="text-sm text-brand-muted">Total Orders</p>
          <h3 className="mt-3 text-3xl font-black">{orders.length}</h3>
        </div>
        <div className="card-surface p-6">
          <p className="text-sm text-brand-muted">Customers</p>
          <h3 className="mt-3 text-3xl font-black">{new Set(orders.map((order) => order.userEmail)).size}</h3>
        </div>
        <div className="card-surface p-6">
          <p className="text-sm text-brand-muted">Low Stock</p>
          <h3 className="mt-3 text-3xl font-black">{lowStock.length}</h3>
        </div>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card-surface p-6">
          <h2 className="mb-4 text-xl font-bold">Product catalog</h2>
          <div className="space-y-3">
            {products.length === 0 ? (
              <p className="text-brand-muted">No products available.</p>
            ) : (
              products.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-3">
                    <img src={product.thumbnail || product.images?.[0]} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                    <div>
                      <p className="font-semibold text-brand">{product.name}</p>
                      <p className="text-xs text-brand-muted">{product.categoryName || product.categoryId} • Stock: {product.stock}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleEdit(product)} className="btn-secondary px-3 py-2 text-xs">Edit</button>
                    <button type="button" onClick={() => handleDelete(product.id)} className="btn-secondary px-3 py-2 text-xs">Delete</button>
                  </div>
                </div>
              ))
            )}
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
                <label className="mb-1 block text-sm font-semibold text-brand">Brand</label>
                <select name="brandId" value={form.brandId} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand">
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
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
              <input name="thumbnail" value={form.thumbnail} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand" required />
            </div>
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
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">{isEditing ? 'Save changes' : 'Add product'}</button>
              <button type="button" onClick={() => { setForm(emptyForm); setIsEditing(false); }} className="btn-secondary">Clear</button>
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
