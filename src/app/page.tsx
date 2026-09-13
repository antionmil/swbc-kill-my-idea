import { Here } from "@/components/Here";
import { Killer } from "@/components/Killer";

/* Static. Nothing on this page depends on a request, and the only thing that
   costs money happens behind /api/kill, which the visitor asks for by hand. */
export const dynamic = "force-static";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[720px] flex-col gap-12 px-5 py-12 sm:px-8 sm:py-16">
      <header>
        <span className="font-mono text-[11px] tracking-[0.22em] text-kill uppercase">Kill My Idea</span>
      </header>

      <section className="flex flex-col gap-4">
        <h1 className="font-display text-[42px] leading-[1.02] font-semibold tracking-[-0.02em] sm:text-[56px]">
          Kill my idea.
        </h1>
        <p className="max-w-[52ch] text-[17px] leading-relaxed text-muted">
          Describe the thing you have not built yet. You get the five fastest experiments that
          would prove it wrong, cheapest first, and the number that would end each one.
        </p>
      </section>

      <Killer />

      <section className="flex max-w-[58ch] flex-col gap-3 border-t border-rule pt-9 text-[15px] leading-relaxed text-muted">
        <h2 className="font-mono text-[11px] tracking-[0.2em] text-faint uppercase">
          Why it is pointed this way
        </h2>
        <p>
          Almost everything that calls itself validation is looking for a reason to say yes. It
          sizes the market, counts the competitors, and hands back a number big enough to justify
          starting. None of that can tell you the idea is wrong, because none of it can come out
          against you.
        </p>
        <p>
          An experiment can. Every one here names a result that would end the idea, as a number,
          and they are ordered by what they cost so the cheapest way to be wrong comes first. None
          of them is &ldquo;build it and see&rdquo;. That is the thing being tested, not a test.
        </p>
        <p>
          The verdict is allowed to say your idea is sound. It says so often enough that the
          opposite is worth reading.
        </p>
      </section>

      <footer className="flex flex-col gap-6 border-t border-rule pt-7 text-[13px] leading-relaxed text-faint">
        <Here />
        <p className="max-w-[62ch]">
          Nothing you type is published, shown to anybody, or kept. There is no feed here and no
          account. The answer is held for a week against a one-way hash of the description, so an
          identical description returns instantly and costs nothing — the description itself is
          never written down.
        </p>
        <p className="max-w-[62ch]">
          The counts above are taken without putting anything on your device: no cookie, no
          storage, no address. That is also why only the first one counts people — with nothing
          kept, there is no honest way to tell a returning reader from a new one, so the other two
          count visits and say so.
        </p>
        <p>
          <a href="https://onedaybuilt.com" className="text-kill underline-offset-4 hover:underline">
            onedaybuilt.com
          </a>{" "}
          — one website a day, every day of September.
        </p>
      </footer>
    </main>
  );
}
