"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Blob-fetch `href` (a PDF invoice route) and trigger a browser download as
 * `fileName`. Mirrors `OrderActions.handleDownloadInvoice` (OP-1 admin order
 * detail): fetch, `res.ok` guard, object URL, revoke. Shared by the account
 * order-detail page and (Task 6) the public order-tracking page — the caller
 * owns the ownership check, this component just downloads whatever `href`
 * returns.
 */
export function InvoiceDownloadButton({
  href,
  fileName,
}: {
  href: string;
  fileName: string;
}) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const res = await fetch(href);
      if (!res.ok) {
        toast.error("Couldn't download the invoice. Please try again.");
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't download the invoice. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleDownload} disabled={busy}>
      <Download className="size-4" />
      {busy ? "Preparing…" : "Download invoice"}
    </Button>
  );
}
