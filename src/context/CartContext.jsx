import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'fashion_eye_care_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), 2200);
  };

  const addToCart = (product, selectedVariant = {}) => {
    const variantKey = `${selectedVariant.color || product.availableColors?.[0] || 'default'}-${selectedVariant.size || product.size || 'M'}`;
    setItems((current) => {
      const existingIndex = current.findIndex(
        (item) => item.productId === product.id && item.variantKey === variantKey,
      );

      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex].quantity += 1;
        return updated;
      }

      return [
        ...current,
        {
          id: `${product.id}-${variantKey}-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          productImage: product.thumbnail,
          color: selectedVariant.color || product.availableColors?.[0] || 'Default',
          size: selectedVariant.size || product.size || 'M',
          quantity: 1,
          price: product.sellingPrice,
          variantKey,
        },
      ];
    });

    showToast(`${product.name} added to cart`);
  };

  const updateQuantity = (productId, color, size, quantity) => {
    setItems((current) =>
      current.map((item) => {
        if (item.productId === productId && item.color === color && item.size === size) {
          return { ...item, quantity: Math.max(1, quantity) };
        }
        return item;
      }),
    );
  };

  const removeItem = (productId, color, size) => {
    setItems((current) =>
      current.filter((item) => !(item.productId === productId && item.color === color && item.size === size)),
    );
  };

  const clearCart = () => setItems([]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, addToCart, updateQuantity, removeItem, clearCart, subtotal, count, toast, showToast }),
    [items, subtotal, count, toast],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
