"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Rubbable } from "./Rubbable";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";
import { drawTemplate, TEMPLATE_BG } from "@/lib/stage/drawTemplate";
import { sound } from "@/lib/sound";

/**
 * Erase your homepage.
 *
 * Drop in a screenshot of the site you have now and rub it off with your own
 * hand. Underneath is the question we'd have asked in the first meeting.
 *
 * Nothing is uploaded: the file is read by the browser, drawn to a canvas and
 * forgotten when the tab closes. There is no server here to send it to.
 */

type Shot = { src: HTMLImageElement | null; name: string; seed: number };

export function DropIt() {
  const [shot, setShot] = useState<Shot | null>(null);
  const [over, setOver] = useState(false);
  const [gone, setGone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const take = useCallback((file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    const img = new Image();
    img.onload = () => {
      sound.pageTurn(1);
      setGone(false);
      setShot({ src: img, name: file.name, seed: 0 });
    };
    img.src = url;
  }, []);

  /** For anyone without a screenshot handy: one of ours, freshly generated. */
  const example = () => {
    sound.pageTurn(1);
    setGone(false);
    setShot({ src: null, name: "a website that already exists", seed: Math.floor(Math.random() * 9999) + 1 });
  };

  const paint = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.fillStyle = TEMPLATE_BG;
      ctx.fillRect(0, 0, w, h);
      const img = shot?.src;
      if (!img) {
        drawTemplate(ctx, w, h, 1, shot?.seed ?? 1);
        return;
      }
      // Cover the sheet, anchored to the top: a homepage is read from the top.
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      ctx.drawImage(img, (w - dw) / 2, 0, dw, dh);
    },
    [shot],
  );

  return (
    <section className="drop frame" aria-labelledby="drop-title" data-sound="crumple">
      <header className="drop__head">
        <p className="mono muted" data-reveal="fade">
          (Try it) Your homepage
        </p>
        <h1 id="drop-title" className="drop__title" data-warp data-reveal="lines">
          Erase your homepage.
        </h1>
        <p className="lede drop__lede" data-reveal="fade" data-delay="0.3">
          Drop in a screenshot of the site you have today, then rub it out with your own hand. Whatever is still worth keeping, you’ll
          know by the end of it.
        </p>
      </header>

      {!shot ? (
        <div
          className="drop__zone"
          data-over={over}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            take(e.dataTransfer.files?.[0]);
          }}
        >
          <p className="drop__big">Drop a screenshot here</p>
          <p className="mono muted">PNG or JPG. It never leaves this browser</p>
          <div className="drop__acts">
            <button type="button" className="pill pill--solid" onClick={() => inputRef.current?.click()}>
              <Roll>Choose a file</Roll>
              <i className="pill__dot" aria-hidden="true" />
            </button>
            <button type="button" className="pill" onClick={example}>
              <Roll>I don’t have one</Roll>
              <i className="pill__dot" aria-hidden="true" />
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Screenshot of your homepage"
            onChange={(e) => take(e.target.files?.[0])}
          />
        </div>
      ) : (
        <>
          <Rubbable className="drop__sheet" paint={paint} onClear={() => setGone(true)} label="Rub it out" strength={0.28}>
            <div className="drop__under">
              <p className="drop__ask">So — what’s actually worth keeping?</p>
              <p className="mono muted">That’s the first question we’d ask you anyway.</p>
            </div>
          </Rubbable>

          <div className="drop__foot" data-gone={gone}>
            <div className="drop__acts">
              {/* Offered once there's room for it, not over the thing you're using. */}
              <TransitionLink href="/contact" title="Contact" className="pill pill--solid drop__cta">
                <Roll>Write to us</Roll>
                <i className="pill__dot" aria-hidden="true" />
              </TransitionLink>
              <button
                type="button"
                className="pill"
                onClick={() => {
                  setShot(null);
                  setGone(false);
                }}
              >
                <Roll>Start over</Roll>
                <i className="pill__dot" aria-hidden="true" />
              </button>
              <button type="button" className="pill" onClick={example}>
                <Roll>Try one of ours</Roll>
                <i className="pill__dot" aria-hidden="true" />
              </button>
            </div>
            <p className="mono muted drop__meta">{gone ? "Gone. That was the easy part." : shot.name}</p>
          </div>
        </>
      )}

      <p className="mono muted drop__privacy">
        No upload, no server, no copy. The file is read by your own browser, drawn onto a canvas, and forgotten the moment you close
        the tab.
      </p>
    </section>
  );
}
