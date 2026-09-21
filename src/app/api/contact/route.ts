import { site } from "@/content/site";

/**
 * Sends enquiries through Resend when RESEND_API_KEY is set.
 * Without a provider it answers 503, and the form falls back to the visitor's
 * email app. It never claims a message was delivered when it wasn't.
 *
 * Env: RESEND_API_KEY, CONTACT_TO (defaults to site.email), CONTACT_FROM (a verified sender).
 */

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * A few letters an hour from one address is a person; more is a script.
 * Best effort only — it lives in this server instance's memory — but it stops
 * the cheap kind of flood without a database.
 */
const WINDOW = 10 * 60 * 1000;
const LIMIT = 5;
const seen = new Map<string, number[]>();

function tooMany(ip: string) {
  const now = Date.now();
  const recent = (seen.get(ip) ?? []).filter((t) => now - t < WINDOW);
  recent.push(now);
  seen.set(ip, recent);
  if (seen.size > 5000) seen.clear(); // never let the ledger itself grow unbounded
  return recent.length > LIMIT;
}

export async function POST(req: Request) {
  // Only our own pages post here.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host && new URL(origin).host !== new URL(site.url).host) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  // A letter, not a novel: anything bigger than this isn't from the form.
  if (Number(req.headers.get("content-length") ?? 0) > 20_000) {
    return Response.json({ error: "That letter is too long to send." }, { status: 413 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  if (tooMany(ip)) {
    return Response.json({ error: "Too many letters in a short time. Try again in a few minutes, or email us directly." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.company) return Response.json({ ok: true }); // honeypot

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const website = clean(body.website, 300);
  const type = clean(body.type, 60);
  const message = clean(body.message, 5000);

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
    return Response.json({ error: "Name, a valid email and a message are required." }, { status: 422 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return Response.json({ error: "Mail provider not configured." }, { status: 503 });

  const html = `
    <p><b>Name:</b> ${escape(name)}</p>
    <p><b>Email:</b> ${escape(email)}</p>
    <p><b>Website:</b> ${escape(website || "-")}</p>
    <p><b>Project:</b> ${escape(type || "-")}</p>
    <p style="white-space:pre-wrap">${escape(message)}</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM ?? `Erase website <website@${new URL(site.url).hostname}>`,
      to: [process.env.CONTACT_TO ?? site.email],
      reply_to: email,
      subject: `Project enquiry: ${name}${type ? ` (${type})` : ""}`,
      html,
    }),
  });

  if (!res.ok) return Response.json({ error: "Delivery failed." }, { status: 502 });
  return Response.json({ ok: true });
}
