import type { Metadata } from "next";
import { PageHead } from "@/components/site/PageHead";
import { WorkList } from "@/components/site/WorkList";

export const metadata: Metadata = {
  title: "Work",
  description: "Websites and products designed and built by Erase: a Niagara Falls restaurant, civic complaints, farming, telehealth and exam prep.",
  alternates: { canonical: "/work" },
};

export default function WorkIndexPage() {
  return (
    <main id="main">
      <PageHead
        index="(Index) Work"
        title="Work"
        lede="Client sites and products we designed and built, from a Niagara Falls kitchen to a ward office’s complaint desk. Live ones are one click away."
      />
      <WorkList />
    </main>
  );
}
