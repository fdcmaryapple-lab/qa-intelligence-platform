import { describe, it, expect } from "vitest";
import { validateScriptSyntax } from "@/server/automation/validate-script";

describe("validateScriptSyntax", () => {
  it("reports valid for well-formed TypeScript", () => {
    const code = `
import { test, expect } from '@playwright/test';

test('logs in', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});
`;
    const result = validateScriptSyntax(code);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports invalid for malformed syntax", () => {
    const code = `
test('broken', async ({ page }) => {
  await page.goto('https://example.com'
});
`;
    const result = validateScriptSyntax(code);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("includes a line number in the error message", () => {
    const code = `const x = ;`;
    const result = validateScriptSyntax(code);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/Line \d+/);
  });

  it("does not execute the code — a script with a throw still 'validates' without throwing", () => {
    const code = `
function boom() {
  throw new Error("this must never actually run during validation");
}
boom();
`;
    expect(() => validateScriptSyntax(code)).not.toThrow();
    expect(validateScriptSyntax(code).isValid).toBe(true);
  });
});
