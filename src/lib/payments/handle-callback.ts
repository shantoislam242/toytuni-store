import "server-only";
import { validatePayment } from "./sslcommerz";
import { settleOnlineOrder, voidOnlineOrder } from "./settle";

/**
 * Shared logic for the SSLCommerz callback routes. The browser success redirect
 * and the server-to-server IPN both land here; settlement is idempotent so
 * whichever arrives first (or both) is safe.
 */

/**
 * Validate a completed transaction server-to-server and settle the order.
 * Trusts NOTHING from the posted form except the tran_id + val_id keys — the
 * real amount/status come from `validatePayment`, and `settleOnlineOrder`
 * re-checks the amount against the stored order total.
 */
export async function handlePaidCallback(
  form: FormData,
): Promise<{ ok: boolean; orderNumber: string | null }> {
  const tranId = String(form.get("tran_id") ?? "").trim();
  const valId = String(form.get("val_id") ?? "").trim();
  if (!tranId) return { ok: false, orderNumber: null };

  const v = await validatePayment(valId);
  // val_id must validate AND belong to this exact order (no cross-order replay).
  if (!v.valid || v.tranId !== tranId) {
    return { ok: false, orderNumber: tranId };
  }
  const r = await settleOnlineOrder(tranId, v.bankTranId ?? valId, v.amount);
  return { ok: r.ok, orderNumber: tranId };
}

/** Void a pending order after a failed/cancelled payment (restores stock). */
export async function handleVoidCallback(form: FormData, reason: string): Promise<string | null> {
  const tranId = String(form.get("tran_id") ?? "").trim();
  if (!tranId) return null;
  await voidOnlineOrder(tranId, reason);
  return tranId;
}
