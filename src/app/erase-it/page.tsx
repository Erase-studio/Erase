import type { Metadata } from "next";
import { DropIt } from "@/components/erase/DropIt";

export const metadata: Metadata = {
  title: "Erase your homepage",
  description:
    "Drop in a screenshot of the site you have today and rub it out with your own hand. Nothing is uploaded — it never leaves your browser.",
  alternates: { canonical: "/erase-it" },
};

export default function EraseItPage() {
  return (
    <main id="main">
      <DropIt />
    </main>
  );
}
