import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";

/**
 * Runs a saved AutomationScript for real, via `npx playwright test`, as
 * a plain child process on this machine — using this project's own
 * playwright.config.ts and whatever browsers are locally installed.
 *
 * This is genuine, unsandboxed code execution. It is appropriate ONLY
 * because this is a single-user local dev tool: the person clicking
 * "Run" and the person who authored the script (themselves, or AI
 * acting on their explicit request) are the same trust boundary, and
 * the script runs with that person's own local permissions — nothing
 * more, nothing less. This function must never be reused in a context
 * where the script's author and the person triggering execution could
 * be different people, or where more than one user's data could be on
 * the same machine. That would need real isolation first — a fresh
 * container per run, no network beyond the target app, hard CPU/memory
 * limits — none of which exists here.
 *
 * Requires the target app to already be reachable at the URL configured
 * in playwright.config.ts's baseURL (typically because `npm run dev` is
 * already running) — otherwise Playwright's own webServer fallback may
 * try to build+start it, which can exceed EXECUTION_TIMEOUT_MS and
 * surface as a spurious "timed out" ERROR rather than a real script
 * failure.
 */

const RUNS_DIR = path.join(process.cwd(), "e2e", ".generated-runs");
const EXECUTION_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_CHARS = 20_000;

export interface ScriptExecutionResult {
  status: "PASS" | "FAIL" | "ERROR";
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

function truncate(text: string): string {
  return text.length > MAX_OUTPUT_CHARS
    ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n... [truncated]`
    : text;
}

export async function executeAutomationScript(code: string): Promise<ScriptExecutionResult> {
  const fileName = `${randomUUID()}.spec.ts`;
  const filePath = path.join(RUNS_DIR, fileName);
  const startedAt = Date.now();

  await mkdir(RUNS_DIR, { recursive: true });
  await writeFile(filePath, code, "utf8");

  try {
    const { exitCode, stdout, stderr, timedOut } = await runPlaywright(filePath);
    const durationMs = Date.now() - startedAt;

    if (timedOut) {
      return {
        status: "ERROR",
        exitCode: null,
        stdout: truncate(stdout),
        stderr: truncate(
          `${stderr}\n\nTimed out after ${EXECUTION_TIMEOUT_MS / 1000}s. If the app wasn't already running at the configured baseURL, Playwright may have been waiting on its own build+start fallback rather than the script itself.`,
        ),
        durationMs,
      };
    }

    return {
      status: exitCode === 0 ? "PASS" : "FAIL",
      exitCode,
      stdout: truncate(stdout),
      stderr: truncate(stderr),
      durationMs,
    };
  } catch (error) {
    return {
      status: "ERROR",
      exitCode: null,
      stdout: "",
      stderr: error instanceof Error ? error.message : "Unknown execution error.",
      durationMs: Date.now() - startedAt,
    };
  } finally {
    await rm(filePath, { force: true });
  }
}

function runPlaywright(filePath: string): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}> {
  return new Promise((resolve) => {
    const relativePath = path.relative(process.cwd(), filePath);
    const child = spawn(
      "npx",
      ["playwright", "test", relativePath, "--project=chromium", "--reporter=line"],
      { cwd: process.cwd(), env: process.env },
    );

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, EXECUTION_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ exitCode: code, stdout, stderr, timedOut });
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      stderr += `\n${err.message}`;
      resolve({ exitCode: null, stdout, stderr, timedOut: false });
    });
  });
}
