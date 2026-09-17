"use client";

import { useId, useState } from "react";
import { site } from "@/content/site";
import { Lines } from "@/components/ui/Lines";
import { Magnetic } from "@/components/ui/Magnetic";
import { TransitionLink } from "@/components/system/TransitionLink";

const needs = ["a redesign", "a new website", "a landing page"] as const;

type Status = "idle" | "sending" | "sent" | "mailto" | "error";

/** The form is one sentence you finish. */
export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    if (data.company) return; // honeypot

    const found: Record<string, string> = {};
    if (!data.name?.trim()) found.name = "Add your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email?.trim() ?? "")) found.email = "Add an email we can reply to.";
    setErrors(found);
    if (Object.keys(found).length) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus();
      return;
    }

    const message = `Hi, I'm ${data.name}. My website ${data.website || "(none yet)"} needs ${data.type || "some work"}.`;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, message }),
      });
      if (res.ok) return setStatus("sent");
      if (res.status === 503) {
        window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(
          `Project enquiry from ${data.name}`,
        )}&body=${encodeURIComponent(`${message}\n\nReply to: ${data.email}`)}`;
        return setStatus("mailto");
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  const done = status === "sent" || status === "mailto";
  const errorList = Object.values(errors);

  return (
    <section id="contact" data-chapter="contact" data-theme="dark" className="grain contact" aria-labelledby="contact-title">
      <div className="frame">
        <header className="contact__head" data-reveal>
          <Lines id="contact-title" className="t-h2" lines={["Start a project."]} />
          <TransitionLink href="/contact" title="Start a project" className="ink-link t-label text-smudge self-start" data-fade>
            Prefer a detailed brief? Open the project planner →
          </TransitionLink>
        </header>

        <div className="contact__formwrap" data-done={done}>
          <form className="contact__form contact__form--lib" onSubmit={onSubmit} noValidate inert={done}>
            <p className="lib">
              <span className="lib__muted">Hi, I’m </span>
              <label htmlFor={id("name")} className="sr-only">
                Your name
              </label>
              <input id={id("name")} name="name" placeholder="your name" autoComplete="name" aria-invalid={!!errors.name} />
              <span className="lib__muted">. My website </span>
              <label htmlFor={id("website")} className="sr-only">
                Current website (optional)
              </label>
              <input id={id("website")} name="website" placeholder="yoursite.com" inputMode="url" autoComplete="url" />
              <span className="lib__muted"> needs </span>
              <span className="lib__chips" role="radiogroup" aria-label="What you need">
                {needs.map((n, i) => (
                  <label key={n} className="lib__chip">
                    <input type="radio" name="type" value={n} defaultChecked={i === 0} />
                    <span>{n}</span>
                  </label>
                ))}
              </span>
              <span className="lib__muted">. Reply to </span>
              <label htmlFor={id("email")} className="sr-only">
                Your email
              </label>
              <input
                id={id("email")}
                name="email"
                type="email"
                placeholder="you@email.com"
                autoComplete="email"
                inputMode="email"
                aria-invalid={!!errors.email}
              />
              <span className="lib__muted">.</span>
            </p>

            <div className="contact__hp" aria-hidden="true">
              <input name="company" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
              <Magnetic strength={0.3}>
                <button type="submit" className="send" disabled={status === "sending"} data-cursor-label="Send">
                  {status === "sending" ? "Sending…" : "Send it →"}
                </button>
              </Magnetic>
              <div className="grid gap-2">
                <p role="alert" className="text-[15px] text-[#ff8a7a]">
                  {status === "error" ? "That didn’t send. Try again, or email us." : errorList.join(" ")}
                </p>
                <a href={`mailto:${site.email}`} className="ink-link t-label self-start text-smudge">
                  or email {site.email}
                </a>
              </div>
            </div>
          </form>

          <div className="contact__done" role="status" aria-live="polite">
            {status === "sent" && <p className="t-h2">Received. Talk soon.</p>}
            {status === "mailto" && <p className="t-h2">Your email app has it ready.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
