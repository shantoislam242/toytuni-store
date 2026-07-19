import { describe, it, expect } from "vitest";
import { scoreChecks, type Check } from "./analysis";

const c = (status: Check["status"]): Check => ({ id: "x", status, text: "" });

describe("scoreChecks", () => {
  it("all good → 100/good", () => expect(scoreChecks([c("good"), c("good")])).toEqual({ score: 100, rating: "good" }));
  it("all bad → 0/bad", () => expect(scoreChecks([c("bad"), c("bad")])).toEqual({ score: 0, rating: "bad" }));
  it("empty → 0/bad", () => expect(scoreChecks([])).toEqual({ score: 0, rating: "bad" }));
  it("weights ok as half; buckets by threshold", () => {
    expect(scoreChecks([c("good"), c("ok"), c("bad"), c("good")])).toEqual({ score: 63, rating: "ok" }); // (1+.5+0+1)/4=.625→63
  });
});
