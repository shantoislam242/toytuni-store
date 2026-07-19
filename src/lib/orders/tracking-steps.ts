export type TrackStep = {
  key: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";
  label: string;
  state: "done" | "active" | "todo";
};

const FLOW: { key: TrackStep["key"]; label: string; status: string }[] = [
  { key: "placed", label: "Placed", status: "pending" },
  { key: "confirmed", label: "Confirmed", status: "confirmed" },
  { key: "shipped", label: "Shipped", status: "shipped" },
  { key: "delivered", label: "Delivered", status: "delivered" },
];

export function buildTrackingSteps(status: string, historyStatuses: string[]): TrackStep[] {
  if (status === "cancelled") {
    return [
      { key: "placed", label: "Placed", state: "done" },
      { key: "cancelled", label: "Cancelled", state: "done" },
    ];
  }
  const reached = new Set(historyStatuses);
  reached.add("pending"); // every order was placed
  const currentIdx = FLOW.findIndex((f) => f.status === status);
  return FLOW.map((f, i) => ({
    key: f.key,
    label: f.label,
    state: i < currentIdx ? "done" : i === currentIdx ? (currentIdx === FLOW.length - 1 ? "done" : "active") : reached.has(f.status) ? "done" : "todo",
  }));
}
