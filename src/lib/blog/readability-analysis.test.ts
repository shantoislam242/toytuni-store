import { describe, it, expect } from "vitest";
import { analyzeReadability } from "./readability-analysis";

describe("analyzeReadability", () => {
  it("rates simple short prose as readable", () => {
    const r = analyzeReadability("## Play ideas\n\nBabies love to play. Toys help them grow. However, keep it simple. Also, rotate toys often to keep it fresh.");
    expect(["good", "ok"]).toContain(r.rating);
    expect(r.checks.find((c) => c.id === "long-sentences")?.status).toBe("good");
  });
  it("flags long sentences", () => {
    const long = "This is a very long sentence that keeps going and going with many many words strung together well beyond twenty words to be sure it trips the long sentence check clearly. ".repeat(3);
    expect(analyzeReadability(long).checks.find((c) => c.id === "long-sentences")?.status).not.toBe("good");
  });
  it("detects passive voice", () => {
    const passive = "The toy was made by hand. The wood was sourced locally. The parts were sanded carefully. The set was tested thoroughly.";
    expect(analyzeReadability(passive).checks.find((c) => c.id === "passive")?.status).not.toBe("good");
  });
  it("never throws on empty", () => expect(() => analyzeReadability("")).not.toThrow());
});
