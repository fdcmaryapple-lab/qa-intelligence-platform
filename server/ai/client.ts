import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

/**
 * Singleton Anthropic client. Server-only — this module (and everything
 * that imports it) must never end up in a client bundle, since it reads
 * ANTHROPIC_API_KEY. lib/env.ts already keeps that key out of clientEnv,
 * so the only way it leaks is importing this file from a "use client"
 * component directly, which nothing in this codebase does.
 */
let cachedClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return cachedClient;
}

/**
 * Centralized so every AI feature uses the same model without hunting
 * through call sites to bump it. Haiku is the deliberate choice here —
 * cost-effective and fast, appropriate for a structured, template-shaped
 * task like test case generation. Bump to a Sonnet-tier model if
 * generation quality genuinely needs it once there's real usage to judge
 * that against.
 */
export const AI_MODEL = "claude-haiku-4-5-20251001";

/** Anthropic's Messages API requires this explicitly — there's no default. */
export const AI_MAX_TOKENS = 4096;
