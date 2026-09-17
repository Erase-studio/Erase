import { ImageResponse } from "next/og";

export const alt = "Erase: nothing generic left.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "#111213",
          color: "#E9EAEC",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#8B8E94" }}>
          <span style={{ color: "#E9EAEC", fontWeight: 800, fontSize: 30 }}>Erase</span>
          <span>Web design & development · From Nepal</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 150, fontWeight: 800, lineHeight: 0.86, letterSpacing: -7 }}>
          <span>Nothing</span>
          <span style={{ paddingLeft: 90 }}>generic</span>
          <span>left.</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: 640,
            top: 0,
            width: 8,
            height: 820,
            background: "#79C8EE",
            transform: "rotate(24deg)",
            transformOrigin: "top left",
          }}
        />
      </div>
    ),
    size,
  );
}
