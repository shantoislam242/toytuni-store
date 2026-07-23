import { describe, it, expect } from "vitest";
import { processBlogHtml, stripHtml } from "./process-html";
import { sanitizeBlogHtml } from "./sanitize";

describe("stripHtml", () => {
  it("drops tags, decodes entities, collapses whitespace", () => {
    expect(stripHtml("<p>Hello <strong>world</strong> &amp; more</p>")).toBe("Hello world & more");
    expect(stripHtml("<h2>A   B</h2>\n<p>c</p>")).toBe("A B c");
  });
});

describe("processBlogHtml", () => {
  it("injects slug ids into h2/h3 and builds the TOC", () => {
    const { html, toc } = processBlogHtml("<h2>Getting Started</h2><p>x</p><h3>Step One</h3>");
    expect(html).toContain('<h2 id="getting-started">Getting Started</h2>');
    expect(html).toContain('<h3 id="step-one">Step One</h3>');
    expect(toc).toEqual([
      { id: "getting-started", text: "Getting Started", level: 2 },
      { id: "step-one", text: "Step One", level: 3 },
    ]);
  });

  it("strips nested marks from the slug + label", () => {
    const { toc, html } = processBlogHtml('<h2>Why <strong>Neem</strong> Wood</h2>');
    expect(toc[0]).toEqual({ id: "why-neem-wood", text: "Why Neem Wood", level: 2 });
    expect(html).toContain('id="why-neem-wood"');
    expect(html).toContain("<strong>Neem</strong>"); // inner markup preserved
  });

  it("dedupes repeated heading slugs", () => {
    const { toc } = processBlogHtml("<h2>Tips</h2><h2>Tips</h2><h2>Tips</h2>");
    expect(toc.map((t) => t.id)).toEqual(["tips", "tips-1", "tips-2"]);
  });

  it("replaces any existing id and preserves other heading attrs", () => {
    const { html } = processBlogHtml('<h2 id="old" style="text-align:center">Hi</h2>');
    expect(html).toContain('style="text-align:center"');
    expect(html).toContain('id="hi"');
    expect(html).not.toContain('id="old"');
  });

  it("no headings → empty toc, html unchanged", () => {
    expect(processBlogHtml("<p>Just text</p>")).toEqual({ html: "<p>Just text</p>", toc: [] });
  });
});

describe("sanitizeBlogHtml", () => {
  it("drops script/iframe and event handlers", () => {
    expect(sanitizeBlogHtml('<p onclick="steal()">hi</p><script>evil()</script>'))
      .toBe("<p>hi</p>");
    expect(sanitizeBlogHtml('<img src="x" onerror="alert(1)">')).not.toContain("onerror");
  });

  it("blocks javascript: hrefs but keeps http links (nofollow, new tab)", () => {
    expect(sanitizeBlogHtml('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
    const clean = sanitizeBlogHtml('<a href="https://toytuni.com">shop</a>');
    expect(clean).toContain('href="https://toytuni.com"');
    expect(clean).toContain('rel="noopener noreferrer nofollow"');
    expect(clean).toContain('target="_blank"');
  });

  it("keeps allowed inline styles, strips disallowed ones", () => {
    const clean = sanitizeBlogHtml(
      '<span style="color:#ff0000;font-size:20px;position:fixed">x</span>',
    );
    expect(clean).toContain("color:#ff0000");
    expect(clean).toContain("font-size:20px");
    expect(clean).not.toContain("position");
  });

  it("keeps highlight + alignment", () => {
    expect(sanitizeBlogHtml('<mark style="background-color:#fef08a">hi</mark>')).toContain("background-color:#fef08a");
    expect(sanitizeBlogHtml('<p style="text-align:center">c</p>')).toContain("text-align:center");
  });
});
