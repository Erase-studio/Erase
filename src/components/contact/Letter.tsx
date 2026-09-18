"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { gsap } from "@/lib/gsap";
import { budgets } from "@/content/agency";
import { site } from "@/content/site";
import { sound } from "@/lib/sound";
import { Roll } from "@/components/ui/Roll";

/**
 * The contact form is a letter. Fill in the blanks in a sentence you'd actually
 * write; your name signs it as you type. Sending folds it into an envelope and
 * posts it. If no mail provider is set up, your email app opens with the letter
 * instead: we never say it was delivered when it wasn't.
 */

const KINDS = [
  { id: "launch", text: "a brand-new website" },
  { id: "rebuild", text: "a rebuild of the site we have" },
  { id: "partner", text: "a partner for ongoing work" },
  { id: "unsure", text: "something we can’t name yet" },
];
const WHEN = ["as soon as we can", "within 1–3 months", "within 3–6 months", "whenever it’s right"];
const MONEY = [...budgets.map((b) => b.replace(/^Under/, "under")), "still being worked out"];

type Status = "idle" | "sending" | "sent" | "mailto" | "error";

export function Letter() {
  const params = useSearchParams();
  const preset = KINDS.find((k) => k.id === params.get("type"))?.text ?? "";
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [wiping, setWiping] = useState(false);

  // Let the textarea grow line by line on the ruled paper.
  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const reduced = () => !document.documentElement.classList.contains("motion");

  /** Fold, envelope, post. Resolves when it's out of sight. */
  const post = () =>
    new Promise<void>((resolve) => {
      const root = rootRef.current!;
      const paper = root.querySelector(".ct-paper");
      const env = root.querySelector(".ct-env");
      const flap = root.querySelector(".ct-env__flap");
      // Play it where the visitor is looking, however tall the letter is.
      const stage = root.getBoundingClientRect();
      const cy = Math.min(stage.height - 220, Math.max(220, window.innerHeight * 0.5 - stage.top));
      root.style.setProperty("--cy", `${Math.round(cy)}px`);
      if (reduced()) return resolve();
      gsap
        .timeline({ onComplete: resolve })
        .set(paper, { transformOrigin: `50% ${Math.round(cy)}px` })
        .set(env, { autoAlpha: 1, yPercent: 60, scale: 0.9 })
        .to(paper, { rotateX: 58, scaleY: 0.36, scaleX: 0.62, yPercent: -6, duration: 0.7, ease: "power3.inOut" })
        .to(env, { yPercent: 0, scale: 1, duration: 0.55, ease: "power3.out" }, "-=0.3")
        .to(paper, { yPercent: 70, scaleX: 0.5, scaleY: 0.28, autoAlpha: 0, duration: 0.5, ease: "power2.in" }, "-=0.15")
        .fromTo(flap, { rotateX: 180 }, { rotateX: 0, duration: 0.45, ease: "power2.inOut" })
        .to(env, { x: "70vw", y: "-60vh", rotate: -14, scale: 0.6, duration: 0.9, ease: "power3.in" }, "+=0.15");
    });

  const unpost = () => {
    const root = rootRef.current!;
    gsap.set(root.querySelectorAll(".ct-paper, .ct-env, .ct-env__flap"), { clearProps: "all" });
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get("company_hp")) return;
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const data = { name: v("name"), email: v("email"), org: v("org"), kind: v("kind"), website: v("website"), budget: v("budget"), when: v("when"), message: v("message") };
    const found: Record<string, string> = {};
    if (!data.name) found.name = "Sign it with your name.";
    if (data.message.length < 10) found.message = "A sentence or two about the project, please.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) found.email = "We need an address to write back to.";
    setErrors(found);
    if (Object.keys(found).length) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus();
      return;
    }

    // The letter, as they wrote it.
    const letter = [
      "Dear Erase,",
      "",
      `My name is ${data.name}${data.org ? ` and I’m writing on behalf of ${data.org}` : ""}.`,
      data.kind ? `We’re looking for ${data.kind}.` : "",
      data.website ? `What we have today: ${data.website}` : "",
      data.budget ? `Budget: ${data.budget}.` : "",
      data.when ? `Timing: ${data.when}.` : "",
      "",
      "Here’s the thing nobody gets about us:",
      data.message,
      "",
      `Write back to me at ${data.email}.`,
      `${data.name}`,
    ]
      .filter((l, i, a) => l !== "" || a[i - 1] !== "")
      .join("\n");

    setStatus("sending");
    sound.tick();
    const flight = post();
    let result: Status = "error";
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, website: data.website, type: data.kind, message: letter }),
      });
      if (res.ok) result = "sent";
      else if (res.status === 503) result = "mailto";
    } catch {}
    await flight;
    if (result === "mailto") {
      window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(`A letter from ${data.name}`)}&body=${encodeURIComponent(letter)}`;
    }
    if (result === "error") unpost();
    else sound.arrive();
    setStatus(result);
  }

  /** "Erase and start over": the rubber wipes the page, then the blanks are empty. */
  const wipe = () => {
    if (wiping) return;
    const done = () => {
      formRef.current?.reset();
      setName("");
      setEmail("");
      setErrors({});
      formRef.current?.querySelectorAll("textarea").forEach(grow);
    };
    if (reduced()) return done();
    setWiping(true);
    window.setTimeout(done, 650);
    window.setTimeout(() => setWiping(false), 1300);
  };

  const again = () => {
    unpost();
    formRef.current?.reset();
    setName("");
    setEmail("");
    setStatus("idle");
  };

  useEffect(() => () => void gsap.killTweensOf(".ct-paper, .ct-env, .ct-env__flap"), []);

  const done = status === "sent" || status === "mailto";
  const err = (k: string) =>
    errors[k] ? (
      <span className="ct-err" id={id(`${k}-err`)} role="alert">
        {errors[k]}
      </span>
    ) : null;
  // A note goes away as soon as that blank is filled in.
  const clear = (k: string) =>
    errors[k] &&
    setErrors((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });
  const blank = (k: string) => ({
    id: id(k),
    name: k,
    "aria-invalid": !!errors[k] || undefined,
    "aria-describedby": errors[k] ? id(`${k}-err`) : undefined,
    onInput: () => clear(k),
  });

  return (
    <div ref={rootRef} className="ct-stage" data-status={status}>
      <div className="ct-paper" data-wiping={wiping} data-line-hide>
        <form ref={formRef} className="ct-letter" onSubmit={onSubmit} noValidate inert={done || status === "sending"} aria-label="Letter to Erase">
          <p className="ct-line ct-dear">Dear Erase,</p>

          <p className="ct-line">
            <label htmlFor={id("name")}>My name is</label>{" "}
            <input {...blank("name")} className="blank" autoComplete="name" placeholder="your name" value={name} onChange={(e) => setName(e.target.value)} /> {err("name")}
            <label htmlFor={id("org")}>and I’m writing on behalf of</label>{" "}
            <input id={id("org")} name="org" className="blank" autoComplete="organization" placeholder="your company or project" />.
          </p>

          <p className="ct-line">
            <label htmlFor={id("kind")}>We’re looking for</label>{" "}
            <select id={id("kind")} name="kind" className="blank blank--pick" defaultValue={preset}>
              <option value="" disabled>
                pick one
              </option>
              {KINDS.map((k) => (
                <option key={k.id} value={k.text}>
                  {k.text}
                </option>
              ))}
            </select>
            .{" "}
            <label htmlFor={id("website")}>You can see what we have today at</label>{" "}
            <input id={id("website")} name="website" className="blank" inputMode="url" placeholder="yoursite.com (or nothing yet)" />.
          </p>

          <p className="ct-line">
            <label htmlFor={id("budget")}>The budget is</label>{" "}
            <select id={id("budget")} name="budget" className="blank blank--pick" defaultValue="">
              <option value="" disabled>
                roughly…
              </option>
              {MONEY.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>{" "}
            <label htmlFor={id("when")}>and we’d like to launch</label>{" "}
            <select id={id("when")} name="when" className="blank blank--pick" defaultValue="">
              <option value="" disabled>
                when?
              </option>
              {WHEN.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            .
          </p>

          <div className="ct-line ct-para">
            <label htmlFor={id("message")}>Here’s the thing nobody gets about us:</label>
            <textarea
              {...blank("message")}
              className="blank blank--area"
              rows={3}
              placeholder="What you make, who it’s for, what isn’t working today, what you’d love people to feel."
              onInput={(e) => {
                grow(e.currentTarget);
                clear("message");
              }}
            />
            {err("message")}
          </div>

          <p className="ct-line">
            <label htmlFor={id("email")}>Write back to me at</label>{" "}
            <input {...blank("email")} type="email" className="blank" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />. {err("email")}
          </p>

          <div className="ct-sign" aria-hidden="true">
            <span className="mono muted">Yours,</span>
            <span className="ct-sign__name" data-empty={!name}>
              {name || "your name here"}
            </span>
          </div>

          <div className="brief__hp" aria-hidden="true">
            <input name="company_hp" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="ct-actions">
            <button type="submit" className="pill pill--solid pill--lg" disabled={status === "sending"}>
              <Roll>{status === "sending" ? "Folding…" : "Fold it & send"}</Roll>
              <span className="pill__arrow" aria-hidden="true">
                ↗
              </span>
            </button>
            <button type="button" className="ct-wipe mono" onClick={wipe}>
              Erase &amp; start over
            </button>
            <p role="alert" className="ct-err ct-err--send">
              {status === "error" ? `That didn’t go through. Try again, or write to ${site.email}.` : ""}
            </p>
          </div>
        </form>
        <div className="ct-wiper" aria-hidden="true">
          <i />
          <b>Erase</b>
        </div>
      </div>

      <div className="ct-env" aria-hidden="true">
        <div className="ct-env__back" />
        <div className="ct-env__front" />
        <div className="ct-env__flap" />
      </div>

      <div className="ct-done" role="status" aria-live="polite">
        {done && (
          <>
            <p className="mono muted">{status === "sent" ? "Posted" : "Ready in your email app"}</p>
            <p className="ct-done__big">{status === "sent" ? "It’s on its way." : "One more click."}</p>
            <p className="body">
              {status === "sent"
                ? `We read every letter ourselves and we’ll write back to ${email || "you"}.`
                : "Your email app has the letter ready. Press send there and it reaches us."}
            </p>
            <button type="button" className="pill" onClick={again}>
              <Roll>Write another</Roll>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
