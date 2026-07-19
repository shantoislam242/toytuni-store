import { formatDate } from "@/lib/format";
import type { OrderHistoryItem } from "@/lib/admin/queries";

/** Capitalize a status like "confirmed" -> "Confirmed". */
function statusLabel(status: string): string {
  return status.length === 0 ? status : status[0].toUpperCase() + status.slice(1);
}

/** `createdAt`'s time-of-day, e.g. "3:45 PM". */
function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * Vertical status-history timeline for the order-detail sidebar
 * (Order-Fulfillment Task 7). Server component — plain render of
 * `getOrderStatusHistory(orderId)`'s rows, oldest first. Cream/ink palette,
 * matching the rest of `/admin`.
 */
export function OrderTimeline({ items }: { items: OrderHistoryItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-muted">No activity yet.</p>;
  }

  return (
    <ol className="space-y-0">
      {items.map((item, i) => (
        <li key={item.id} className="relative pb-5 pl-6 last:pb-0">
          {i < items.length - 1 && (
            <span className="absolute top-2 left-[3px] h-full w-px bg-cream-300" aria-hidden="true" />
          )}
          <span className="absolute top-1.5 left-0 size-[7px] rounded-full bg-neem-deep" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">{statusLabel(item.status)}</p>
          {item.note ? <p className="mt-0.5 text-sm text-ink-muted">{item.note}</p> : null}
          <p className="mt-0.5 text-xs text-ink-soft">
            {formatDate(item.createdAt.slice(0, 10))} · {timeOf(item.createdAt)}
            {item.changedBy ? ` · ${item.changedBy}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
