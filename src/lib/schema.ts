import { pgTable, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";

/* TWO TABLES, and the ones this site does NOT have are the point.
 *
 * The scaffold ships `submissions` and `results` as well. Neither is here.
 * The input to this site is somebody's unlaunched idea, so there is no feed to
 * moderate and no shared result page to store. A table that exists is a table
 * something will eventually write to; the way to keep a promise about not
 * keeping people's ideas is to have nowhere to put them. */

/** getOrCompute backing store. Postgres, not Redis — one fewer service.
 *
 *  What lands here is the ANSWER, keyed by a SHA-256 of the question. The
 *  description itself is never written down: the key cannot be turned back
 *  into it, and an identical description simply hits the same row. */
export const cache = pgTable(
  "cache",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("cache_expiry_idx").on(t.expires_at)],
);

/** Rate-limit counters.
 *  `bucket` is the PRIMARY KEY, not a plain column. That is load-bearing:
 *  the counter is a single atomic INSERT .. ON CONFLICT DO UPDATE, and
 *  without the uniqueness there is no conflict to catch, every call inserts
 *  a fresh row, every count comes back as 1, and BOTH the per-IP limit and
 *  the global daily ceiling silently never fire. */
export const events = pgTable(
  "events",
  {
    bucket: text("bucket").primaryKey(), // "gen:2026-09-13" or "gen:2026-09-13:<ip_hash>"
    n: integer("n").notNull().default(0),
    day: text("day").notNull(), // YYYY-MM-DD, for cheap cleanup
  },
  (t) => [index("events_day_idx").on(t.day)],
);
