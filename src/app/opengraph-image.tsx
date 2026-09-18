import { ImageResponse } from "next/og";

export const alt = "Erase: nothing generic survives here.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// A scatter of blue and paper flecks on graphite, echoing the hero window.
const grains = Array.from({ length: 260 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12543.123;
  const r1 = a - Math.floor(a);
  const r2 = b - Math.floor(b);
  const x = 560 + Math.pow(r1, 0.7) * 640;
  const y = 315 + (r2 - 0.5) * 520 * (0.3 + r1);
  return { x, y, s: 2 + ((i * 7) % 5), blue: i % 9 === 0 };
});

export default function OpengraphImage() {
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
          background: "#0B0C0E",
          color: "#E8ECF4",
          position: "relative",
        }}
      >
        {grains.map((g, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.x,
              top: g.y,
              width: g.s,
              height: g.s,
              borderRadius: 99,
              background: g.blue ? "#3D63FF" : "#E8ECF4",
              opacity: 0.7,
            }}
          />
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#8A8F9C" }}>
          <span style={{ color: "#E8ECF4", fontWeight: 700, fontSize: 32, letterSpacing: -1.5 }}>Erase</span>
          <span>Independent design & development studio</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 120, fontWeight: 500, lineHeight: 0.95, letterSpacing: -6 }}>
          <span>Nothing generic</span>
          <span>survives here.</span>
        </div>
      </div>
    ),
    size,
  );
}
