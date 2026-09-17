import type { ReactNode } from "react";
import type { SceneId } from "@/lib/world/scenes";

/** Opening screen of an inner page: a label, one very large word, a line of context. */
export function PageHead({
  index,
  title,
  lede,
  scene,
  children,
}: {
  index: string;
  title: string;
  lede?: string;
  scene: SceneId;
  children?: ReactNode;
}) {
  return (
    <header className="ph frame" data-scene={scene}>
      <p className="mono muted" data-reveal="fade" data-delay="0.2">
        {index}
      </p>
      <h1 className="ph__title" data-reveal="lines" data-delay="0.1">
        {title}
      </h1>
      <div className="ph__row">
        {lede && (
          <p className="lede ph__lede" data-reveal="fade" data-delay="0.35">
            {lede}
          </p>
        )}
        {children && (
          <div className="ph__aside" data-reveal="fade" data-delay="0.45">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
