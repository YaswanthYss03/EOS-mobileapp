import type { WalletTransaction } from "@/services/api/wallet.api";

// How each wallet entry reads in "Recent activity": a clear title and the real reason behind it, taken from the
// transaction itself. An "adjustment" is the wallet's catch-all for money that moved without a payment or a top-up:
// in practice almost always a REFUND (a cancelled canteen order, a rejected print request), sometimes a credit or
// deduction made by the college. Saying only "Adjustment" hides which.

export type TxnIcon = "cash-outline" | "card-outline" | "return-down-back-outline" | "settings-outline" | "storefront-outline" | "swap-horizontal-outline";

export type TxnDescription = {
  icon: TxnIcon;
  title: string;
  /** The reason or what it was for. */
  detail: string | null;
  /** Where it happened (a refund says which outlet it came back from), shown before the date. */
  where: string | null;
};

const capitalise = (text: string) => (text ? text[0].toUpperCase() + text.slice(1) : text);

/** "Refund: print request #33 was rejected" -> "Print request #33 was rejected". */
export function refundReason(remarks: string | null): string | null {
  const text = (remarks ?? "").replace(/^\s*refund(\s+for)?\s*:?\s*/i, "").trim();
  return text ? capitalise(text) : null;
}

/** "Canteen order: Idli x1" -> "Idli x1"; anything else is shown as it is. */
export function purchaseDetail(remarks: string | null): string | null {
  const text = (remarks ?? "").replace(/^\s*canteen order\s*:\s*/i, "").trim();
  return text || null;
}

export function describeTransaction(txn: Pick<WalletTransaction, "txn_type" | "source" | "remarks" | "outlet" | "related_transaction_id" | "related_outlet" | "counterparty_email">): TxnDescription {
  const credit = txn.txn_type === "credit";
  switch (txn.source) {
    case "razorpay":
      return { icon: "card-outline", title: "Top-up", detail: "Added by card or UPI", where: null };
    case "cash":
      return { icon: "cash-outline", title: "Cash top-up", detail: "Added at the recharge counter", where: null };
    case "transfer":
      return {
        icon: "swap-horizontal-outline",
        title: txn.counterparty_email ? (credit ? `From ${txn.counterparty_email}` : `To ${txn.counterparty_email}`) : credit ? "Money received" : "Money sent",
        detail: null,
        where: null,
      };
    case "purchase":
      return { icon: "storefront-outline", title: txn.outlet?.name ?? "Purchase", detail: purchaseDetail(txn.remarks), where: null };
    case "adjustment":
    default:
      // A credit that reverses an earlier purchase is a refund; the reason is in the remarks.
      if (credit && txn.related_transaction_id !== null && txn.related_transaction_id !== undefined) {
        return {
          icon: "return-down-back-outline",
          title: "Refund",
          detail: refundReason(txn.remarks) ?? "Returned to your wallet",
          where: txn.outlet?.name ?? txn.related_outlet?.name ?? null,
        };
      }
      return {
        icon: "settings-outline",
        title: credit ? "Added by the college" : "Deducted by the college",
        detail: (txn.remarks ?? "").trim() || "Balance adjustment",
        where: null,
      };
  }
}

/** "3:21 pm" - 12-hour, in the phone's own time. */
export function formatTime(date: Date): string {
  const hours = date.getHours();
  return `${hours % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")} ${hours < 12 ? "am" : "pm"}`;
}
