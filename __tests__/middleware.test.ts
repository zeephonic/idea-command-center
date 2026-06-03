import { describe, it, expect, vi, beforeEach } from "vitest";

// Minimal NextRequest/NextResponse mock matching the middleware's usage
function makeRequest(path: string, cookieValue?: string) {
  return {
    nextUrl: { pathname: path },
    url: `http://localhost${path}`,
    cookies: {
      get: (name: string) =>
        name === "auth" && cookieValue !== undefined
          ? { value: cookieValue }
          : undefined,
    },
  } as never;
}

const redirected: string[] = [];
const nexted: boolean[] = [];

vi.mock("next/server", () => {
  return {
    NextResponse: {
      next: () => {
        nexted.push(true);
        return { type: "next" };
      },
      redirect: (url: URL) => {
        redirected.push(url.pathname);
        return { type: "redirect", url };
      },
    },
  };
});

// Import AFTER mock is set up
const { middleware } = await import("../middleware");

describe("middleware auth", () => {
  beforeEach(() => {
    redirected.length = 0;
    nexted.length = 0;
    process.env.ADMIN_PASSWORD = "secret123";
  });

  it("passes through /login without auth check", () => {
    middleware(makeRequest("/login"));
    expect(nexted).toHaveLength(1);
    expect(redirected).toHaveLength(0);
  });

  it("passes through /_next/ paths", () => {
    middleware(makeRequest("/_next/static/chunk.js"));
    expect(nexted).toHaveLength(1);
  });

  it("passes through /api/cron/ paths", () => {
    middleware(makeRequest("/api/cron/briefing"));
    expect(nexted).toHaveLength(1);
  });

  it("passes through when cookie matches ADMIN_PASSWORD", () => {
    middleware(makeRequest("/", "secret123"));
    expect(nexted).toHaveLength(1);
    expect(redirected).toHaveLength(0);
  });

  it("redirects to /login when cookie is absent", () => {
    middleware(makeRequest("/"));
    expect(redirected).toContain("/login");
  });

  it("redirects to /login when cookie has wrong value", () => {
    middleware(makeRequest("/", "wrongpassword"));
    expect(redirected).toContain("/login");
  });
});
