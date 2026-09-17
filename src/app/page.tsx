import { Hero } from "@/components/home/Hero";
import { Manifesto } from "@/components/home/Manifesto";
import { StudioIntro } from "@/components/home/StudioIntro";
import { WorkGallery } from "@/components/home/WorkGallery";
import { ServiceRows } from "@/components/home/ServiceRows";
import { ProcessPath } from "@/components/home/ProcessPath";

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <Manifesto />
      <StudioIntro />
      <WorkGallery />
      <ServiceRows />
      <ProcessPath />
    </main>
  );
}
