# Kill My Idea — day 11 of 26

Describe something you have not built. Get the five fastest experiments that
would prove it wrong, cheapest first, each naming the result that would end it
as a number.

Live at **killmyidea.onedaybuilt.com**.

## The one decision everything follows from

Validation tools look for a reason to say yes. They size the market, count the
competitors, and hand back a number big enough to justify starting. None of
that can tell you the idea is wrong, because none of it can come out against
you.

So the output here is falsification, not assessment. Every experiment names a
falsifying number, they are ordered by what they cost, and "build an MVP" is
banned in the prompt because it is the thing being tested rather than a test
of it. The verdict is allowed to say the idea is sound; it does, often enough
that the negative ones are worth reading.

The incumbent check, run before the build: [Idea Kill Switch](https://ideakillswitch.com/)
is live and charges $24 a validation with no free tier, and what it sells is a
market report with a Kill / Weak / Go label on top. Nobody was selling the
cheap disproof plan. That gap is the whole product.

## What an answer costs

Measured, not estimated. `claude-sonnet-5` at $2 per million input tokens and
$10 per million output, and every call logs its own usage and cost - grep the
function logs for `[llm]`.

| | |
|---|---|
| Input | ~815 tokens |
| Output | ~1,560 tokens, of which ~890 is thinking |
| Per answer | **$0.017** — measured in production, range $0.0155 to $0.0200 |
| Daily ceiling of 400 answers | **$6.90** |

### Why effort is `medium`

Thinking is billed as output and was three quarters of the bill at the default
effort. Three ideas were run at every level and each answer audited against
the contract the page promises - cost ascending through the list, a number in
every falsifying result, nothing that amounts to "build it and see":

| Setting | Per answer | Audit |
|---|---|---|
| Sonnet, high (the default) | $0.0295 | clean |
| **Sonnet, medium** | **$0.0161** | **clean** |
| Sonnet, low | $0.0087 | 3 breaks, one of them "run $150 of ads" |
| Sonnet, no thinking | $0.0090 | 1 break |
| Haiku, no thinking | $0.0043 | 3 breaks, and it cited a company that shut down |

Every break below medium was the ordering going wrong in the MIDDLE of the
list, which is the one thing the page tells the reader it has done for them.
Medium also halved the wait, from about 35 seconds to about 20.

Prompt caching is not a lever here and was checked rather than assumed: the
system prompt is around 500 tokens, below the minimum cacheable prefix, and
input is under a tenth of the bill either way. The cache that does matter is
the week-long one on whole answers - a description asked before costs nothing
and does not spend one of the visitor's three goes.

## The three numbers at the foot of the page

Counted without putting anything on the visitor's device — no cookie, no
localStorage, no fingerprint, no IP address. The id is a random string made in
memory when the page loads and forgotten when the tab closes.

That choice has a price, and the page states it rather than hiding it: with no
durable id there is no honest way to tell a returning reader from a new one,
so only **here now** counts people. **This week** and **all time** count
visits, and say so on the page. Calling them people would have been the easy
lie.

`presence` rows are swept after ten minutes, opportunistically on about one
request in fifty, so no cron is load-bearing for it. The week and all-time
figures are held for ten seconds per instance, because they barely move
between heartbeats and every visitor beats every 45 seconds.

## Nothing is kept

There is no feed, no account, and no stored result. The scaffold ships
`submissions` and `results` tables; neither exists here. A table that exists is
a table something eventually writes to, and the way to keep a promise about
not keeping people's ideas is to have nowhere to put them.

The answer is cached for a week against a SHA-256 of the description. The key
cannot be turned back into the description, an identical description hits the
same row, and a cache hit does not spend one of the visitor's three goes.

## The two guards, and how they were tested

A guard that compiles is not a guard. Both were tested by attempting them, on
the running site:

| Guard | The attack | What happened |
|---|---|---|
| 3 per address per day | Four requests from one address after two had already been spent | 1 answered, 3 refused with the limit named |
| Global daily ceiling | Ceiling set to 1, request from a fresh address | Refused, and an already-cached idea still answered |

The second half of that row is the part worth keeping: past the ceiling the
site serves cache only rather than going dark.

Counters live in one table with `bucket` as the PRIMARY KEY, because the
increment is a single `INSERT .. ON CONFLICT DO UPDATE`. Without the
uniqueness there is no conflict to catch, every count comes back as 1, and
both limits silently never fire. That is day 1's rate limiter, which compiled,
deployed, and did nothing.

## The ordering is done in code, not by the model

The page tells the reader the list runs cheapest first. Asking the model for
that got it right most of the time, and most of the time is not something to
print as a promise — a live answer put a one-hour test behind a two-hour one
within an hour of shipping, on a sample of three that had come back clean.

So the model now tags each experiment with what it depends on, and
`src/lib/order.ts` does the sorting: a topological sort with cost as the
tiebreak, prerequisites always ahead of the experiments that need them, and a
circular dependency detected up front and answered by dropping the
dependencies rather than half-applying them.

An hour of your own time counts as $50 for ordering purposes only. There is no
honest universal rate, so the number is stated rather than buried, and it
never changes what an experiment says it costs — only where it sits.

`pnpm test:order` covers the cases, including the live failure that prompted
this and the awkward ones a model will eventually produce: a self-reference, a
circle, and a dependency pointing at an experiment that does not exist.

## What comes back

A verdict of at most fifteen words, five experiments ordered by cost, the
assumption underneath, and then two closing fields: the idea restated in plain
words, and one sharper version of it — a specific narrower target, never
"niche down". `sharper` is allowed to be null when the idea is already aimed
as tightly as it can be, and the prompt says so explicitly, because a model
asked for advice will always produce advice.

## Model

Sonnet, because the prose is the product, with adaptive thinking on.

`max_tokens` is 5000 rather than the scaffold's 1600. Thinking tokens come out
of the same budget, so at 1600 the JSON came back cut in half, mid-string. A
generation takes about 35 seconds, which is why the line under the button
counts the seconds instead of showing a spinner.

Two changes were made to `prep/prompt.md` after reading real output:

1. Strict cost ordering broke on dependent experiments — a one-hour test that
   can only run on the people who said yes to a four-hour one was being placed
   first. A follow-on may now sit behind its prerequisite.
2. Money is stated in dollars. Left free, the model picked a currency out of
   nothing in the input.

## Routes

| Route | Mode | Why |
|---|---|---|
| `/` | static | Nothing on it depends on the request. |
| `/api/kill` | dynamic | The only thing that costs money, and only when asked. |
| `/api/og` | dynamic | One image, cached at the edge for a week. |
| `/api/cron/sweep` | dynamic | Deletes expired cache rows daily. There is nothing to precompute: the input is a stranger's sentence. |

## Running it

```
pnpm install
pnpm db:push
pnpm dev            # localhost:3012
pnpm build:check    # builds into .next-build, never disturbs a running dev server
```

Needs `DATABASE_URL` (its own Neon project, Frankfurt, paired with `fra1`) and
`ANTHROPIC_API_KEY`.
