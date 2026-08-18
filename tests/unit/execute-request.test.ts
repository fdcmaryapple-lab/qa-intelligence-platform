import { describe, it, expect, vi, afterEach } from "vitest";
import { executeApiRequest } from "@/server/http/execute-request";

const originalFetch = global.fetch;

describe("executeApiRequest", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns PASS with no assertions when the request completes", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("ok body", { status: 200, headers: { "content-type": "text/plain" } }),
    );

    const result = await executeApiRequest(
      {
        method: "GET",
        url: "https://api.example.com/health",
        headers: [],
        queryParams: [],
        bodyType: "NONE",
        body: null,
      },
      [],
    );

    expect(result.result).toBe("PASS");
    expect(result.responseStatus).toBe(200);
    expect(result.error).toBeNull();
  });

  it("returns FAIL when a STATUS_EQUALS assertion doesn't match", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("error", { status: 500 }));

    const result = await executeApiRequest(
      {
        method: "GET",
        url: "https://api.example.com/health",
        headers: [],
        queryParams: [],
        bodyType: "NONE",
        body: null,
      },
      [{ id: "a1", type: "STATUS_EQUALS", jsonPath: null, expected: "200" }],
    );

    expect(result.result).toBe("FAIL");
    expect(result.assertionResults).toHaveLength(1);
    expect(result.assertionResults[0]!.passed).toBe(false);
  });

  it("returns PASS when a JSON_PATH_EQUALS assertion matches", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "42" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await executeApiRequest(
      {
        method: "GET",
        url: "https://api.example.com/users/42",
        headers: [],
        queryParams: [],
        bodyType: "NONE",
        body: null,
      },
      [{ id: "a1", type: "JSON_PATH_EQUALS", jsonPath: "data.id", expected: "42" }],
    );

    expect(result.result).toBe("PASS");
    expect(result.assertionResults[0]!.passed).toBe(true);
  });

  it("returns ERROR without calling fetch when the URL is blocked by the SSRF guard", async () => {
    global.fetch = vi.fn();

    const result = await executeApiRequest(
      {
        method: "GET",
        url: "http://169.254.169.254/latest/meta-data/",
        headers: [],
        queryParams: [],
        bodyType: "NONE",
        body: null,
      },
      [],
    );

    expect(result.result).toBe("ERROR");
    expect(result.error).toMatch(/metadata/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns ERROR when the network request itself fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("connection refused"));

    const result = await executeApiRequest(
      {
        method: "GET",
        url: "https://unreachable.example.com/",
        headers: [],
        queryParams: [],
        bodyType: "NONE",
        body: null,
      },
      [],
    );

    expect(result.result).toBe("ERROR");
    expect(result.error).toMatch(/couldn't complete/i);
  });
});
