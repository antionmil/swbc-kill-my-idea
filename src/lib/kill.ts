import { complete } from "./llm";
import { order, type Experiment } from "./order";

export type { Experiment } from "./order";
export { costLabel } from "./order";

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
- Exactly five experiments. The cheapest must be doable in under two hours. Do not worry about the order; each experiment carries a "needs" field and the ordering is done afterwards.
- "needs" is the 1-based position of the experiment whose RESULTS this one requires — the people it recruits, the list it produces — or null. Most experiments are independent. Use it only when the experiment genuinely cannot run on its own.
- Every experiment names a falsifying result AS A NUMBER. "Fewer than 5 of 50 reply", never "low interest".
- Prefer experiments that need no product at all.
- NEVER suggest building an MVP, a prototype, a waitlist page, or "just launch and see". Those are the thing being tested, not a test of it.
- The verdict comes first and is at most 15 words. It may say the idea is sound. An honest yes is what makes the no's believable.
- Name the single assumption the whole idea rests on, in one sentence.
- Money in US dollars. Write 0 when an experiment costs nothing but time.
- Write like someone who has run these experiments. Concrete nouns, no consultant register, no hedging, no "consider".
- If the input is not an idea — a greeting, a test, an insult, gibberish — set "refused" to a one-sentence reply saying so, and return no experiments.

Two closing fields:
- "summary": one or two sentences saying what the idea actually is, in plainer words than the description used. A restatement, not a verdict and not advice. Somebody who reads only this should be able to repeat the idea back.
- "sharper": ONE narrower version of the idea that the same experiments would have an easier time proving. Name the specific change and, in the same breath, why it is easier to prove — a named customer, a named moment, a smaller promise. Never "niche down", never "talk to more users", never a second idea in disguise. If the idea is already as tightly aimed as it can be, set it to null and do not invent one.

Return ONLY minified JSON, no code fence:
{"verdict":string,"assumption":string,"experiments":[{"action":string,"hours":number,"money":number,"kills":string,"needs":number|null}],"summary":string,"sharper":string|null,"refused":string|null}`;

export type Kill = {
  verdict: string;
  assumption: string;
  experiments: Experiment[];
  summary: string;
  /** null when the idea is already aimed as tightly as it can be */
  sharper: string | null;
};

export class NotAnIdea extends Error {}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

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
      const needs = typeof x.needs === "number" && Number.isInteger(x.needs) ? x.needs : null;
      return {
        action: str(x.action),
        hours: num(x.hours),
        money: num(x.money),
        kills: str(x.kills),
        needs,
      };
    })
    .filter((e) => e.action && e.kills)
    .slice(0, 5);

  const verdict = str(data.verdict);
  if (!verdict || experiments.length < 3) throw new Error("The model returned an incomplete answer.");

  const sharper = str(data.sharper);
  return {
    verdict,
    assumption: str(data.assumption),
    experiments: order(experiments),
    summary: str(data.summary),
    /* The model is told to return null rather than invent one. It sometimes
       returns the string "null" instead, which would print on the page. */
    sharper: sharper && sharper.toLowerCase() !== "null" ? sharper : null,
  };
}

/* max_tokens has to clear the thinking budget as well as the answer.
 * At the scaffold's default of 1600 the JSON came back cut in half, mid-string,
 * because the model had spent the budget thinking first. */
export async function killIdea(idea: string): Promise<Kill> {
  const raw = await complete(`The idea:\n\n${idea}`, {
    job: "prose",
    system: SYSTEM,
    /* MEDIUM, measured rather than assumed.
     *
     * Thinking is billed as output and was three quarters of the bill at the
     * default effort. Three ideas were run at every level and the output
     * audited against the contract this page promises: cost ascending, a
     * number in every kill, nothing that says build it.
     *
     *   high (was shipped)  $0.0295   clean
     *   medium              $0.0161   clean          <- here
     *   low                 $0.0087   3 breaks, one of them "run ads"
     *   no thinking         $0.0090   1 break
     *   haiku, no thinking  $0.0043   3 breaks, and it cited a dead company
     *
     * The breaks below medium are the ordering going wrong in the middle of
     * the list, which is the one thing the page tells the reader it has done
     * for them. Re-measure before moving this. */
    effort: "medium",
    maxTokens: 5000,
    maxInputChars: 4000,
    /* Caching is owned by the route, not by this call, so a description that
       has been asked before can be served WITHOUT spending one of the three
       goes an address gets each day. */
    ttl: 0,
  });
  return parse(raw);
}
