import { describe, it, expect } from "vitest";
import { safeNext, safePublicUrl, escapeHtml } from "../lib/security";
import { comparePeriods, percentChange } from "../lib/analytics";
describe("redirect boundaries", () => {
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/ar/\\evil.test",
    "javascript:alert(1)",
    "/api/cron",
    "/en\n/foo",
  ])("rejects %s", (value) => expect(safeNext(value)).toBe("/en/dashboard"));
  it("preserves internal destinations", () =>
    expect(safeNext("/ar/reset-password?x=1")).toBe("/ar/reset-password?x=1"));
  it("blocks unsafe content links and escapes email HTML", () => {
    expect(safePublicUrl("javascript:alert(1)")).toBeNull();
    expect(escapeHtml('<img src="x">')).toBe("&lt;img src=&quot;x&quot;&gt;");
  });
});
describe("calendar periods", () => {
  it("excludes today and keeps missing dates at zero", () => {
    const r = comparePeriods(
      [
        {
          metric_date: "2026-09-20",
          mentions: 3,
          engagement: 1,
          views: 2,
          negative: 0,
        },
        {
          metric_date: "2026-09-21",
          mentions: 100,
          engagement: 0,
          views: 0,
          negative: 0,
        },
        {
          metric_date: "2026-09-10",
          mentions: 2,
          engagement: 0,
          views: 0,
          negative: 0,
        },
      ],
      7,
      new Date("2026-09-21T12:00:00Z"),
    );
    expect(r.current.mentions).toBe(3);
    expect(r.previous.mentions).toBe(2);
    expect(percentChange(3, 0)).toBeNull();
  });
});
