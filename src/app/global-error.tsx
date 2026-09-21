"use client";

/**
 * The last line: the root layout itself failed, so none of the site's styles,
 * fonts or theme are available. Everything here is inline and self-contained.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#000",
          color: "#e9e7e1",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: 24,
        }}
      >
        <title>Something went wrong | Erase</title>
        <div style={{ maxWidth: 520 }}>
          <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8d8e94" }}>
            (Error) The whole page slipped
          </p>
          <h1 style={{ fontSize: "clamp(3rem, 12vw, 6rem)", fontWeight: 500, letterSpacing: "-0.05em", lineHeight: 0.95, margin: "12px 0 18px" }}>Smudged</h1>
          <p style={{ lineHeight: 1.5, color: "#b8b9be", margin: "0 0 26px" }}>
            The site couldn’t load this time. Try again — and if it keeps happening, email us and we’ll fix it.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ height: 42, padding: "0 20px", border: 0, borderRadius: 999, background: "#e9e7e1", color: "#0f1012", fontFamily: "ui-monospace, monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Try again
          </button>
          {error.digest && <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#6c6d72", marginTop: 20 }}>Ref {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
