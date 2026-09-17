import type { Metadata } from "next";
import { PageHeader } from "@/components/agency/PageHeader";
import { WorkIndex } from "@/components/agency/WorkIndex";
import { CtaBand } from "@/components/agency/CtaBand";

export const metadata: Metadata = {
  title: "Work",
  description: "Websites designed and built by Erase: live projects and concept studies.",
  alternates: { canonical: "/work" },
};

export default function WorkPage() {
  return (
    <main id="main">
      <PageHeader
        crumb="Work"
        title="Work."
        intro="Websites we’ve designed and built. Live projects, and concept studies that show how we think."
      />
      <WorkIndex />
      <CtaBand title="Your website could be next." />
    </main>
  );
}
