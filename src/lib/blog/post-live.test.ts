import { describe, it, expect } from "vitest";
import { isPostLive, postStatus } from "./post-live";

const NOW = new Date("2026-07-19T12:00:00Z");
describe("isPostLive / postStatus", () => {
  it("published → live/published", () => {
    expect(isPostLive({ published: true, scheduledAt: null, now: NOW })).toBe(true);
    expect(postStatus({ published: true, scheduledAt: null, now: NOW })).toBe("published");
  });
  it("future schedule → not live / scheduled", () => {
    expect(isPostLive({ published: false, scheduledAt: "2026-08-01T00:00:00Z", now: NOW })).toBe(false);
    expect(postStatus({ published: false, scheduledAt: "2026-08-01T00:00:00Z", now: NOW })).toBe("scheduled");
  });
  it("past schedule → live / published", () => {
    expect(isPostLive({ published: false, scheduledAt: "2026-07-01T00:00:00Z", now: NOW })).toBe(true);
    expect(postStatus({ published: false, scheduledAt: "2026-07-01T00:00:00Z", now: NOW })).toBe("published");
  });
  it("no schedule, not published → draft/not-live", () => {
    expect(isPostLive({ published: false, scheduledAt: null, now: NOW })).toBe(false);
    expect(postStatus({ published: false, scheduledAt: null, now: NOW })).toBe("draft");
  });
});
