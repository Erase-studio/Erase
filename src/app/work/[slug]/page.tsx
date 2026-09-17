import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { work } from "@/content/work";
import { cases } from "@/content/cases";
import { CaseStudy } from "@/components/case/CaseStudy";

export function generateStaticParams() {
  return work.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = work.find((w) => w.slug === slug);
  if (!item) return {};
  return {
    title: `${item.title}: ${item.sector}`,
    description: cases[slug]?.lede ?? item.brief,
    alternates: { canonical: `/work/${slug}` },
  };
}

export default async function WorkPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const index = work.findIndex((w) => w.slug === slug);
  const data = cases[slug];
  if (index < 0 || !data) notFound();
  const item = work[index];
  const next = work[(index + 1) % work.length];

  return (
    <main id="main">
      <CaseStudy item={item} data={data} next={next} index={index} />
    </main>
  );
}
