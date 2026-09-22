import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ reserve: vi.fn() }));
vi.mock("../lib/brightdata-budget", () => ({
  reserveBrightDataTest: mocks.reserve,
}));
import {
  collectFacebook,
  collectLinkedIn,
  collectGoogleMapsReviews,
  resumeBrightDataSnapshot,
} from "../lib/brightdata";
beforeEach(() => {
  vi.stubEnv("BRIGHTDATA_API_TOKEN", "test-token");
  mocks.reserve.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it.each([
  ["facebook", () => collectFacebook("example", "account")],
  [
    "linkedin",
    () =>
      collectLinkedIn("https://www.linkedin.com/company/example/", "account"),
  ],
  [
    "google_maps",
    () =>
      collectGoogleMapsReviews(
        "https://www.google.com/maps/place/example",
        "account",
      ),
  ],
] as const)(
  "limits %s at the provider to one record and one input",
  async (platform, run) => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ snapshot_id: "snapshot" }), {
        status: 202,
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(run()).rejects.toMatchObject({ snapshotId: "snapshot" });
    expect(mocks.reserve).toHaveBeenCalledWith(platform, "account");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [address, options] = fetcher.mock.calls[0];
    const url = new URL(address);
    expect(url.pathname).toBe("/datasets/v3/trigger");
    expect(url.searchParams.get("limit_per_input")).toBe("1");
    expect(url.searchParams.get("limit_multiple_results")).toBe("1");
    const body = JSON.parse(options.body);
    expect(body.limit_per_input).toBe(1);
    expect(body.input).toHaveLength(1);
    if (platform === "facebook") expect(body.input[0].num_of_posts).toBe(1);
    if (platform === "linkedin") {
      expect(url.searchParams.get("type")).toBe("discover_new");
      expect(url.searchParams.get("discover_by")).toBe("company_url");
    }
  },
);
it("makes no network request if the budget is paused or the database is unavailable", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  mocks.reserve.mockRejectedValue(new Error("paused"));
  await expect(collectFacebook("example", "account")).rejects.toThrow("paused");
  expect(fetcher).not.toHaveBeenCalled();
});
it("does not retry a paid submission when its response is lost", async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error("timeout"));
  vi.stubGlobal("fetch", fetcher);
  await expect(collectFacebook("example", "account")).rejects.toThrow(
    "timeout",
  );
  mocks.reserve.mockRejectedValue(new Error("already consumed"));
  await expect(collectFacebook("example", "account")).rejects.toThrow(
    "already consumed",
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("polls existing snapshots without starting another collection or spending a slot", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ status: "running" })));
  vi.stubGlobal("fetch", fetcher);
  await expect(
    resumeBrightDataSnapshot("existing", "facebook", "example"),
  ).rejects.toMatchObject({ snapshotId: "existing" });
  expect(mocks.reserve).not.toHaveBeenCalled();
  expect(fetcher.mock.calls[0][0]).toContain("/progress/existing");
});
