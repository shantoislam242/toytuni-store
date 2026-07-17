"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Truck } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

/** A titled block inside the Order Options card (icon + heading + content). */
function OptionSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-neem/10 text-neem-deep">
          <Icon className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          {description ? (
            <p className="text-xs text-ink-soft">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Reusable selectable row backed by a native radio input. */
function RadioRow({
  name,
  value,
  checked,
  onChange,
  label,
  description,
  disabled,
  badge,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
        disabled
          ? "cursor-not-allowed border-cream-300 bg-cream-100/50 opacity-70"
          : checked
            ? "border-neem bg-neem/5"
            : "border-cream-300 hover:border-neem-soft",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-0.5 size-4 flex-none accent-neem"
      />
      <span className="flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{label}</span>
          {badge ? (
            <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
              {badge}
            </span>
          ) : null}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-ink-soft">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

/**
 * Cart "Order Options" — delivery method and reward points. Frontend only:
 * every value lives in local React state, so it persists while the shopper
 * stays on the Cart page. (Order notes live on the checkout page; gift wrapping
 * lives in the Order Summary; Terms agreement lives beside the Checkout button.)
 */
export function OrderOptions({
  rewardPoints = 0,
}: {
  /** Points shown when logged in. */
  rewardPoints?: number;
}) {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [delivery, setDelivery] = useState<"home" | "pickup">("home");

  return (
    <div className="rounded-xl border border-cream-300 bg-card p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-ink">Order Options</h2>

      <div className="mt-5 space-y-5">
        {/* 1. Delivery method */}
        <OptionSection icon={Truck} title="Delivery Method">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <RadioRow
              name="delivery"
              value="home"
              checked={delivery === "home"}
              onChange={() => setDelivery("home")}
              label="Home Delivery"
              description="Delivered to your doorstep"
            />
            <RadioRow
              name="delivery"
              value="pickup"
              checked={delivery === "pickup"}
              onChange={() => setDelivery("pickup")}
              label="Store Pickup"
              description="Not available in your area yet"
              badge="Soon"
              disabled
            />
          </div>
        </OptionSection>

        <div className="h-px bg-cream-200" />

        {/* 2. Reward points */}
        <OptionSection icon={Award} title="Reward Points">
          {isLoggedIn ? (
            <div className="flex items-center justify-between rounded-lg border border-neem/20 bg-neem/5 p-3">
              <span className="text-sm text-ink">Available reward points</span>
              <span className="font-display text-lg font-bold text-neem-deep">
                {rewardPoints.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="rounded-lg border border-cream-300 bg-cream-100/60 p-3">
              <p className="text-sm text-ink-muted">
                Sign in to earn and redeem reward points on every order.
              </p>
              <Link
                href="/signin"
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-neem-deep hover:underline"
              >
                Sign in to continue →
              </Link>
            </div>
          )}
        </OptionSection>
      </div>
    </div>
  );
}
