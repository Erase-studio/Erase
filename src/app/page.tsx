import { Hero } from "@/components/home/Hero";
import { Statement } from "@/components/home/Statement";
import { Crumple } from "@/components/home/Crumple";
import { WorkStack } from "@/components/home/WorkStack";
import { ServiceRows } from "@/components/home/ServiceRows";
import { ProcessPath } from "@/components/home/ProcessPath";
import { Dive } from "@/components/home/Dive";

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <Statement />
      <Crumple />
      <WorkStack />
      <ServiceRows />
      <ProcessPath />
      <Dive />
    </main>
  );
}
