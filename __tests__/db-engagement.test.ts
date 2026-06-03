import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db client
const mockExecute = vi.fn();
vi.mock("@libsql/client", () => ({
  createClient: () => ({ execute: mockExecute, executeMultiple: vi.fn() }),
}));

// Mock env vars before importing
process.env.TURSO_DATABASE_URL = "libsql://test.turso.io";
process.env.TURSO_AUTH_TOKEN = "test-token";

const { saveBrainstormMessage, createAction, toggleAction, updateIdeaBody } =
  await import("../app/actions");

describe("last_engaged_at update logic", () => {
  beforeEach(() => {
    mockExecute.mockReset();
    // Default: return empty rows for any query
    mockExecute.mockResolvedValue({ rows: [{ id: 1, idea_id: 1, role: "assistant", content: "x", created_at: "" }] });
  });

  it("saveBrainstormMessage updates last_engaged_at", async () => {
    await saveBrainstormMessage(1, "assistant", "some content");
    const calls = mockExecute.mock.calls.map((c: unknown[]) =>
      typeof c[0] === "string" ? c[0] : (c[0] as { sql: string }).sql
    );
    expect(calls.some((sql: string) => sql.includes("last_engaged_at"))).toBe(true);
  });

  it("createAction updates last_engaged_at", async () => {
    mockExecute.mockResolvedValue({ rows: [{ id: 1, idea_id: 1, text: "do it", completed: false, created_at: "", updated_at: "" }] });
    await createAction(1, "do it");
    const calls = mockExecute.mock.calls.map((c: unknown[]) =>
      typeof c[0] === "string" ? c[0] : (c[0] as { sql: string }).sql
    );
    expect(calls.some((sql: string) => sql.includes("last_engaged_at"))).toBe(true);
  });

  it("toggleAction updates last_engaged_at", async () => {
    await toggleAction(5, 1, true);
    const calls = mockExecute.mock.calls.map((c: unknown[]) =>
      typeof c[0] === "string" ? c[0] : (c[0] as { sql: string }).sql
    );
    expect(calls.some((sql: string) => sql.includes("last_engaged_at"))).toBe(true);
  });

  it("updateIdeaBody does NOT update last_engaged_at", async () => {
    await updateIdeaBody(1, "updated body text");
    const calls = mockExecute.mock.calls.map((c: unknown[]) =>
      typeof c[0] === "string" ? c[0] : (c[0] as { sql: string }).sql
    );
    expect(calls.some((sql: string) => sql.includes("last_engaged_at"))).toBe(false);
  });
});
