import { NextResponse } from "next/server";
import { getOrCompute, hashKey, peek } from "@/lib/cache";
import { checkGate, looksLikeBot } from "@/lib/ratelimit";
import { InputTooLarge } from "@/lib/llm";
import { killIdea, NotAnIdea, type Kill } from "@/lib/kill";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIN = 25;
const MAX = 4000;
const TTL = 7 * 86_400;

export async function POST(req: Request) {
  let body: { idea?: string; trap?: string; startedAt?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }

  const idea = (body.idea ?? "").trim().replace(/\s+/g, " ");

  if (idea.length < MIN)
    return NextResponse.json(
      { error: `Say a little more — ${MIN} characters at least. What is it, and who is it for?` },
      { status: 400 },
    );
  if (idea.length > MAX)
    return NextResponse.json(
      { error: `That is ${idea.length.toLocaleString()} characters. The cap is ${MAX.toLocaleString()}.` },
      { status: 400 },
    );

  /* Honeypot plus a minimum time on the form. No captcha, no third party. */
  if (looksLikeBot({ trap: body.trap, startedAt: body.startedAt }))
    return NextResponse.json({ error: "That looked automated." }, { status: 400 });

  const key = await hashKey("kill", idea);

  /* Asked before? Serve it and charge nobody. The gate exists to stop the bill
     running away, and a cache hit does not cost anything to answer. */
  const hit = await peek<Kill>(key);
  if (hit) return NextResponse.json({ ...hit, cached: true });

  const gate = await checkGate(req);
  if (!gate.ok) {
    return NextResponse.json(
      gate.reason === "ip"
        ? {
            error: `That is ${gate.limit} ideas today from this connection. The limit resets at midnight UTC.`,
            reason: "ip",
          }
        : {
            error:
              "Today's budget for new answers is spent. Ideas asked before still return instantly — come back tomorrow for a new one.",
            reason: "ceiling",
          },
      { status: 429 },
    );
  }

  try {
    const result = await getOrCompute<Kill>(key, TTL, () => killIdea(idea));
    return NextResponse.json({ ...result, cached: false });
  } catch (err) {
    if (err instanceof NotAnIdea) return NextResponse.json({ error: err.message, reason: "not-an-idea" }, { status: 422 });
    if (err instanceof InputTooLarge) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("kill failed:", err);
    return NextResponse.json(
      { error: "That did not come back in a usable shape. Try again, or describe the idea a little differently." },
      { status: 502 },
    );
  }
}
