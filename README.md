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
