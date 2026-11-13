/**
 * Contexto del carrito.
 *
 * Mantiene el carrito del usuario (que vive en el servicio de Pedidos) y lo
 * comparte con el encabezado (contador) y las páginas. Cada acción llama a la
 * API y reemplaza el carrito con la respuesta, que siempre trae el carrito
 * completo actualizado.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cartApi } from '../api/endpoints';
import type { Cart } from '../api/types';
import { useAuth } from './AuthContext';

const EMPTY: Cart = { items: [], totalItems: 0, estimatedTotal: 0 };

interface CartContextValue {
  cart: Cart;
  /** Todas estas acciones lanzan `ApiError` si fallan (sin stock, servicio caído...). */
  add: (productId: string, quantity: number) => Promise<void>;
  update: (productId: string, quantity: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  /** Vuelve a leer el carrito (por ejemplo, después de comprar). */
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart>(EMPTY);

  const refresh = useCallback(async () => {
    if (!user) return setCart(EMPTY);
    try {
      setCart(await cartApi.get());
    } catch {
      /* si Pedidos no responde, se conserva el carrito que ya se mostraba */
    }
  }, [user]);

  // Cada vez que cambia el usuario (entra o sale) se carga su carrito.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(async (productId: string, quantity: number) => setCart(await cartApi.add(productId, quantity)), []);
  const update = useCallback(async (productId: string, quantity: number) => setCart(await cartApi.update(productId, quantity)), []);
  const remove = useCallback(async (productId: string) => setCart(await cartApi.remove(productId)), []);

  const value = useMemo(() => ({ cart, add, update, remove, refresh }), [cart, add, update, remove, refresh]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Acceso al carrito desde cualquier componente. */
// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>.');
  return ctx;
}
