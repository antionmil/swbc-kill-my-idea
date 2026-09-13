"use client";

import { useRef, useState } from "react";
import type { Kill } from "@/lib/kill";
import { Report, asMarkdown } from "./Report";

type State =
  | { at: "idle" }
  | { at: "working" }
  | { at: "done"; idea: string; data: Kill; cached: boolean }
  | { at: "error"; message: string; kind?: string };

const EXAMPLES = [
  "A marketplace where dentists sell their unused appointment slots at a discount to people who want treatment sooner.",
  "A Chrome extension that summarises long Slack threads so you can catch up after a holiday.",
  "A subscription box of regional snacks chosen by people who grew up eating them.",
];

export function Killer() {
  const [idea, setIdea] = useState("");
  const [state, setState] = useState<State>({ at: "idle" });
  const [copied, setCopied] = useState(false);
  const [waited, setWaited] = useState(0);
  /* Part of the honeypot: a form filled faster than a person could read it. */
  const startedAt = useRef(Date.now());
  const trap = useRef<HTMLInputElement>(null);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = idea.trim();
    if (text.length < 25 || state.at === "working") return;
    setState({ at: "working" });
    /* Measured at about 35 seconds. A spinner that says nothing for that long
       reads as broken, so the line under the button counts. */
    setWaited(0);
    const tick = setInterval(() => setWaited((n) => n + 1), 1000);
    try {
      const res = await fetch("/api/kill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idea: text, trap: trap.current?.value, startedAt: startedAt.current }),
      });
      const json = await res.json();
      if (!res.ok) {
        setState({ at: "error", message: json.error ?? "Something went wrong.", kind: json.reason });
        return;
      }
      setState({ at: "done", idea: text, data: json as Kill, cached: Boolean(json.cached) });
    } catch {
      setState({ at: "error", message: "The connection dropped before the answer came back." });
    } finally {
      clearInterval(tick);
    }
  };

  const copy = async () => {
    if (state.at !== "done") return;
    try {
      await navigator.clipboard.writeText(asMarkdown(state.idea, state.data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  };

  const again = () => {
    setState({ at: "idle" });
    startedAt.current = Date.now();
  };

  return (
    <div className="flex flex-col gap-10">
      {state.at !== "done" ? (
        <form onSubmit={submit} className="no-print flex flex-col gap-3">
          <label htmlFor="idea" className="font-mono text-[11px] tracking-[0.2em] text-faint uppercase">
            The idea you have not built yet
          </label>
          <textarea
            id="idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={5}
            maxLength={4000}
            disabled={state.at === "working"}
            placeholder="What is it, who is it for, and what do you believe about them that would have to be true?"
            className="w-full resize-y rounded-xl border border-edge bg-field p-4 font-display text-[17px] leading-relaxed text-ink placeholder:text-faint focus:border-kill focus:outline-none disabled:opacity-60"
          />
          {/* Honeypot. Off-screen rather than display:none, which some bots skip. */}
          <input
            ref={trap}
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="absolute -left-[9999px] h-px w-px opacity-0"
          />

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={idea.trim().length < 25 || state.at === "working"}
              className="rounded-lg bg-kill px-6 py-3 text-[14px] font-semibold text-kill-ink transition-opacity hover:enabled:opacity-90 disabled:opacity-35"
            >
              {state.at === "working" ? "Working on it…" : "Try to kill it"}
            </button>
            <span className="text-[13px] text-faint">
              {state.at === "working"
                ? waited < 10
                  ? "About half a minute. It is writing, not looking anything up."
                  : waited < 25
                    ? `Still writing — ${waited} seconds in.`
                    : `${waited} seconds. Any moment now.`
                : "Three a day, and nothing you type is stored."}
            </span>
          </div>

          {state.at === "error" ? (
            <p
              role="alert"
              className={`mt-1 max-w-[62ch] text-[14px] leading-relaxed ${
                state.kind === "ip" || state.kind === "ceiling" ? "text-muted" : "text-kill"
              }`}
            >
              {state.message}
            </p>
          ) : null}

          {state.at === "idle" && !idea ? (
            <div className="mt-2 flex flex-col gap-2">
              <p className="font-mono text-[11px] tracking-[0.2em] text-faint uppercase">Or borrow one</p>
              <ul className="flex flex-col gap-1.5">
                {EXAMPLES.map((x) => (
                  <li key={x}>
                    <button
                      type="button"
                      onClick={() => setIdea(x)}
                      className="text-left font-display text-[15px] leading-snug text-muted underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-kill"
                    >
                      {x}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </form>
      ) : (
        <>
          <Report idea={state.idea} data={state.data} />
          <div className="no-print flex flex-wrap items-center gap-3 border-t border-rule pt-6">
            <button
              type="button"
              onClick={copy}
              className="rounded-lg bg-kill px-5 py-2.5 text-[14px] font-semibold text-kill-ink transition-opacity hover:opacity-90"
            >
              {copied ? "Copied" : "Copy the plan"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-edge px-5 py-2.5 text-[14px] font-semibold text-muted hover:border-kill hover:text-kill"
            >
              Print it
            </button>
            <button
              type="button"
              onClick={again}
              className="text-[14px] text-muted underline decoration-rule underline-offset-4 hover:text-ink"
            >
              Kill another one
            </button>
            {state.cached ? (
              <span className="text-[12.5px] text-faint">
                Somebody asked this one before, so it came back from the week&rsquo;s cache.
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
