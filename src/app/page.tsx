import { Hero } from "@/components/home/Hero";
import { Crumple } from "@/components/home/Crumple";
import { WorkStack } from "@/components/home/WorkStack";
import { ServiceRows } from "@/components/home/ServiceRows";
import { ProcessPath } from "@/components/home/ProcessPath";
import { Dive } from "@/components/home/Dive";

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <Crumple />
      <WorkStack />
      <ServiceRows limit={3} />
      <ProcessPath />
      <Dive />
    </main>
  );
}
