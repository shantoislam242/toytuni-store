import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Export CSV" download link. A plain GET anchor (the route replies with a
 * `Content-Disposition: attachment` CSV), styled as an outline button. Server
 * component — no interactivity of its own.
 */
export function ExportCsvLink({ href, label = "Export CSV" }: { href: string; label?: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href}>
        <Download className="size-4" />
        {label}
      </a>
    </Button>
  );
}
