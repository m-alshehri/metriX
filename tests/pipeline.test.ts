import { beforeEach, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({
  responses: [] as any[],
  calls: [] as any[],
  generate: vi.fn(),
}));
vi.mock("../lib/supabase-admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const response = mock.responses.shift();
      const calls: any[] = [];
      mock.calls.push({ table, calls });
      const q: any = new Proxy(
        {},
        {
          get: (_, key) =>
            key === "then"
              ? (resolve: any) => Promise.resolve(response).then(resolve)
              : (...args: any[]) => {
                  calls.push([key, ...args]);
                  return q;
                },
        },
      );
      return q;
    },
  }),
}));
vi.mock("../lib/ai", async () => ({
  ...(await vi.importActual("../lib/ai")),
  generate: mock.generate,
}));
import { executeStage } from "../lib/pipeline";
it("advances past a paused Bright Data account without issuing a network request", async () => {
  vi.stubEnv("BRIGHTDATA_API_TOKEN", "test-token");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const account = { id: "account", platform: "facebook", handle: "example" };
  mock.responses.push(
    { data: { id: "project" }, error: null },
    { data: account, error: null },
    { data: null, error: null },
    { data: null, error: null },
    { data: null, error: null },
    { data: null, error: null },
  );
  try {
    const result = await executeStage({
      ...job,
      mode: "collect",
      state: {
        stage: "collect",
        account: 0,
        accounts: [account],
        runId: "job",
      },
    });
    expect(result.state.account).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(mock.calls.some((x) => x.table === "brightdata_test_budget")).toBe(
      true,
    );
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
const job = {
  id: "job",
  project_id: "project",
  user_id: "owner",
  mode: "enrich",
  locale: "ar",
  state: { stage: "enrich", account: 0, runId: "job" },
};
beforeEach(() => {
  mock.responses = [];
  mock.calls = [];
  mock.generate.mockReset();
});
it("stops before provider or AI calls when project ownership is lost", async () => {
  mock.responses.push({ data: null, error: null });
  await expect(executeStage(job)).rejects.toThrow("Project not found");
  expect(mock.generate).not.toHaveBeenCalled();
  expect(mock.calls).toHaveLength(1);
});
it("does not write any enrichment when AI returns a foreign mention ID", async () => {
  mock.responses.push(
    { data: { id: "project" }, error: null },
    { data: [{ id: "mention", content: "hello" }], error: null },
  );
  mock.generate.mockResolvedValue({
    items: [
      {
        id: "foreign",
        sentiment: "positive",
        confidence: 1,
        emotion: "joy",
        topics: [],
      },
    ],
  });
  await expect(executeStage(job)).rejects.toThrow("Invalid enrichment");
  expect(mock.calls.map((x) => x.table)).toEqual(["projects", "mentions"]);
});
it("propagates database read errors rather than marking a stage successful", async () => {
  mock.responses.push(
    { data: { id: "project" }, error: null },
    { data: null, error: { message: "database unavailable" } },
  );
  await expect(executeStage(job)).rejects.toThrow("database unavailable");
  expect(mock.generate).not.toHaveBeenCalled();
});
