import { ImageResponse } from "next/og";

/**
 * The home-screen icon: the same smiling eraser as the favicon, drawn onto a
 * black tile at render time. No image file lives in the repository for it.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZkZmNmOCIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2U0ZTJkYSIvPjwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMjIpIj4KICAgIDxyZWN0IHg9IjMiIHk9IjciIHdpZHRoPSI1NCIgaGVpZ2h0PSI0MyIgcng9IjExIiBmaWxsPSJ1cmwoI3IpIiBzdHJva2U9IiMxNDE1MTciIHN0cm9rZS13aWR0aD0iMi40Ii8+CiAgICA8cmVjdCB4PSI0NyIgeT0iNC41IiB3aWR0aD0iNTAiIGhlaWdodD0iNDgiIHJ4PSI1IiBmaWxsPSIjMTQxNTE3Ii8+CiAgICA8cGF0aCBkPSJNNDcgNDNoNTB2NC41YTUgNSAwIDAgMS01IDVINDd6IiBmaWxsPSIjNGQ2YmZmIi8+CiAgICA8ZWxsaXBzZSBjeD0iMTkuNSIgY3k9IjIzLjUiIHJ4PSI0IiByeT0iNS42IiBmaWxsPSIjMTQxNTE3Ii8+CiAgICA8Y2lyY2xlIGN4PSIxOC4yIiBjeT0iMjEuMiIgcj0iMS40IiBmaWxsPSIjZmZmIi8+CiAgICA8ZWxsaXBzZSBjeD0iMzQuNSIgY3k9IjIzLjUiIHJ4PSI0IiByeT0iNS42IiBmaWxsPSIjMTQxNTE3Ii8+CiAgICA8Y2lyY2xlIGN4PSIzMy4yIiBjeT0iMjEuMiIgcj0iMS40IiBmaWxsPSIjZmZmIi8+CiAgICA8cGF0aCBkPSJNMjIgMzRxNSA1LjIgMTAgMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTQxNTE3IiBzdHJva2Utd2lkdGg9IjIuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8ZWxsaXBzZSBjeD0iMTIuNSIgY3k9IjMyLjUiIHJ4PSIzLjgiIHJ5PSIyLjEiIGZpbGw9IiM3ZDkzZmYiLz4KICAgIDxlbGxpcHNlIGN4PSI0MS41IiBjeT0iMzIuNSIgcng9IjMuOCIgcnk9IjIuMSIgZmlsbD0iIzdkOTNmZiIvPgogIDwvZz4KPC9zdmc+Cg==";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MARK} width={140} height={140} alt="" />
      </div>
    ),
    size,
  );
}
