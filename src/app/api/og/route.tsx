import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/**
 * THE FONT TRAP. ImageResponse needs real font bytes — it cannot use a CSS
 * font-family, and a missing font falls back to something that looks nothing
 * like the site. Google's CSS endpoint returns a stylesheet, so the src URL is
 * parsed out of it first, and a modern user agent gets woff2, which
 * ImageResponse cannot read.
 */
let fontCache: ArrayBuffer | null = null;

async function displayFont(): Promise<ArrayBuffer | null> {
  if (fontCache) return fontCache;
  try {
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=Newsreader:wght@600&display=swap", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SWBC/1.0)" },
      })
    ).text();
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    fontCache = await (await fetch(url)).arrayBuffer();
    return fontCache;
  } catch {
    return null; // never let a font failure take down the image
  }
}

export async function GET() {
  const font = await displayFont();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f3f0e9",
          color: "#17150f",
          padding: 72,
          fontFamily: font ? "Display" : "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, color: "#9c3b22", letterSpacing: 5 }}>
          KILL MY IDEA
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 84, lineHeight: 1.05 }}>
            Five ways to prove it wrong, cheapest first.
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "#5e574a", lineHeight: 1.4 }}>
            Every experiment names the number that would end the idea.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 23, color: "#6f6656" }}>
          <div style={{ display: "flex" }}>Nothing you type is kept</div>
          <div style={{ display: "flex" }}>killmyidea.onedaybuilt.com</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: font ? [{ name: "Display", data: font, style: "normal", weight: 600 }] : [],
      headers: {
        "cache-control": "public, max-age=0, s-maxage=604800, stale-while-revalidate=604800",
      },
    },
  );
}
