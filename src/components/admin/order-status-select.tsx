"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrderStatus } from "@/lib/admin/actions";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

/**
 * Status dropdown for an order's detail page. Calls the `updateOrderStatus`
 * Server Action directly (Task 6) — no client-side Supabase import, service-role
 * writes stay server-only.
 */
export function OrderStatusSelect({ orderId, current }: { orderId: string; current: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [isPending, startTransition] = useTransition();

  const handleChange = (next: string) => {
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, next);
      if (result.ok) {
        toast.success(`Order status updated to "${next}".`);
        router.refresh();
      } else {
        setStatus(previous);
        toast.error(result.error);
      }
    });
  };

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-40 capitalize">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="capitalize">
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
