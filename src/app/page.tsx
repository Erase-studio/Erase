import { Hero } from "@/components/chapters/Hero";
import { Tapes } from "@/components/chapters/Tapes";
import { Statement } from "@/components/agency/Statement";
import { ServicesGrid } from "@/components/agency/ServicesGrid";
import { Proof } from "@/components/chapters/Proof";
import { Vocabulary } from "@/components/chapters/Vocabulary";
import { Process } from "@/components/chapters/Process";
import { Engagements } from "@/components/agency/Engagements";
import { Faq } from "@/components/agency/Faq";
import { Contact } from "@/components/chapters/Contact";

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <Tapes />
      <Statement />
      <ServicesGrid />
      <Proof />
      <Vocabulary />
      <Process />
      <Engagements />
      <Faq />
      <Contact />
    </main>
  );
}
