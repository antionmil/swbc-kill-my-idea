"use client";

import { useEffect, useState } from "react";
import type { Counts } from "@/app/api/here/route";

const BEAT_MS = 45_000;

/* Three numbers, counted without putting anything on anybody's device.
 *
 * The id below lives in a variable for as long as the tab is open. Close the
 * tab and it is gone — no cookie, no localStorage, nothing to consent to.
 * That is also why only the first number counts PEOPLE: without a durable id
 * there is no honest way to say how many humans came this week, so the other
 * two count visits and the page says so. */
export function Here() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    const sid = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 6);
    let alive = true;

    const beat = async (first: boolean) => {
      try {
        const res = await fetch("/api/here", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sid, first }),
          keepalive: true,
        });
        if (!res.ok) return;
        const data = (await res.json()) as Counts;
        if (alive) setCounts(data);
      } catch {
        /* A counter is not worth an error message. */
      }
    };

    beat(true);
    const timer = setInterval(() => beat(false), BEAT_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  /* Nothing is rendered until there is a real figure. A zero that turns into
     a three a second later reads as a site correcting itself. */
  if (!counts) return <div className="h-[46px]" aria-hidden />;

  const items: [string, number, string][] = [
    ["here now", counts.now, counts.now === 1 ? "person" : "people"],
    ["this week", counts.week, counts.week === 1 ? "visit" : "visits"],
    ["all time", counts.all, counts.all === 1 ? "visit" : "visits"],
  ];

  return (
    <dl className="flex flex-wrap gap-x-9 gap-y-3">
      {items.map(([label, n, unit]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="font-mono text-[10.5px] tracking-[0.18em] text-faint uppercase">{label}</dt>
          <dd className="font-display text-[19px] leading-none">
            {n.toLocaleString("en-GB")} <span className="text-[13px] text-muted">{unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
