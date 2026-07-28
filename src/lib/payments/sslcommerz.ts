import "server-only";

/**
 * SSLCommerz gateway integration (hosted / redirect flow).
 *
 * Sandbox vs live is driven purely by env — swap the three vars and nothing
 * else changes:
 *   SSLCOMMERZ_STORE_ID
 *   SSLCOMMERZ_STORE_PASSWD
 *   SSLCOMMERZ_SANDBOX   ("true" → sandbox, anything else / unset → live)
 *
 * When the store id/password are absent, `isOnlinePaymentEnabled()` is false
 * and the whole online-payment path stays hidden — the build never breaks and
 * COD keeps working.
 *
 * SECURITY: the success redirect from the browser is never trusted on its own.
 * `validatePayment(val_id)` re-queries SSLCommerz server-to-server and the
 * caller additionally checks tran_id + amount before marking an order paid.
 */

const STORE_ID = process.env.SSLCOMMERZ_STORE_ID;
const STORE_PASSWD = process.env.SSLCOMMERZ_STORE_PASSWD;
const IS_SANDBOX = process.env.SSLCOMMERZ_SANDBOX === "true";

const BASE_URL = IS_SANDBOX
  ? "https://sandbox.sslcommerz.com"
  : "https://securepay.sslcommerz.com";

/** True only when both credentials are configured. Gates the online option. */
export function isOnlinePaymentEnabled(): boolean {
  return Boolean(STORE_ID && STORE_PASSWD);
}

export type InitiateInput = {
  /** Our order number — becomes the SSLCommerz tran_id (unique per order). */
  orderNumber: string;
  /** Order grand total in whole BDT taka. */
  amount: number;
  customer: { name: string; phone: string; email: string | null };
  address: { addressLine: string; district: string };
  /** Site origin (no trailing slash) the gateway should redirect back to. */
  baseUrl: string;
  numItems: number;
};

export type InitiateResult =
  | { ok: true; gatewayUrl: string }
  | { ok: false; error: string };

/** Callback paths the gateway posts back to (browser redirects + server IPN). */
export const CALLBACK_PATHS = {
  success: "/api/payment/sslcommerz/success",
  fail: "/api/payment/sslcommerz/fail",
  cancel: "/api/payment/sslcommerz/cancel",
  ipn: "/api/payment/sslcommerz/ipn",
} as const;

/**
 * Open a SSLCommerz session and return the hosted GatewayPageURL to redirect
 * the shopper to. Returns a friendly error (never throws) so the caller can
 * roll the pending order back.
 */
export async function initiatePayment(input: InitiateInput): Promise<InitiateResult> {
  if (!STORE_ID || !STORE_PASSWD) {
    return { ok: false, error: "Online payment is not configured." };
  }

  const body = new URLSearchParams({
    store_id: STORE_ID,
    store_passwd: STORE_PASSWD,
    total_amount: String(input.amount),
    currency: "BDT",
    tran_id: input.orderNumber,
    success_url: `${input.baseUrl}${CALLBACK_PATHS.success}`,
    fail_url: `${input.baseUrl}${CALLBACK_PATHS.fail}`,
    cancel_url: `${input.baseUrl}${CALLBACK_PATHS.cancel}`,
    ipn_url: `${input.baseUrl}${CALLBACK_PATHS.ipn}`,
    // Product (required by the API — a single line is fine for a hosted page).
    product_name: `Order ${input.orderNumber}`,
    product_category: "toys",
    product_profile: "physical-goods",
    // Customer (required).
    cus_name: input.customer.name,
    cus_email: input.customer.email ?? "noreply@example.com",
    cus_add1: input.address.addressLine,
    cus_city: input.address.district,
    cus_country: "Bangladesh",
    cus_phone: input.customer.phone,
    // Shipping (required when shipping_method != NO).
    shipping_method: "Courier",
    ship_name: input.customer.name,
    ship_add1: input.address.addressLine,
    ship_city: input.address.district,
    ship_country: "Bangladesh",
    ship_postcode: "0000",
    num_of_item: String(input.numItems),
  });

  try {
    const res = await fetch(`${BASE_URL}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const data = (await res.json()) as {
      status?: string;
      GatewayPageURL?: string;
      failedreason?: string;
    };
    if (data.status === "SUCCESS" && data.GatewayPageURL) {
      return { ok: true, gatewayUrl: data.GatewayPageURL };
    }
    return { ok: false, error: data.failedreason || "Could not start payment." };
  } catch (err) {
    console.error("SSLCommerz initiate failed:", err);
    return { ok: false, error: "Payment gateway unreachable. Please try again." };
  }
}

export type ValidationResult = {
  valid: boolean;
  tranId: string | null;
  /** Settled amount in BDT (float as returned by the gateway). */
  amount: number | null;
  currency: string | null;
  bankTranId: string | null;
  cardType: string | null;
};

/**
 * Server-to-server validation of a completed transaction. This is the
 * authoritative check — call it with the `val_id` the gateway returned before
 * marking anything paid. `status` VALID/VALIDATED means the money moved.
 */
export async function validatePayment(valId: string): Promise<ValidationResult> {
  const empty: ValidationResult = {
    valid: false, tranId: null, amount: null, currency: null, bankTranId: null, cardType: null,
  };
  if (!STORE_ID || !STORE_PASSWD || !valId) return empty;

  const url =
    `${BASE_URL}/validator/api/validationserverAPI.php` +
    `?val_id=${encodeURIComponent(valId)}` +
    `&store_id=${encodeURIComponent(STORE_ID)}` +
    `&store_passwd=${encodeURIComponent(STORE_PASSWD)}` +
    `&v=1&format=json`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json()) as {
      status?: string;
      tran_id?: string;
      amount?: string;
      currency?: string;
      bank_tran_id?: string;
      card_type?: string;
    };
    const valid = data.status === "VALID" || data.status === "VALIDATED";
    return {
      valid,
      tranId: data.tran_id ?? null,
      amount: data.amount != null ? Number(data.amount) : null,
      currency: data.currency ?? null,
      bankTranId: data.bank_tran_id ?? null,
      cardType: data.card_type ?? null,
    };
  } catch (err) {
    console.error("SSLCommerz validation failed:", err);
    return empty;
  }
}
