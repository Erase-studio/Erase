import type { Metadata } from "next";
import { PageHead } from "@/components/site/PageHead";
import { WorkList } from "@/components/site/WorkList";

export const metadata: Metadata = {
  title: "Work",
  description: "Websites designed and built by Erase: our own studio site and concept studies that show our range.",
  alternates: { canonical: "/work" },
};

export default function WorkIndexPage() {
  return (
    <main id="main">
      <PageHead
        index="(Index) Work"
        title="Work"
        lede="Our own site, and concept studies we designed and built to show range. Concepts are always labelled as concepts."
      />
      <WorkList />
    </main>
  );
}
