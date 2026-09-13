import { complete } from "./llm";

/* The prompt.
 *
 * It comes from prep/prompt.md, written before build day, with two changes
 * made after reading what the model actually returned:
 *
 * 1. Strict cost ordering broke on dependent experiments. The first run put a
 *    one-hour test fifth, because it could only be run on the people who had
 *    said yes to the four-hour one. Ordering now allows a follow-on to sit
 *    behind its prerequisite.
 * 2. Money is stated in dollars. Left free, the model picked a currency from
 *    nothing in the input. */
const SYSTEM = `You design experiments that DISPROVE ideas. The person describing the idea has not built it yet.

Rules, all binding:
- Exactly five experiments, ordered by cost ascending. The cheapest must be doable in under two hours. An experiment that can only run on the results of an earlier one follows it, even if it is cheaper.
- Every experiment names a falsifying result AS A NUMBER. "Fewer than 5 of 50 reply", never "low interest".
- Prefer experiments that need no product at all.
- NEVER suggest building an MVP, a prototype, a waitlist page, or "just launch and see". Those are the thing being tested, not a test of it.
- The verdict comes first and is at most 15 words. It may say the idea is sound. An honest yes is what makes the no's believable.
- Name the single assumption the whole idea rests on, in one sentence.
- Money in US dollars. Write 0 when an experiment costs nothing but time.
- Write like someone who has run these experiments. Concrete nouns, no consultant register, no hedging, no "consider".
- If the input is not an idea — a greeting, a test, an insult, gibberish — set "refused" to a one-sentence reply saying so, and return no experiments.

Return ONLY minified JSON, no code fence:
{"verdict":string,"assumption":string,"experiments":[{"action":string,"hours":number,"money":number,"kills":string}],"refused":string|null}`;

export type Experiment = { action: string; hours: number; money: number; kills: string };
export type Kill = { verdict: string; assumption: string; experiments: Experiment[] };

export class NotAnIdea extends Error {}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

/** Cost as a person reads it: "2 hours", "10 hours · $150". */
export function costLabel(e: Experiment) {
  const h = e.hours === 1 ? "1 hour" : `${e.hours % 1 ? e.hours.toFixed(1) : e.hours} hours`;
  return e.money > 0 ? `${h} · $${e.money.toLocaleString("en-US")}` : h;
}

function parse(raw: string): Kill {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("The model did not return usable JSON.");
  }

  const refused = str(data.refused);
  if (refused) throw new NotAnIdea(refused);

  const experiments = (Array.isArray(data.experiments) ? data.experiments : [])
    .map((e) => {
      const x = e as Record<string, unknown>;
      return { action: str(x.action), hours: num(x.hours), money: num(x.money), kills: str(x.kills) };
    })
    .filter((e) => e.action && e.kills)
    .slice(0, 5);

  const verdict = str(data.verdict);
  if (!verdict || experiments.length < 3) throw new Error("The model returned an incomplete answer.");

  return { verdict, assumption: str(data.assumption), experiments };
}

/* max_tokens has to clear the thinking budget as well as the answer.
 * At the scaffold's default of 1600 the JSON came back cut in half, mid-string,
 * because the model had spent the budget thinking first. */
export async function killIdea(idea: string): Promise<Kill> {
  const raw = await complete(`The idea:\n\n${idea}`, {
    job: "prose",
    system: SYSTEM,
    maxTokens: 5000,
    maxInputChars: 4000,
    /* Caching is owned by the route, not by this call, so a description that
       has been asked before can be served WITHOUT spending one of the three
       goes an address gets each day. */
    ttl: 0,
  });
  return parse(raw);
}
