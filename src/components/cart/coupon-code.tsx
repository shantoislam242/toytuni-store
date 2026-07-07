"use client";

import { useState } from "react";
import { Check, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Demo-only coupon table (frontend state only — no backend/validation).
const DEMO_COUPONS: Record<string, string> = {
  TOY10: "10% off",
  WELCOME: "৳100 off",
  NEEM15: "15% off",
};

type CouponStatus = { type: "idle" | "success" | "error"; message: string };

/**
 * Standalone coupon-code entry. Frontend only: the code lives in local state and
 * is checked against a demo table. Rendered above the Order Summary so shoppers
 * can apply a code right before reviewing their total.
 */
export function CouponCode() {
  const [coupon, setCoupon] = useState("");
  const [couponStatus, setCouponStatus] = useState<CouponStatus>({
    type: "idle",
    message: "",
  });

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = coupon.trim().toUpperCase();
    if (!code) {
      setCouponStatus({ type: "error", message: "Please enter a coupon code." });
      return;
    }
    if (DEMO_COUPONS[code]) {
      setCouponStatus({
        type: "success",
        message: `Coupon applied — ${DEMO_COUPONS[code]} (demo).`,
      });
    } else {
      setCouponStatus({
        type: "error",
        message: "Invalid or expired coupon code.",
      });
    }
  };

  return (
    <div className="rounded-xl border border-cream-300 bg-card p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-neem/10 text-neem-deep">
          <Ticket className="size-4" />
        </span>
        <h2 className="text-sm font-bold text-ink">Coupon Code</h2>
      </div>

      <form onSubmit={applyCoupon} className="mt-3 flex items-center gap-2">
        <Input
          value={coupon}
          onChange={(e) => {
            setCoupon(e.target.value);
            if (couponStatus.type !== "idle") {
              setCouponStatus({ type: "idle", message: "" });
            }
          }}
          placeholder="Enter coupon code"
          aria-label="Coupon code"
          className="h-10 flex-1"
        />
        <Button type="submit" className="h-10 shrink-0" disabled={!coupon.trim()}>
          Apply
        </Button>
      </form>
      {couponStatus.type !== "idle" ? (
        <p
          className={cn(
            "mt-2 flex items-center gap-1.5 text-xs font-medium",
            couponStatus.type === "success" ? "text-neem-deep" : "text-danger",
          )}
        >
          {couponStatus.type === "success" ? (
            <Check className="size-3.5" />
          ) : (
            <X className="size-3.5" />
          )}
          {couponStatus.message}
        </p>
      ) : null}
    </div>
  );
}
