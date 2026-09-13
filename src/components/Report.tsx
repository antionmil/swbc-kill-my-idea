import { costLabel, type Kill } from "@/lib/kill";

/* The result, as a printed page.
 *
 * Nothing here decorates the prose: a verdict, a numbered table, a footnote.
 * The one piece of colour is the falsifying number, because that is the line
 * a reader has to be able to find again on the way back. */
export function Report({ idea, data }: { idea: string; data: Kill }) {
  return (
    <article className="rise flex flex-col gap-7">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-[11px] tracking-[0.22em] text-faint uppercase">Verdict</p>
        <h2 className="font-display text-[30px] leading-[1.2] font-semibold tracking-[-0.01em] text-balance sm:text-[36px]">
          {data.verdict}
        </h2>
        <p className="border-l-[3px] border-rule pl-4 text-[15px] leading-relaxed text-muted">{idea}</p>
      </header>

      <table className="w-full border-collapse">
        <caption className="sr-only">
          Five experiments that would disprove the idea, cheapest first
        </caption>
        <tbody>
          {data.experiments.map((e, i) => (
            <tr key={i} className="border-t border-rule align-top">
              <td className="w-[42px] pt-[17px] pb-3.5 font-mono text-[12px] text-faint">
                {String(i + 1).padStart(2, "0")}
              </td>
              <td className="py-3.5 pr-3">
                <p className="font-display text-[17px] leading-[1.45]">{e.action}</p>
                <p className="mt-1.5 text-[13px] leading-snug text-kill">
                  <span className="font-semibold">Kills it:</span> {e.kills}
                </p>
              </td>
              <td className="w-[120px] pt-[17px] pb-3.5 text-right font-mono text-[12.5px] whitespace-nowrap text-muted">
                {costLabel(e)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.assumption ? (
        <footer className="border-t border-rule pt-5">
          <p className="font-mono text-[11px] tracking-[0.18em] text-faint uppercase">
            It all rests on this
          </p>
          <p className="mt-1.5 font-display text-[17px] leading-relaxed text-muted">{data.assumption}</p>
        </footer>
      ) : null}
    </article>
  );
}

/** The whole answer as text, for pasting into wherever the work happens. */
export function asMarkdown(idea: string, data: Kill) {
  const lines = [
    `# Kill my idea`,
    ``,
    `**The idea.** ${idea}`,
    ``,
    `**Verdict.** ${data.verdict}`,
    ``,
    `## Five experiments, cheapest first`,
    ``,
    ...data.experiments.flatMap((e, i) => [
      `${i + 1}. ${e.action}`,
      `   - Cost: ${costLabel(e)}`,
      `   - Kills it: ${e.kills}`,
    ]),
    ``,
    `**It all rests on this.** ${data.assumption}`,
    ``,
    `killmyidea.onedaybuilt.com`,
  ];
  return lines.join("\n");
}
