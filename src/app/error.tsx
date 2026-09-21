"use client";

import { useEffect } from "react";
import { PageHead } from "@/components/site/PageHead";
import { Roll } from "@/components/ui/Roll";

/**
 * Something broke inside a page. The nav, footer and everything around it
 * still work, so this only has to say so plainly and offer another go.
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main">
      <PageHead
        index="(Error) Something slipped"
        title="Smudged"
        lede="Part of this page didn’t draw properly. It’s our fault, not yours — try it again, and if it keeps happening, write and tell us."
      >
        <button type="button" className="pill pill--solid" onClick={() => retry()}>
          <Roll>Try again</Roll>
          <i className="pill__dot" aria-hidden="true" />
        </button>
        {error.digest && <p className="mono muted">Ref {error.digest}</p>}
      </PageHead>
    </main>
  );
}
