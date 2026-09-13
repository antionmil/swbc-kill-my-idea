/* Ordering the five experiments. A pure module with no dependencies, so it can
   be tested on its own — which matters, because this is the page's central
   promise rather than a detail. */

export type Experiment = {
  action: string;
  hours: number;
  money: number;
  kills: string;
  /** 1-based position of the experiment this one needs the results of */
  needs: number | null;
};

/* Ordering is done here, not by the model.
 *
 * The page tells the reader the list is ordered so the cheapest way to be
 * wrong comes first. Asking the model nicely got that right most of the time,
 * and "most of the time" is not something to print as a promise: a live answer
 * put a one-hour test second behind a two-hour one within an hour of shipping.
 *
 * An hour of your own time is counted as $50 for ordering purposes ONLY. There
 * is no honest universal rate, so the choice is stated rather than buried, and
 * it never changes what any experiment says it costs — only the order.
 *
 * Dependencies win over cost: an experiment that recruits the people a later
 * one needs has to come first however cheap the later one is. */
const HOUR = 50;
export const weigh = (e: Experiment) => e.hours * HOUR + e.money;

export function order(list: Experiment[]): Experiment[] {
  const n = list.length;
  const needs = list.map((e) =>
    typeof e.needs === "number" && e.needs >= 1 && e.needs <= n && e.needs - 1 !== list.indexOf(e)
      ? e.needs - 1
      : null,
  );

  /* Detect a circle BEFORE placing anything. Each experiment names at most one
     prerequisite, so following the chain from every node finds a loop in one
     pass. Detecting it late let the independent experiments go first and
     stranded the cheap ones at the bottom, which is the opposite of the
     promise. A list nobody can order is ordered by cost alone. */
  let ignoreDependencies = false;
  for (let start = 0; start < n && !ignoreDependencies; start++) {
    const seen = new Set<number>();
    let at: number | null = start;
    while (at !== null) {
      if (seen.has(at)) { ignoreDependencies = true; break; }
      seen.add(at);
      at = needs[at];
    }
  }

  const out: Experiment[] = [];
  const placed = new Set<number>();

  while (placed.size < n) {
    const left = list.map((_, i) => i).filter((i) => !placed.has(i));
    const ready = ignoreDependencies
      ? left
      : left.filter((i) => needs[i] === null || placed.has(needs[i]!));

    /* Belt and braces: the cycle check above should make this unreachable. */
    if (!ready.length) {
      ignoreDependencies = true;
      continue;
    }

    const next = ready.sort((a, b) => weigh(list[a]) - weigh(list[b]))[0];
    placed.add(next);
    out.push(list[next]);
  }
  return out;
}
export type Kill = {
  verdict: string;
  assumption: string;
  experiments: Experiment[];
  summary: string;
  /** null when the idea is already aimed as tightly as it can be */
  sharper: string | null;
};

/** Cost as a person reads it: "2 hours", "10 hours · $150". */
export function costLabel(e: Experiment) {
  const h = e.hours === 1 ? "1 hour" : `${e.hours % 1 ? e.hours.toFixed(1) : e.hours} hours`;
  return e.money > 0 ? `${h} · $${e.money.toLocaleString("en-US")}` : h;
}
