import Anthropic from "@anthropic-ai/sdk";
import { getOrCompute, hashKey } from "./cache";

/**
 * One wrapper for every model call in the challenge.
 *
 * Model choice is a decision already made, not a per-build guess:
 *   scoring / extraction / clustering  -> haiku   ($1 / $5 per MTok)
 *   the prose IS the product           -> sonnet  ($2 / $10 per MTok)
 * Nothing in this bank needs Opus. At a 25% submit rate a 10k-visitor day is
 * about $19 on haiku and $38 on sonnet; a pathological 100% is $75 / $150.
 *
 * Caching is automatic: the input hash is the cache key, so URL-input tools
 * dedupe for free because everyone pastes the same famous pages.
 */
export const MODELS = {
  cheap: "claude-haiku-4-5",   // scoring, extraction, clustering, routing
  prose: "claude-sonnet-5",    // 04a, 04b, 12, 23 - where the writing is the product
} as const;

export type Job = keyof typeof MODELS;

/** Dollars per million tokens, from the published price list. */
const RATES: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5": { in: 1, out: 5 },
  "claude-sonnet-5": { in: 2, out: 10 },
};

let _client: Anthropic | null = null;
function client() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic();
  }
  return _client;
}

export class InputTooLarge extends Error {
  constructor(public got: number, public max: number) {
    super(`Input is ${got.toLocaleString()} characters; the cap is ${max.toLocaleString()}.`);
    this.name = "InputTooLarge";
  }
}

export type CompleteOpts = {
  job?: Job;
  system?: string;
  maxTokens?: number;
  /** Hard input ceiling. Throws rather than silently truncating - a truncated
   *  policy or pricing page produces a confident wrong answer. */
  maxInputChars?: number;
  /** How hard the model thinks. Thinking tokens are billed as output and are
   *  most of the bill on the prose path, so this is the first cost lever -
   *  ahead of changing model, which costs quality. Measure before lowering. */
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  /** Cache TTL in seconds. 0 disables caching (rare - prefer a short TTL). */
  ttl?: number;
  cachePrefix?: string;
};

export async function complete(prompt: string, opts: CompleteOpts = {}): Promise<string> {
  const {
    job = "cheap",
    system,
    effort,
    maxTokens = 1600,
    maxInputChars = 60_000,
    ttl = 86_400,
    cachePrefix = job,
  } = opts;

  if (prompt.length > maxInputChars) throw new InputTooLarge(prompt.length, maxInputChars);

  const run = async () => {
    const res = await client().messages.create({
      model: MODELS[job],
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      // No temperature: it is removed on Sonnet 5 and returns a 400.
      // No thinking on the cheap path; adaptive on the prose path.
      ...(job === "prose" ? { thinking: { type: "adaptive" as const } } : {}),
      ...(effort ? { output_config: { effort } } : {}),
      messages: [{ role: "user" as const, content: prompt }],
    });
    /* What the call cost, in the server log, every time.
     *
     * Without this line the only honest answer to "what does this cost to
     * run" is a measurement taken by hand on a laptop. Thinking is billed as
     * output and is most of the bill, so it is broken out separately. */
    const u = res.usage;
    const rate = RATES[MODELS[job]];
    const cost = (u.input_tokens / 1e6) * rate.in + (u.output_tokens / 1e6) * rate.out;
    const thinking = (u as { output_tokens_details?: { thinking_tokens?: number } })
      .output_tokens_details?.thinking_tokens;
    console.log(
      `[llm] ${MODELS[job]}${effort ? ` effort=${effort}` : ""} in=${u.input_tokens} ` +
        `out=${u.output_tokens}${thinking === undefined ? "" : ` think=${thinking}`} ` +
        `cost=$${cost.toFixed(4)}`,
    );

    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  };

  if (!ttl) return run();
  const key = await hashKey(`${cachePrefix}:${MODELS[job]}`, (system ?? "") + " " + prompt);
  return getOrCompute(key, ttl, run);
}

/**
 * Batch API - use for EVERYTHING on a cron. 50% off, and it stacks with
 * caching. Latency is irrelevant when nobody is waiting.
 * Results come back in ANY order: key by custom_id, never by position.
 */
export async function batchSubmit(
  items: { id: string; prompt: string }[],
  opts: { job?: Job; system?: string; maxTokens?: number } = {},
) {
  const { job = "cheap", system, maxTokens = 1600 } = opts;
  const batch = await client().messages.batches.create({
    requests: items.map((it) => ({
      custom_id: it.id,
      params: {
        model: MODELS[job],
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: [{ role: "user" as const, content: it.prompt }],
      },
    })),
  });
  return batch.id;
}

export async function batchCollect(batchId: string): Promise<Record<string, string> | null> {
  const c = client();
  const b = await c.messages.batches.retrieve(batchId);
  if (b.processing_status !== "ended") return null;
  const out: Record<string, string> = {};
  for await (const r of await c.messages.batches.results(batchId)) {
    if (r.result.type !== "succeeded") continue;
    out[r.custom_id] = r.result.message.content
      .filter((x): x is Anthropic.TextBlock => x.type === "text")
      .map((x) => x.text)
      .join("")
      .trim();
  }
  return out;
}
