import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CraveoDish } from "@/services/api/craveo.api";

// Client-side only, same "cart is local state, order is the real
// server-side thing" shape as StationeryCartContext - nothing touches the
// backend until checkout. Root-mounted (see app/_layout.tsx) so the cart
// survives switching tabs.

export type CraveoCartLine = { dish: CraveoDish; quantity: number };

type CraveoCartState = {
  lines: CraveoCartLine[];
  itemCount: number;
  subtotal: number;
  total: number;
  quantityOf: (dishId: number) => number;
  addOne: (dish: CraveoDish) => void;
  removeOne: (dishId: number) => void;
  removeLine: (dishId: number) => void;
  clear: () => void;
};

const CraveoCartContext = createContext<CraveoCartState | null>(null);

export function useCraveoCart() {
  const ctx = useContext(CraveoCartContext);
  if (!ctx) throw new Error("useCraveoCart must be used within CraveoCartProvider");
  return ctx;
}

export function CraveoCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CraveoCartLine[]>([]);

  function addOne(dish: CraveoDish) {
    setLines((prev) => {
      const existing = prev.find((l) => l.dish.id === dish.id);
      if (existing) {
        if (existing.quantity >= dish.stock_quantity) return prev;
        return prev.map((l) => (l.dish.id === dish.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (dish.stock_quantity <= 0) return prev;
      return [...prev, { dish, quantity: 1 }];
    });
  }

  function removeOne(dishId: number) {
    setLines((prev) => {
      const existing = prev.find((l) => l.dish.id === dishId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((l) => l.dish.id !== dishId);
      return prev.map((l) => (l.dish.id === dishId ? { ...l, quantity: l.quantity - 1 } : l));
    });
  }

  function removeLine(dishId: number) {
    setLines((prev) => prev.filter((l) => l.dish.id !== dishId));
  }

  function clear() {
    setLines([]);
  }

  function quantityOf(dishId: number) {
    return lines.find((l) => l.dish.id === dishId)?.quantity ?? 0;
  }

  const { itemCount, subtotal, total } = useMemo(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const sub = lines.reduce((sum, l) => sum + l.dish.price * l.quantity, 0);
    return { itemCount: count, subtotal: sub, total: sub };
  }, [lines]);

  return (
    <CraveoCartContext.Provider
      value={{ lines, itemCount, subtotal, total, quantityOf, addOne, removeOne, removeLine, clear }}
    >
      {children}
    </CraveoCartContext.Provider>
  );
}
