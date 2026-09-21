"use client";

import { useState, useSyncExternalStore } from "react";
import { site } from "@/content/site";
import { Roll } from "@/components/ui/Roll";

/** Next to the letter: the address (copy it) and what time it is here. */
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
    <div className="ct-desk">
      <p className="ct-desk__row">
        <span className="mono muted">Or email</span>
        <a href={`mailto:${site.email}`} className="ct-desk__mail">
          <Roll>{site.email}</Roll>
        </a>
        <button type="button" className="ct-desk__copy mono" onClick={copy} aria-live="polite">
          <Roll>{copied ? "Copied" : "Copy"}</Roll>
        </button>
      </p>
      <p className="ct-desk__row">
        <span className="mono muted">{site.based}</span>
        <span className="ct-desk__time">{time}</span>
        <span className="ct-desk__note mono" data-awake={awake}>
          {awake ? "Probably at our desks" : "Asleep. First thing we read"}
        </span>
      </p>
    </div>
  );
}
