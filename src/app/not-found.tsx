import { PageHead } from "@/components/site/PageHead";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main">
      <PageHead index="(404) Not found" title="Erased" scene="template" lede="This page doesn’t exist, or it did and we removed it. The homepage is still here.">
        <TransitionLink href="/" title="Home" className="pill pill--solid">
          <Roll>Back to the homepage</Roll>
          <span className="pill__arrow" aria-hidden="true">
            →
          </span>
        </TransitionLink>
      </PageHead>
    </main>
  );
}
