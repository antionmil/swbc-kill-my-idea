import { NextResponse } from "next/server";
import { and, gt, gte, sql } from "drizzle-orm";
import { db, hasDb, schema } from "@/lib/db";

export const runtime = "nodejs";

const LIVE_SECONDS = 75; // a little over the 45s heartbeat, so one missed beat is not a departure

const day = (offset = 0) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

export type Counts = { now: number; week: number; all: number };

/* The week and all-time figures barely move between one heartbeat and the
   next, and every visitor beats every 45 seconds. Holding them for ten
   seconds per instance turns a crowd into a trickle of queries. */
let memo: { at: number; week: number; all: number } | null = null;

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ now: 1, week: 0, all: 0 } satisfies Counts);

  let body: { sid?: string; first?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }

  /* The id is generated in the browser's memory and never stored there. It is
     accepted only if it looks like what the page makes, so the table cannot be
     filled with arbitrary strings. */
  const sid = (body.sid ?? "").trim();
  if (!/^[a-z0-9]{8,24}$/.test(sid)) return NextResponse.json({ error: "Bad id." }, { status: 400 });

  const d = db();

  await d
    .insert(schema.presence)
    .values({ sid, last_seen: new Date() })
    .onConflictDoUpdate({ target: schema.presence.sid, set: { last_seen: new Date() } });

  /* One page load, one hit. The heartbeat does not count. */
  if (body.first) {
    await d
      .insert(schema.hits)
      .values({ day: day(), n: 1 })
      .onConflictDoUpdate({ target: schema.hits.day, set: { n: sql`${schema.hits.n} + 1` } });
  }

  const [live] = await d
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.presence)
    .where(gt(schema.presence.last_seen, new Date(Date.now() - LIVE_SECONDS * 1000)));

  if (!memo || Date.now() - memo.at > 10_000 || body.first) {
    const [week] = await d
      .select({ n: sql<number>`coalesce(sum(${schema.hits.n}), 0)::int` })
      .from(schema.hits)
      .where(gte(schema.hits.day, day(-6)));
    const [all] = await d
      .select({ n: sql<number>`coalesce(sum(${schema.hits.n}), 0)::int` })
      .from(schema.hits);
    memo = { at: Date.now(), week: week?.n ?? 0, all: all?.n ?? 0 };
  }

  /* Opportunistic cleanup, so the table never outgrows the question it
     answers. Cheap, indexed, and it means no cron is load-bearing here. */
  if (Math.random() < 0.02) {
    await d
      .delete(schema.presence)
      .where(and(sql`true`, sql`${schema.presence.last_seen} < now() - interval '10 minutes'`));
  }

  return NextResponse.json({
    now: Math.max(1, live?.n ?? 1),
    week: memo.week,
    all: memo.all,
  } satisfies Counts);
}
