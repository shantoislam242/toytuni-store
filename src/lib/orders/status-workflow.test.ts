import { describe, it, expect } from "vitest";
import {
  canTransition, allowedTransitions, timestampFieldFor, isOrderStatus, ORDER_STATUSES,
} from "./status-workflow";

describe("status-workflow", () => {
  it("lists the five statuses", () => {
    expect(ORDER_STATUSES).toEqual(["pending","confirmed","shipped","delivered","cancelled"]);
  });
  it("allows legal transitions", () => {
    expect(canTransition("pending","confirmed")).toBe(true);
    expect(canTransition("pending","cancelled")).toBe(true);
    expect(canTransition("confirmed","shipped")).toBe(true);
    expect(canTransition("confirmed","cancelled")).toBe(true);
    expect(canTransition("shipped","delivered")).toBe(true);
  });
  it("rejects illegal transitions", () => {
    expect(canTransition("pending","shipped")).toBe(false);
    expect(canTransition("delivered","pending")).toBe(false);
    expect(canTransition("shipped","cancelled")).toBe(false);
    expect(canTransition("cancelled","pending")).toBe(false);
    expect(canTransition("delivered","cancelled")).toBe(false);
    expect(canTransition("confirmed","confirmed")).toBe(false);
  });
  it("returns allowed transitions per status", () => {
    expect(allowedTransitions("pending")).toEqual(["confirmed","cancelled"]);
    expect(allowedTransitions("confirmed")).toEqual(["shipped","cancelled"]);
    expect(allowedTransitions("shipped")).toEqual(["delivered"]);
    expect(allowedTransitions("delivered")).toEqual([]);
    expect(allowedTransitions("cancelled")).toEqual([]);
  });
  it("maps a status to its timestamp column", () => {
    expect(timestampFieldFor("confirmed")).toBe("confirmed_at");
    expect(timestampFieldFor("shipped")).toBe("shipped_at");
    expect(timestampFieldFor("delivered")).toBe("delivered_at");
    expect(timestampFieldFor("cancelled")).toBe("cancelled_at");
    expect(timestampFieldFor("pending")).toBeNull();
  });
  it("guards status strings", () => {
    expect(isOrderStatus("shipped")).toBe(true);
    expect(isOrderStatus("nope")).toBe(false);
  });
});
