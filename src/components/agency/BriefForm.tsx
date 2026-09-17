"use client";

import { useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { budgets, engagements, services, timelines } from "@/content/agency";
import { site } from "@/content/site";
import { Magnetic } from "@/components/ui/Magnetic";

type Status = "idle" | "sending" | "sent" | "mailto" | "error";

/** The full project planner: what, how much, when. */
export function BriefForm() {
  const params = useSearchParams();
  const preset = params.get("type") ?? "";
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get("company_hp")) return;
    const data = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      company: String(fd.get("company") ?? "").trim(),
      website: String(fd.get("website") ?? "").trim(),
      engagement: String(fd.get("engagement") ?? ""),
      services: fd.getAll("services").map(String),
      budget: String(fd.get("budget") ?? ""),
      timeline: String(fd.get("timeline") ?? ""),
      message: String(fd.get("message") ?? "").trim(),
    };
    const found: Record<string, string> = {};
    if (!data.name) found.name = "Add your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) found.email = "Add an email we can reply to.";
    if (data.message.length < 10) found.message = "Tell us a little about the project.";
    setErrors(found);
    if (Object.keys(found).length) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus();
      return;
    }

    const lines: [string, string][] = [
      ["Company", data.company],
      ["Website", data.website],
      ["Engagement", data.engagement],
      ["Services", data.services.join(", ")],
      ["Budget", data.budget],
      ["Timeline", data.timeline],
    ];
    const summary = [...lines.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), "", data.message].join("\n");

    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, website: data.website, type: data.engagement, message: summary }),
      });
      if (res.ok) return setStatus("sent");
      if (res.status === 503) {
        window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(`Project brief from ${data.name}`)}&body=${encodeURIComponent(`${summary}\n\nReply to: ${data.email}`)}`;
        return setStatus("mailto");
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  const done = status === "sent" || status === "mailto";

  const chips = (name: string, options: string[], type: "radio" | "checkbox", defaultValue?: string) => (
    <div className="chips">
      {options.map((o) => (
        <label key={o} className="chip">
          <input type={type} name={name} value={o} defaultChecked={o === defaultValue} />
          <span>{o}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="contact__formwrap" data-done={done}>
      <form className="brief__form" onSubmit={onSubmit} noValidate inert={done}>
        <div className="field">
          <label htmlFor={id("name")}>Your name</label>
          <input id={id("name")} name="name" autoComplete="name" aria-invalid={!!errors.name} />
          {errors.name && <p className="field__error">{errors.name}</p>}
        </div>
        <div className="field">
          <label htmlFor={id("email")}>Email</label>
          <input id={id("email")} name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} />
          {errors.email && <p className="field__error">{errors.email}</p>}
        </div>
        <div className="field">
          <label htmlFor={id("company")}>Company</label>
          <input id={id("company")} name="company" autoComplete="organization" />
        </div>
        <div className="field">
          <label htmlFor={id("website")}>
            Current website <span className="text-smudge">(optional)</span>
          </label>
          <input id={id("website")} name="website" inputMode="url" placeholder="yourbrand.com" />
        </div>

        <fieldset className="brief__wide">
          <legend>What kind of project?</legend>
          {chips(
            "engagement",
            engagements.map((e) => e.name),
            "radio",
            engagements.find((e) => e.id === preset)?.name,
          )}
        </fieldset>
        <fieldset className="brief__wide">
          <legend>Services you need</legend>
          {chips(
            "services",
            services.map((s) => s.name),
            "checkbox",
          )}
        </fieldset>
        <fieldset>
          <legend>Budget</legend>
          {chips("budget", budgets, "radio")}
        </fieldset>
        <fieldset>
          <legend>Timeline</legend>
          {chips("timeline", timelines, "radio")}
        </fieldset>

        <div className="field brief__wide">
          <label htmlFor={id("message")}>Tell us about the project</label>
          <textarea
            id={id("message")}
            name="message"
            rows={4}
            placeholder="Goals, audience, what isn’t working today, anything we should know."
            aria-invalid={!!errors.message}
          />
          {errors.message && <p className="field__error">{errors.message}</p>}
        </div>

        <div className="contact__hp" aria-hidden="true">
          <input name="company_hp" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="brief__wide flex flex-wrap items-center gap-8">
          <Magnetic strength={0.3}>
            <button type="submit" className="send" disabled={status === "sending"} data-cursor-label="Send">
              {status === "sending" ? "Sending…" : "Send brief →"}
            </button>
          </Magnetic>
          <p role="alert" className="text-[15px] text-[#ff8a7a]">
            {status === "error" ? "That didn’t send. Try again, or email us directly." : ""}
          </p>
        </div>
      </form>

      <div className="contact__done" role="status" aria-live="polite">
        {status === "sent" && <p className="t-h2">Brief received. We’ll be in touch.</p>}
        {status === "mailto" && <p className="t-h2">Your email app has the brief ready to send.</p>}
      </div>
    </div>
  );
}
