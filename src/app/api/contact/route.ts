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

export async function POST(req: Request) {
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
