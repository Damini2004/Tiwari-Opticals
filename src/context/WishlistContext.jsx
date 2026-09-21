import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const storageKey = user?.id ? `fashion_eye_care_wishlist_${user.id}` : 'fashion_eye_care_wishlist_guest';

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!user) {
      setItems([]);
      return;
    }

    const saved = localStorage.getItem(storageKey);
    setItems(saved ? JSON.parse(saved) : []);
  }, [user?.id, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey, user]);

  const toggleItem = (productId) => {
    setItems((current) =>
      current.includes(productId)
        ? current.filter((item) => item !== productId)
        : [...current, productId],
    );
  };

  const value = useMemo(() => ({ items, toggleItem, count: items.length }), [items]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used inside WishlistProvider');
  return context;
}
