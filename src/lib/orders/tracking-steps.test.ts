import { describe, it, expect } from "vitest";
import { buildTrackingSteps } from "./tracking-steps";

describe("buildTrackingSteps", () => {
  it("marks placed active for a fresh pending order", () => {
    const s = buildTrackingSteps("pending", ["pending"]);
    expect(s.map((x) => x.key)).toEqual(["placed", "confirmed", "shipped", "delivered"]);
    expect(s[0].state).toBe("active");
    expect(s[1].state).toBe("todo");
  });
  it("marks progress through shipped", () => {
    const s = buildTrackingSteps("shipped", ["pending", "confirmed", "shipped"]);
    expect(s[0].state).toBe("done");
    expect(s[1].state).toBe("done");
    expect(s[2].state).toBe("active");
    expect(s[3].state).toBe("todo");
  });
  it("marks delivered all done", () => {
    const s = buildTrackingSteps("delivered", ["pending", "confirmed", "shipped", "delivered"]);
    expect(s.every((x) => x.state === "done")).toBe(true);
  });
  it("returns a single cancelled terminal step for a cancelled order", () => {
    const s = buildTrackingSteps("cancelled", ["pending", "cancelled"]);
    expect(s.map((x) => x.key)).toEqual(["placed", "cancelled"]);
    expect(s[1].state).toBe("done");
  });
});
