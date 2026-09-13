import { NextResponse } from "next/server";
import { sweepExpired } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron entry point, wired in vercel.json.
 *
 * This site has exactly one job and no pipeline: answers expire after a week,
 * and the rows have to be deleted or the table grows for ever. There is
 * nothing to precompute here, because the input is a stranger's sentence.
 */
const JOBS: Record<string, () => Promise<unknown>> = {
  sweep: async () => ({ swept: await sweepExpired() }),
};

export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job } = await params;
  const fn = JOBS[job];
  if (!fn) return NextResponse.json({ error: `Unknown job "${job}"` }, { status: 404 });

  const started = Date.now();
  try {
    const result = await fn();
    return NextResponse.json({ ok: true, job, ms: Date.now() - started, result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, job, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
