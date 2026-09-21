import { ImageResponse } from "next/og";
import { work } from "@/content/work";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return work.map((w) => ({ slug: w.slug }));
}

export const alt = "An Erase project";

/**
 * Every project gets its own card, in that project's own colours — the same
 * tone the case page wears. A shared image would make four different pieces of
 * work look like one.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = work.find((w) => w.slug === slug) ?? work[0];
  const { bg, fg, muted } = item.tone;

  // A few ruled lines, like the sheet each case is printed on.
  const rules = Array.from({ length: 7 }, (_, i) => 150 + i * 62);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: bg,
          color: fg,
          position: "relative",
        }}
      >
        {rules.map((y) => (
          <div key={y} style={{ position: "absolute", left: 0, right: 0, top: y, height: 1, background: muted, opacity: 0.22 }} />
        ))}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: muted }}>
          <span style={{ color: fg, fontWeight: 700, fontSize: 30, letterSpacing: -1.4 }}>Erase</span>
          <span style={{ textTransform: "uppercase", letterSpacing: 2 }}>
            {item.kind}, {item.year}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: item.title.length > 12 ? 104 : 132, fontWeight: 500, lineHeight: 0.92, letterSpacing: -6 }}>
            {item.title}
          </div>
          <div style={{ display: "flex", fontSize: 34, color: muted, lineHeight: 1.25, maxWidth: 880 }}>{item.brief}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 21, color: muted }}>
          <span>{item.sector}</span>
          <span>{item.tags.join("  /  ")}</span>
        </div>
      </div>
    ),
    size,
  );
}
