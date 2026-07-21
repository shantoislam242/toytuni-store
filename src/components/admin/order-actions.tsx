"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  BadgeDollarSign,
  Download,
  Printer,
  SendHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateOrderStatus,
  shipOrder,
  markOrderPaid,
  cancelOrder,
  addOrderNote,
} from "@/lib/admin/actions";
import { ORDER_CARRIERS } from "@/lib/admin/order-constants";
import { allowedTransitions, type OrderStatus } from "@/lib/orders/status-workflow";

type DialogState = { mode: "ship" } | { mode: "cancel" } | null;

/**
 * Workflow-driven action panel for the order-detail page (Order-Fulfillment
 * Task 7). Replaces the bare `OrderStatusSelect` dropdown: renders only the
 * buttons `allowedTransitions(status)` actually permits, plus the always-on
 * "mark paid" / add-note / invoice affordances. Mirrors `BlogCategoryManager`
 * / `TaxonomyManager`'s client-component idioms (`useTransition`, `sonner`
 * toast, `router.refresh()` after a successful `ActionResult`, same dialog
 * markup).
 */
export function OrderActions({
  orderId,
  orderNumber,
  status,
  paymentStatus,
}: {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const next = allowedTransitions(status);
  const canConfirm = next.includes("confirmed");
  const canShip = next.includes("shipped");
  const canDeliver = next.includes("delivered");
  const canCancel = next.includes("cancelled");
  const canMarkPaid = paymentStatus === "pending" && status !== "cancelled";

  const refresh = () => router.refresh();

  const runSimple = (label: string, action: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    startTransition(async () => {
      const r = await action();
      if (r.ok) {
        toast.success(label);
        refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  const handleConfirm = () => runSimple("Order confirmed.", () => updateOrderStatus(orderId, "confirmed"));
  const handleDeliver = () => runSimple("Order marked delivered.", () => updateOrderStatus(orderId, "delivered"));
  const handleMarkPaid = () => runSimple("Order marked as paid.", () => markOrderPaid(orderId));

  const handleAddNote = () => {
    const trimmed = note.trim();
    if (!trimmed) return toast.error("Note is empty.");
    startTransition(async () => {
      const r = await addOrderNote(orderId, trimmed);
      if (r.ok) {
        toast.success("Note added.");
        setNote("");
        refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  const handleDownloadInvoice = async () => {
    const res = await fetch(`/admin/orders/${orderId}/invoice`);
    if (!res.ok) {
      toast.error("Invoice failed");
      return;
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${orderNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canConfirm && (
        <Button size="sm" onClick={handleConfirm} disabled={isPending}>
          <CheckCircle2 className="size-4" /> Confirm
        </Button>
      )}
      {canShip && (
        <Button size="sm" onClick={() => setDialog({ mode: "ship" })} disabled={isPending}>
          <Truck className="size-4" /> Ship…
        </Button>
      )}
      {canDeliver && (
        <Button size="sm" onClick={handleDeliver} disabled={isPending}>
          <PackageCheck className="size-4" /> Mark delivered
        </Button>
      )}
      {canMarkPaid && (
        <Button size="sm" variant="outline" onClick={handleMarkPaid} disabled={isPending}>
          <BadgeDollarSign className="size-4" /> Mark as paid
        </Button>
      )}
      {canCancel && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setDialog({ mode: "cancel" })}
          disabled={isPending}
        >
          <XCircle className="size-4" /> Cancel…
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={handleDownloadInvoice} disabled={isPending}>
        <Download className="size-4" /> Download invoice
      </Button>
      <Button size="sm" variant="outline" onClick={() => window.print()} disabled={isPending}>
        <Printer className="size-4" /> Print
      </Button>

      <div className="flex w-full items-center gap-2 pt-1">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add an internal note…"
          disabled={isPending}
          className="max-w-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddNote();
          }}
        />
        <Button size="sm" variant="outline" onClick={handleAddNote} disabled={isPending || note.trim() === ""}>
          <SendHorizontal className="size-4" /> Add note
        </Button>
      </div>

      {dialog?.mode === "ship" && (
        <ShipDialog
          orderId={orderId}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}
      {dialog?.mode === "cancel" && (
        <CancelDialog
          orderId={orderId}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ShipDialog({
  orderId,
  onClose,
  onDone,
}: {
  orderId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [carrier, setCarrier] = useState<string>(ORDER_CARRIERS[0]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [busy, start] = useTransition();

  const save = () => {
    if (trackingNumber.trim() === "") return toast.error("Tracking number is required.");
    start(async () => {
      const r = await shipOrder(orderId, {
        carrier,
        trackingNumber,
        trackingUrl: trackingUrl.trim() || undefined,
      });
      if (r.ok) {
        toast.success("Order marked as shipped.");
        onDone();
      } else {
        toast.error(r.error);
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-cream-300 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold text-ink">Ship order</h2>
        <div className="mt-4 space-y-3">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Carrier</span>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_CARRIERS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Tracking number</span>
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="mt-1"
              placeholder="e.g. PTH123456"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Tracking URL <span className="normal-case text-ink-soft">(optional)</span>
            </span>
            <Input
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              className="mt-1"
              placeholder="https://…"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Mark shipped"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CancelDialog({
  orderId,
  onClose,
  onDone,
}: {
  orderId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, start] = useTransition();

  const save = () => {
    if (reason.trim() === "") return toast.error("A cancellation reason is required.");
    start(async () => {
      const r = await cancelOrder(orderId, reason);
      if (r.ok) {
        toast.success("Order cancelled.");
        onDone();
      } else {
        toast.error(r.error);
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-cream-300 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold text-ink">Cancel order</h2>
        <div className="mt-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why is this order being cancelled?"
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Back
          </Button>
          <Button variant="destructive" onClick={save} disabled={busy}>
            {busy ? "Cancelling…" : "Cancel order"}
          </Button>
        </div>
      </div>
    </div>
  );
}
