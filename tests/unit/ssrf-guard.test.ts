import { describe, it, expect } from "vitest";
import { checkUrlAllowed } from "@/server/http/ssrf-guard";

describe("checkUrlAllowed", () => {
  it("allows a normal https URL", () => {
    expect(checkUrlAllowed("https://api.example.com/users/1").allowed).toBe(true);
  });

  it("allows a normal http URL", () => {
    expect(checkUrlAllowed("http://api.example.com/health").allowed).toBe(true);
  });

  it("deliberately allows localhost — testing local APIs is the point of this feature", () => {
    expect(checkUrlAllowed("http://localhost:3000/api/health").allowed).toBe(true);
  });

  it("deliberately allows private IP ranges for the same reason", () => {
    expect(checkUrlAllowed("http://192.168.1.50:8080/status").allowed).toBe(true);
    expect(checkUrlAllowed("http://10.0.0.5/api").allowed).toBe(true);
  });

  it("blocks the well-known cloud metadata IP", () => {
    const result = checkUrlAllowed("http://169.254.169.254/latest/meta-data/");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/metadata/i);
  });

  it("blocks the entire link-local range, not just the exact metadata IP", () => {
    expect(checkUrlAllowed("http://169.254.1.1/").allowed).toBe(false);
  });

  it("blocks GCP's metadata hostname", () => {
    expect(checkUrlAllowed("http://metadata.google.internal/computeMetadata/v1/").allowed).toBe(
      false,
    );
  });

  it("blocks non-http(s) schemes", () => {
    const result = checkUrlAllowed("file:///etc/passwd");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/http/i);
  });

  it("rejects an unparseable URL", () => {
    expect(checkUrlAllowed("not a url at all").allowed).toBe(false);
  });
});
