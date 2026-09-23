import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { doc, updateDoc } from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';

import { getOrdersForUser } from '../services/storeService';
import { getProducts as getProductsFromDb } from '../services/productService';
import { getProducts as getLocalProducts } from '../lib/localData';

import { db, isFirebaseConfigured } from '../firebase/config';

export default function AccountPage() {
  const navigate = useNavigate();

  const { user, logout } = useAuth();
  const { items: wishlistIds } = useWishlist();

  const [orders, setOrders] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);

  const [ordersLoading, setOrdersLoading] = useState(false);

  // Order dropdown
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Customer details editing
  const [editingOrderId, setEditingOrderId] = useState(null);

  const [customerEditForm, setCustomerEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [savingCustomerDetails, setSavingCustomerDetails] = useState(false);
  const [customerEditError, setCustomerEditError] = useState('');

  // =========================
  // LOAD ORDERS + WISHLIST
  // =========================

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      setWishlistProducts([]);
      return;
    }

    let active = true;

    setOrdersLoading(true);

    // Load orders
    getOrdersForUser(user.id)
      .then((nextOrders) => {
        if (active) {
          setOrders(nextOrders);
        }
      })
      .catch((error) => {
        console.error('Unable to load customer orders', error);

        if (active) {
          setOrders([]);
        }
      })
      .finally(() => {
        if (active) {
          setOrdersLoading(false);
        }
      });

    // Load wishlist products
    const loadWishlistProducts = async () => {
      try {
        const products = isFirebaseConfigured
          ? await getProductsFromDb({ active: true })
          : getLocalProducts();

        if (active) {
          setWishlistProducts(
            products.filter((product) =>
              wishlistIds.includes(product.id)
            )
          );
        }
      } catch (error) {
        console.error('Unable to load wishlist products', error);

        if (active) {
          setWishlistProducts([]);
        }
      }
    };

    loadWishlistProducts();

    return () => {
      active = false;
    };
  }, [user?.id, wishlistIds]);

  // =========================
  // START EDITING CUSTOMER
  // =========================

  const startEditingCustomer = (order) => {
    const address = order.shippingAddress || {};

    setCustomerEditForm({
      fullName: order.customerName || user.fullName || '',
      email: order.userEmail || user.email || '',
      phone: order.phone || '',
      address: address.address || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || '',
    });

    setCustomerEditError('');
    setEditingOrderId(order.id);
  };

  // =========================
  // CANCEL EDITING
  // =========================

  const cancelEditingCustomer = () => {
    setEditingOrderId(null);
    setCustomerEditError('');
  };

  // =========================
  // CUSTOMER INPUT CHANGE
  // =========================

  const handleCustomerEditChange = (event) => {
    const { name, value } = event.target;

    setCustomerEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =========================
  // SAVE CUSTOMER DETAILS
  // =========================

  const saveCustomerDetails = async (order) => {
    setCustomerEditError('');
    setSavingCustomerDetails(true);

    try {
      const updatedCustomerDetails = {
        customerName: customerEditForm.fullName,
        userEmail: customerEditForm.email,
        phone: customerEditForm.phone,
        shippingAddress: {
          address: customerEditForm.address,
          city: customerEditForm.city,
          state: customerEditForm.state,
          pincode: customerEditForm.pincode,
        },
      };

      // =========================
      // FIREBASE
      // =========================

      if (isFirebaseConfigured) {
        await updateDoc(
          doc(db, 'orders', order.id),
          updatedCustomerDetails
        );
      }

      // =========================
      // UPDATE LOCAL SCREEN
      // =========================

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? {
                ...currentOrder,
                ...updatedCustomerDetails,
              }
            : currentOrder
        )
      );

      setEditingOrderId(null);
    } catch (error) {
      console.error(
        'Unable to update customer details',
        error
      );

      setCustomerEditError(
        'Unable to update customer details. Please try again.'
      );
    } finally {
      setSavingCustomerDetails(false);
    }
  };

  // =========================
  // NOT LOGGED IN
  // =========================

  if (!user) {
    return (
      <div className="container-shell py-16 text-center">
        <h1 className="text-4xl font-black">
          My Account
        </h1>

        <p className="mt-3 text-brand-muted">
          Please log in to manage your orders and personal details.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/login"
            className="btn-primary"
          >
            Login
          </Link>

          <Link
            to="/signup"
            className="btn-secondary"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-shell py-10">

      {/* =========================
          ACCOUNT HEADER
      ========================= */}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-4xl font-black">
            My Account
          </h1>

          <p className="mt-2 text-brand-muted">
            Welcome back, {user.fullName}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="btn-secondary"
        >
          Logout
        </button>

      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">

        {/* =========================
            PROFILE
        ========================= */}

        <div className="card-surface p-6">

          <h3 className="text-xl font-bold">
            Profile
          </h3>

          <div className="mt-4 space-y-3 text-sm">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Name
              </p>

              <p className="mt-1 font-semibold text-brand">
                {user.fullName || 'Customer'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Email
              </p>

              <p className="mt-1 break-all font-semibold text-brand">
                {user.email}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Account type
              </p>

              <p className="mt-1 font-semibold capitalize text-brand">
                {user.role || 'Customer'}
              </p>
            </div>

          </div>

        </div>

        {/* =========================
            ORDERS
        ========================= */}

        <div className="card-surface p-6 lg:col-span-2">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div>
              <h3 className="text-xl font-bold">
                My Orders
              </h3>

              <p className="mt-1 text-sm text-brand-muted">
                Click an order to view its complete details.
              </p>
            </div>

            {orders.length > 0 && (
              <span className="badge-gold">
                {orders.length}{' '}
                {orders.length === 1
                  ? 'Order'
                  : 'Orders'}
              </span>
            )}

          </div>

          {/* =========================
              LOADING
          ========================= */}

          {ordersLoading ? (

            <div className="mt-6 rounded-xl border border-slate-200 p-6 text-center">

              <p className="text-sm text-brand-muted">
                Loading your orders…
              </p>

            </div>

          ) : orders.length === 0 ? (

            /* =========================
               NO ORDERS
            ========================= */

            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">

              <p className="font-semibold text-brand">
                No orders yet
              </p>

              <p className="mt-2 text-sm text-brand-muted">
                Your completed purchases will appear here.
              </p>

              <Link
                to="/shop"
                className="btn-primary mt-5 inline-block"
              >
                Continue Shopping
              </Link>

            </div>

          ) : (

            /* =========================
               ORDER LIST
            ========================= */

            <div className="mt-6 space-y-4">

              {orders.map((order) => {

                const shippingAddress =
                  order.shippingAddress || {};

                const isExpanded =
                  expandedOrderId === order.id;

                const isEditing =
                  editingOrderId === order.id;

                const orderDate = order.createdAt
                  ? new Date(order.createdAt)
                  : null;

                const formattedDate =
                  orderDate &&
                  !Number.isNaN(orderDate.getTime())
                    ? orderDate.toLocaleString(
                        'en-IN',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )
                    : 'Date unavailable';

                return (

                  <div
                    key={order.id}
                    className="overflow-hidden rounded-2xl border border-slate-200"
                  >

                    {/* =========================
                        COLLAPSED ORDER HEADER
                    ========================= */}

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedOrderId(
                          isExpanded
                            ? null
                            : order.id
                        )
                      }
                      className="w-full p-5 text-left transition hover:bg-slate-50"
                    >

                      <div className="flex items-center gap-4">

                        {/* Dropdown Icon */}

                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 transition-transform duration-200 ${
                            isExpanded
                              ? 'rotate-180'
                              : ''
                          }`}
                        >

                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-5 w-5 text-brand"
                          >

                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m6 9 6 6 6-6"
                            />

                          </svg>

                        </div>

                        {/* Basic Order Information */}

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="font-black text-brand">
                              Order {order.id}
                            </p>

                            <span className="badge-gold">
                              {order.status || 'Placed'}
                            </span>

                          </div>

                          <p className="mt-1 text-sm text-brand-muted">
                            {formattedDate}
                          </p>

                        </div>

                        {/* Total */}

                        <div className="hidden text-right sm:block">

                          <p className="text-xs text-brand-muted">
                            Total
                          </p>

                          <p className="mt-1 font-black text-brand">
                            ₹
                            {Number(
                              order.total || 0
                            ).toLocaleString('en-IN')}
                          </p>

                        </div>

                      </div>

                      {/* Mobile total */}

                      <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 sm:hidden">

                        <span className="text-sm text-brand-muted">
                          Total
                        </span>

                        <span className="font-black text-brand">
                          ₹
                          {Number(
                            order.total || 0
                          ).toLocaleString('en-IN')}
                        </span>

                      </div>

                    </button>

                    {/* =========================
                        EXPANDED DETAILS
                    ========================= */}

                    {isExpanded && (

                      <div className="border-t border-slate-200 bg-white p-5">

                        {/* =========================
                            ORDER INFORMATION
                        ========================= */}

                        <div>

                          <h4 className="text-base font-bold text-brand">
                            Order Information
                          </h4>

                          <div className="mt-3 grid gap-4 sm:grid-cols-2">

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                Order ID
                              </p>

                              <p className="mt-1 break-all text-sm font-semibold text-brand">
                                {order.id}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                Order Status
                              </p>

                              <p className="mt-1 text-sm font-semibold text-brand">
                                {order.status || 'Placed'}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                Order Date
                              </p>

                              <p className="mt-1 text-sm font-semibold text-brand">
                                {formattedDate}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                Payment Method
                              </p>

                              <p className="mt-1 text-sm font-semibold text-brand">
                                {order.paymentMethod ||
                                  'Not specified'}
                              </p>
                            </div>

                          </div>

                        </div>

                        {/* =========================
                            CUSTOMER INFORMATION
                        ========================= */}

                        <div className="mt-6 border-t border-slate-200 pt-5">

                          <div className="flex flex-wrap items-center justify-between gap-3">

                            <h4 className="text-base font-bold text-brand">
                              Customer Information
                            </h4>

                            {!isEditing && (
                              <button
                                type="button"
                                onClick={() =>
                                  startEditingCustomer(order)
                                }
                                className="btn-secondary"
                              >
                                ✏️ Edit Details
                              </button>
                            )}

                          </div>

                          {/* =========================
                              EDIT CUSTOMER DETAILS
                          ========================= */}

                          {isEditing ? (

                            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">

                              <div className="grid gap-4 sm:grid-cols-2">

                                {/* Full Name */}

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-brand">
                                    Full Name
                                  </label>

                                  <input
                                    name="fullName"
                                    value={
                                      customerEditForm.fullName
                                    }
                                    onChange={
                                      handleCustomerEditChange
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-brand"
                                    required
                                  />
                                </div>

                                {/* Email */}

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-brand">
                                    Email
                                  </label>

                                  <input
                                    name="email"
                                    type="email"
                                    value={
                                      customerEditForm.email
                                    }
                                    onChange={
                                      handleCustomerEditChange
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-brand"
                                    required
                                  />
                                </div>

                                {/* Phone */}

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-brand">
                                    Phone
                                  </label>

                                  <input
                                    name="phone"
                                    value={
                                      customerEditForm.phone
                                    }
                                    onChange={
                                      handleCustomerEditChange
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-brand"
                                    required
                                  />
                                </div>

                                {/* User ID */}

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-brand">
                                    User ID
                                  </label>

                                  <input
                                    value={
                                      order.userId ||
                                      user.id
                                    }
                                    readOnly
                                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm text-brand-muted"
                                  />
                                </div>

                                {/* Address */}

                                <div className="sm:col-span-2">

                                  <label className="mb-2 block text-sm font-semibold text-brand">
                                    Address
                                  </label>

                                  <textarea
                                    name="address"
                                    value={
                                      customerEditForm.address
                                    }
                                    onChange={
                                      handleCustomerEditChange
                                    }
                                    rows="3"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-brand"
                                    required
                                  />

                                </div>

                                {/* City */}

                                <div>

                                  <label className="mb-2 block text-sm font-semibold text-brand">
                                    City
                                  </label>

                                  <input
                                    name="city"
                                    value={
                                      customerEditForm.city
                                    }
                                    onChange={
                                      handleCustomerEditChange
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-brand"
                                    required
                                  />

                                </div>

                                {/* State */}

                                <div>

                                  <label className="mb-2 block text-sm font-semibold text-brand">
                                    State
                                  </label>

                                  <input
                                    name="state"
                                    value={
                                      customerEditForm.state
                                    }
                                    onChange={
                                      handleCustomerEditChange
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-brand"
                                    required
                                  />

                                </div>

                                {/* Pincode */}

                                <div>

                                  <label className="mb-2 block text-sm font-semibold text-brand">
                                    Pincode
                                  </label>

                                  <input
                                    name="pincode"
                                    value={
                                      customerEditForm.pincode
                                    }
                                    onChange={
                                      handleCustomerEditChange
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-brand"
                                    required
                                  />

                                </div>

                              </div>

                              {/* Error */}

                              {customerEditError && (
                                <p className="mt-4 text-sm text-brand-error">
                                  {customerEditError}
                                </p>
                              )}

                              {/* Buttons */}

                              <div className="mt-5 flex flex-wrap gap-3">

                                <button
                                  type="button"
                                  onClick={() =>
                                    saveCustomerDetails(order)
                                  }
                                  disabled={
                                    savingCustomerDetails
                                  }
                                  className="btn-primary"
                                >
                                  {savingCustomerDetails
                                    ? 'Saving...'
                                    : 'Save Changes'}
                                </button>

                                <button
                                  type="button"
                                  onClick={
                                    cancelEditingCustomer
                                  }
                                  disabled={
                                    savingCustomerDetails
                                  }
                                  className="btn-secondary"
                                >
                                  Cancel
                                </button>

                              </div>

                            </div>

                          ) : (

                            /* =========================
                               DISPLAY CUSTOMER DETAILS
                            ========================= */

                            <div className="mt-3 grid gap-4 sm:grid-cols-2">

                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                  Name
                                </p>

                                <p className="mt-1 text-sm font-semibold text-brand">
                                  {order.customerName ||
                                    user.fullName ||
                                    'Customer'}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                  Email
                                </p>

                                <p className="mt-1 break-all text-sm font-semibold text-brand">
                                  {order.userEmail ||
                                    user.email ||
                                    'Not available'}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                  Phone
                                </p>

                                <p className="mt-1 text-sm font-semibold text-brand">
                                  {order.phone ||
                                    'Not available'}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                  User ID
                                </p>

                                <p className="mt-1 break-all text-sm text-brand-muted">
                                  {order.userId ||
                                    user.id}
                                </p>
                              </div>

                            </div>

                          )}

                        </div>

                        {/* =========================
                            SHIPPING ADDRESS
                        ========================= */}

                        <div className="mt-6 border-t border-slate-200 pt-5">

                          <h4 className="text-base font-bold text-brand">
                            Shipping Address
                          </h4>

                          <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-brand-muted">

                            <p>
                              {shippingAddress.address ||
                                'Address not available'}
                            </p>

                            <p className="mt-1">

                              {shippingAddress.city || ''}

                              {shippingAddress.city &&
                              shippingAddress.state
                                ? ', '
                                : ''}

                              {shippingAddress.state || ''}

                            </p>

                            {shippingAddress.pincode && (
                              <p className="mt-1">
                                PIN Code:{' '}
                                {shippingAddress.pincode}
                              </p>
                            )}

                          </div>

                        </div>

                        {/* =========================
                            ITEMS ORDERED
                        ========================= */}

                        <div className="mt-6 border-t border-slate-200 pt-5">

                          <h4 className="text-base font-bold text-brand">
                            Items Ordered
                          </h4>

                          <div className="mt-3 space-y-3">

                            {(order.items || []).map(
                              (item, index) => (

                                <div
                                  key={`${order.id}-${item.productId || index}`}
                                  className="rounded-xl border border-slate-200 p-4"
                                >

                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                                    <div className="min-w-0">

                                      <p className="font-bold text-brand">
                                        {item.productName ||
                                          'Product'}
                                      </p>

                                      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-brand-muted">

                                        <p>
                                          <span className="font-semibold">
                                            Product ID:
                                          </span>{' '}
                                          {item.productId ||
                                            'N/A'}
                                        </p>

                                        <p>
                                          <span className="font-semibold">
                                            Color:
                                          </span>{' '}
                                          {item.color ||
                                            'Default'}
                                        </p>

                                        <p>
                                          <span className="font-semibold">
                                            Size:
                                          </span>{' '}
                                          {item.size ||
                                            'N/A'}
                                        </p>

                                        <p>
                                          <span className="font-semibold">
                                            Quantity:
                                          </span>{' '}
                                          {item.quantity ||
                                            0}
                                        </p>

                                        <p>
                                          <span className="font-semibold">
                                            Unit Price:
                                          </span>{' '}
                                          ₹
                                          {Number(
                                            item.price || 0
                                          ).toLocaleString(
                                            'en-IN'
                                          )}
                                        </p>

                                      </div>

                                    </div>

                                    <div className="text-left sm:text-right">

                                      <p className="text-xs text-brand-muted">
                                        Item Total
                                      </p>

                                      <p className="mt-1 text-lg font-black text-brand">
                                        ₹
                                        {(
                                          Number(
                                            item.price || 0
                                          ) *
                                          Number(
                                            item.quantity || 0
                                          )
                                        ).toLocaleString(
                                          'en-IN'
                                        )}
                                      </p>

                                    </div>

                                  </div>

                                </div>

                              )
                            )}

                          </div>

                        </div>

                        {/* =========================
                            PAYMENT
                        ========================= */}

                        <div className="mt-6 border-t border-slate-200 pt-5">

                          <h4 className="text-base font-bold text-brand">
                            Payment Information
                          </h4>

                          <div className="mt-3 rounded-xl bg-slate-50 p-4">

                            <div className="flex justify-between gap-4 text-sm">

                              <span className="text-brand-muted">
                                Payment Method
                              </span>

                              <span className="font-semibold text-brand">
                                {order.paymentMethod ||
                                  'Not specified'}
                              </span>

                            </div>

                          </div>

                        </div>

                        {/* =========================
                            ORDER SUMMARY
                        ========================= */}

                        <div className="mt-6 border-t border-slate-200 pt-5">

                          <h4 className="text-base font-bold text-brand">
                            Order Summary
                          </h4>

                          <div className="mt-3 space-y-3 text-sm">

                            <div className="flex justify-between gap-4 text-brand-muted">

                              <span>
                                Subtotal
                              </span>

                              <span>
                                ₹
                                {Number(
                                  order.subtotal || 0
                                ).toLocaleString(
                                  'en-IN'
                                )}
                              </span>

                            </div>

                            <div className="flex justify-between gap-4 text-brand-muted">

                              <span>
                                Shipping
                              </span>

                              <span>
                                ₹
                                {Number(
                                  order.shipping || 0
                                ).toLocaleString(
                                  'en-IN'
                                )}
                              </span>

                            </div>

                            <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-lg font-black text-brand">

                              <span>
                                Total
                              </span>

                              <span>
                                ₹
                                {Number(
                                  order.total || 0
                                ).toLocaleString(
                                  'en-IN'
                                )}
                              </span>

                            </div>

                          </div>

                        </div>

                      </div>

                    )}

                  </div>

                );
              })}

            </div>

          )}

        </div>

        {/* =========================
            WISHLIST
        ========================= */}

        <div className="card-surface p-6">

          <h3 className="text-xl font-bold">
            Wishlist
          </h3>

          {wishlistProducts.length === 0 ? (

            <p className="mt-3 text-sm text-brand-muted">
              No saved items yet. Add styles to your wishlist from the shop.
            </p>

          ) : (

            <div className="mt-4 space-y-3">

              {wishlistProducts.map((product) => (

                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                >

                  <img
                    src={
                      product.thumbnail ||
                      product.images?.[0]
                    }
                    alt={product.name}
                    className="h-14 w-14 rounded-lg object-cover"
                  />

                  <div className="flex-1">

                    <p className="font-semibold text-brand">
                      {product.name}
                    </p>

                    <p className="text-xs text-brand-muted">
                      ₹
                      {Number(
                        product.sellingPrice || 0
                      ).toLocaleString('en-IN')}
                    </p>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}