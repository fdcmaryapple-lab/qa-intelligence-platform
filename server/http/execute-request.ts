import { checkUrlAllowed } from "@/server/http/ssrf-guard";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BODY_CHARS = 100_000;

export interface HeaderPair {
  key: string;
  value: string;
}

export type ApiBodyType = "NONE" | "JSON" | "TEXT" | "FORM";
export type AssertionType = "STATUS_EQUALS" | "BODY_CONTAINS" | "JSON_PATH_EQUALS";
export type ExecutionResult = "PASS" | "FAIL" | "ERROR";

export interface ExecuteRequestInput {
  method: string;
  url: string;
  headers: HeaderPair[];
  queryParams: HeaderPair[];
  bodyType: ApiBodyType;
  body: string | null;
}

export interface AssertionInput {
  id: string;
  type: AssertionType;
  jsonPath: string | null;
  expected: string;
}

export interface AssertionOutcome {
  assertionId: string;
  type: AssertionType;
  passed: boolean;
  actual: string;
  expected: string;
}

export interface ExecuteRequestOutput {
  requestSnapshot: ExecuteRequestInput;
  responseStatus: number | null;
  responseHeaders: HeaderPair[] | null;
  responseBody: string | null;
  responseTruncated: boolean;
  durationMs: number | null;
  error: string | null;
  assertionResults: AssertionOutcome[];
  result: ExecutionResult;
}

function buildUrl(input: ExecuteRequestInput): string {
  const url = new URL(input.url);
  for (const { key, value } of input.queryParams) {
    if (key) url.searchParams.append(key, value);
  }
  return url.toString();
}

function resolveJsonPath(data: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, data);
}

function runAssertions(
  assertions: AssertionInput[],
  status: number,
  bodyText: string,
): AssertionOutcome[] {
  let parsedJson: unknown;
  let jsonParseFailed = false;

  return assertions.map((assertion) => {
    if (assertion.type === "STATUS_EQUALS") {
      const actual = String(status);
      return {
        assertionId: assertion.id,
        type: assertion.type,
        actual,
        expected: assertion.expected,
        passed: actual === assertion.expected,
      };
    }

    if (assertion.type === "BODY_CONTAINS") {
      const passed = bodyText.includes(assertion.expected);
      return {
        assertionId: assertion.id,
        type: assertion.type,
        actual: passed ? assertion.expected : "(not found in response body)",
        expected: assertion.expected,
        passed,
      };
    }

    if (parsedJson === undefined && !jsonParseFailed) {
      try {
        parsedJson = JSON.parse(bodyText);
      } catch {
        jsonParseFailed = true;
      }
    }

    if (jsonParseFailed) {
      return {
        assertionId: assertion.id,
        type: assertion.type,
        actual: "(response body is not valid JSON)",
        expected: assertion.expected,
        passed: false,
      };
    }

    const value = resolveJsonPath(parsedJson, assertion.jsonPath ?? "");
    const actual = value === undefined ? "(path not found)" : String(value);
    return {
      assertionId: assertion.id,
      type: assertion.type,
      actual,
      expected: assertion.expected,
      passed: actual === assertion.expected,
    };
  });
}

export async function executeApiRequest(
  input: ExecuteRequestInput,
  assertions: AssertionInput[],
): Promise<ExecuteRequestOutput> {
  const base: Pick<ExecuteRequestOutput, "requestSnapshot"> = { requestSnapshot: input };

  let targetUrl: string;
  try {
    targetUrl = buildUrl(input);
  } catch {
    return {
      ...base,
      responseStatus: null,
      responseHeaders: null,
      responseBody: null,
      responseTruncated: false,
      durationMs: null,
      error: "The request URL is not valid.",
      assertionResults: [],
      result: "ERROR",
    };
  }

  const ssrfCheck = checkUrlAllowed(targetUrl);
  if (!ssrfCheck.allowed) {
    return {
      ...base,
      responseStatus: null,
      responseHeaders: null,
      responseBody: null,
      responseTruncated: false,
      durationMs: null,
      error: ssrfCheck.reason ?? "This URL is not allowed.",
      assertionResults: [],
      result: "ERROR",
    };
  }

  const headers: Record<string, string> = {};
  for (const { key, value } of input.headers) {
    if (key) headers[key] = value;
  }
  if (input.bodyType === "JSON" && !Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) {
    headers["Content-Type"] = "application/json";
  }
  if (input.bodyType === "FORM" && !Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const hasBody = input.bodyType !== "NONE" && input.body;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: input.method,
      headers,
      body: hasBody ? input.body! : undefined,
      signal: controller.signal,
      redirect: "follow",
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return {
      ...base,
      responseStatus: null,
      responseHeaders: null,
      responseBody: null,
      responseTruncated: false,
      durationMs: Date.now() - startedAt,
      error: isTimeout
        ? `The request didn't complete within ${REQUEST_TIMEOUT_MS / 1000}s.`
        : `Couldn't complete the request: ${error instanceof Error ? error.message : "unknown error"}`,
      assertionResults: [],
      result: "ERROR",
    };
  } finally {
    clearTimeout(timeout);
  }

  const durationMs = Date.now() - startedAt;
  const responseHeaders: HeaderPair[] = [];
  response.headers.forEach((value, key) => responseHeaders.push({ key, value }));

  const fullBodyText = await response.text().catch(() => "");
  const responseTruncated = fullBodyText.length > MAX_RESPONSE_BODY_CHARS;
  const responseBody = responseTruncated
    ? fullBodyText.slice(0, MAX_RESPONSE_BODY_CHARS)
    : fullBodyText;

  const assertionResults = runAssertions(assertions, response.status, fullBodyText);
  const result: ExecutionResult =
    assertions.length === 0
      ? "PASS"
      : assertionResults.every((a) => a.passed)
        ? "PASS"
        : "FAIL";

  return {
    ...base,
    responseStatus: response.status,
    responseHeaders,
    responseBody,
    responseTruncated,
    durationMs,
    error: null,
    assertionResults,
    result,
  };
}
