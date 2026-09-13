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

Measured, not estimated: three runs of the real system prompt through
`claude-sonnet-5` at $2 per million input tokens and $10 per million output.

| | |
|---|---|
| Input | ~739 tokens |
| Output | ~2,733 tokens, of which ~2,050 is thinking |
| Per answer | **$0.029** |
| Daily ceiling of 400 answers | **$11.52** |

Thinking is most of the bill. The cache is the other half of the cost story: a
description that has been asked before costs nothing and does not spend one of
the visitor's three goes.

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
