"use client";

import { Plus, ArrowUp, ArrowDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { moveInArray } from "@/lib/array-move";

export function StringListEditor({
  label, value, onChange, addLabel = "Add item", placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  addLabel?: string;
  placeholder?: string;
}) {
  const setAt = (i: number, v: string) => onChange(value.map((x, j) => (j === i ? v : x)));
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      <div className="mt-1 space-y-2">
        {value.map((row, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input value={row} placeholder={placeholder} onChange={(e) => setAt(i, e.target.value)} />
            <Button type="button" variant="outline" size="icon" aria-label="Move up"
              onClick={() => onChange(moveInArray(value, i, -1))} disabled={i === 0}>
              <ArrowUp className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" aria-label="Move down"
              onClick={() => onChange(moveInArray(value, i, 1))} disabled={i === value.length - 1}>
              <ArrowDown className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" aria-label="Remove"
              onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, ""])}>
          <Plus className="size-4" /> {addLabel}
        </Button>
      </div>
    </div>
  );
}
