"use client";

import { useState, useSyncExternalStore } from "react";
import { site } from "@/content/site";

/** Things next to the letter: the address (copy it), and what time it is here. */
export function Desk() {
  const [copied, setCopied] = useState(false);
  // The clock ticks every 20 s; the server renders it blank.
  const stamp = useSyncExternalStore(
    (cb) => {
      const t = window.setInterval(cb, 20000);
      return () => window.clearInterval(t);
    },
    () => Math.floor(Date.now() / 20000),
    () => 0,
  );
  const now = stamp ? new Date(stamp * 20000) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${site.email}`;
    }
  };

  const tz = "Asia/Kathmandu";
  const time = now ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(now) : "--:--";
  const hour = now ? Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(now)) : 12;
  const awake = hour >= 8 && hour < 23;

  return (
    <dl className="ct-desk">
      <div>
        <dt className="mono muted">Or just email</dt>
        <dd>
          <a href={`mailto:${site.email}`} className="ct-desk__mail">
            {site.email}
          </a>
          <button type="button" className="ct-desk__copy mono" onClick={copy} aria-live="polite">
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </dd>
      </div>
      <div>
        <dt className="mono muted">Time in {site.based}</dt>
        <dd>
          <span className="ct-desk__time">{time}</span>
          <span className="muted">{awake ? "We’re probably at our desks." : "We’re probably asleep. It’ll be the first thing we read."}</span>
        </dd>
      </div>
      <div>
        <dt className="mono muted">Then</dt>
        <dd>A short call, a clear proposal, then we start.</dd>
      </div>
    </dl>
  );
}
