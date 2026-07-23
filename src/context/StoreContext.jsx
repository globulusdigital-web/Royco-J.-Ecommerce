import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { normalizeProduct } from "../lib/format";
import { fallbackProducts, fallbackPromotions } from "../data/fallbackProducts";

const StoreContext = createContext(null);
const CART_KEY = "royco-cart-v1";

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }) {
  const [products, setProducts] = useState(fallbackProducts);
  const [promotions, setPromotions] = useState(fallbackPromotions);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [usingPreviewData, setUsingPreviewData] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState(readCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, tone = "success") => {
    setToast({ message, tone, id: Date.now() });
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [productPayload, promotionPayload] = await Promise.all([
        api("/api/products"),
        api("/api/promotions"),
      ]);
      const nextProducts = productPayload?.products ?? productPayload;
      const nextPromotions = promotionPayload?.promotions ?? promotionPayload;
      if (Array.isArray(nextProducts) && nextProducts.length) {
        setProducts(nextProducts.map(normalizeProduct));
        setUsingPreviewData(false);
      }
      if (Array.isArray(nextPromotions)) setPromotions(nextPromotions);
    } catch {
      setProducts(fallbackProducts);
      setPromotions(fallbackPromotions);
      setUsingPreviewData(true);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const payload = await api("/api/auth/me");
      setUser(payload?.user ?? payload ?? null);
      return payload?.user ?? payload ?? null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    refreshAuth();
  }, [loadCatalog, refreshAuth]);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const addToCart = useCallback((product, quantity = 1) => {
    const safeQuantity = Math.max(1, Math.min(Number(quantity) || 1, product.stock || 99));
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + safeQuantity, product.stock || 99) }
            : item,
        );
      }
      return [...current, { product: normalizeProduct(product), quantity: safeQuantity }];
    });
    setCartOpen(true);
    notify(`${product.name} added to your bag.`);
  }, [notify]);

  const updateCart = useCallback((productId, quantity) => {
    setCart((current) => current
      .map((item) => item.product.id === productId
        ? { ...item, quantity: Math.max(0, Math.min(Number(quantity) || 0, item.product.stock || 99)) }
        : item)
      .filter((item) => item.quantity > 0));
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const login = useCallback(async (credentials, admin = false) => {
    const payload = await api("/api/auth/login", {
      method: "POST",
      body: { ...credentials, admin },
    });
    const nextUser = payload?.user ?? payload;
    setUser(nextUser);
    notify(`Welcome back${nextUser?.name ? `, ${nextUser.name.split(" ")[0]}` : ""}.`);
    return nextUser;
  }, [notify]);

  const signup = useCallback(async (details) => {
    const payload = await api("/api/auth/signup", { method: "POST", body: details });
    const nextUser = payload?.user ?? payload;
    setUser(nextUser);
    notify("Your Royco account is ready.");
    return nextUser;
  }, [notify]);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      notify("You have been signed out.", "info");
    }
  }, [notify]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const value = useMemo(() => ({
    products,
    promotions,
    catalogLoading,
    usingPreviewData,
    reloadCatalog: loadCatalog,
    user,
    authLoading,
    refreshAuth,
    login,
    signup,
    logout,
    cart,
    cartCount,
    cartSubtotal,
    cartOpen,
    setCartOpen,
    addToCart,
    updateCart,
    removeFromCart,
    clearCart,
    toast,
    setToast,
    notify,
  }), [products, promotions, catalogLoading, usingPreviewData, loadCatalog, user, authLoading, refreshAuth, login, signup, logout, cart, cartCount, cartSubtotal, cartOpen, addToCart, updateCart, removeFromCart, clearCart, toast, notify]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
}
