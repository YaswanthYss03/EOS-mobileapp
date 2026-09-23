import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { StationeryProduct } from "@/services/api/stationery.api";

// Client-side only - the cart never touches the backend until checkout (see
// stationery.api.ts's checkoutStationeryWithWallet/createStationeryRazorpayOrder),
// same "cart is just local state, order is the real server-side thing"
// shape as the reference design (Stationery Login.dc.html). Mounted at the
// app root (see app/_layout.tsx) rather than scoped to the Campus tab, so
// the cart survives switching tabs and coming back - same reasoning as
// MessagingContext being root-mounted.

export type CartLine = { product: StationeryProduct; quantity: number };

type StationeryCartState = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  total: number;
  quantityOf: (productId: number) => number;
  addOne: (product: StationeryProduct) => void;
  removeOne: (productId: number) => void;
  removeLine: (productId: number) => void;
  clear: () => void;
};

const StationeryCartContext = createContext<StationeryCartState | null>(null);

export function useStationeryCart() {
  const ctx = useContext(StationeryCartContext);
  if (!ctx) throw new Error("useStationeryCart must be used within StationeryCartProvider");
  return ctx;
}

export function StationeryCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  function addOne(product: StationeryProduct) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (product.stock_quantity <= 0) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  }

  function removeOne(productId: number) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((l) => l.product.id !== productId);
      return prev.map((l) => (l.product.id === productId ? { ...l, quantity: l.quantity - 1 } : l));
    });
  }

  function removeLine(productId: number) {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }

  function clear() {
    setLines([]);
  }

  function quantityOf(productId: number) {
    return lines.find((l) => l.product.id === productId)?.quantity ?? 0;
  }

  const { itemCount, subtotal, total } = useMemo(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const sub = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
    return { itemCount: count, subtotal: sub, total: sub };
  }, [lines]);

  return (
    <StationeryCartContext.Provider
      value={{ lines, itemCount, subtotal, total, quantityOf, addOne, removeOne, removeLine, clear }}
    >
      {children}
    </StationeryCartContext.Provider>
  );
}
