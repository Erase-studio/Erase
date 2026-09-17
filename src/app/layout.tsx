import type { Metadata, Viewport } from "next";
import { Geist_Mono, Mona_Sans } from "next/font/google";
import Script from "next/script";
import { site } from "@/content/site";
import { SmoothScroll } from "@/components/system/SmoothScroll";
import { Cursor } from "@/components/system/Cursor";
import { Loader } from "@/components/system/Loader";
import { PageTransition } from "@/components/system/PageTransition";
import { Nav } from "@/components/system/Nav";
import { ChapterFx } from "@/components/system/ChapterFx";
import { Footer } from "@/components/chapters/Footer";
import { Details } from "@/components/system/Details";
import { EraserStage } from "@/components/three/EraserStage";
import "./globals.css";

const mona = Mona_Sans({
  variable: "--font-mona",
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Erase: websites with nothing generic left",
    template: "%s · Erase",
  },
  description: site.description,
  openGraph: {
    title: "Erase: websites with nothing generic left",
    description: site.description,
    url: site.url,
    siteName: "Erase",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#111213",
  colorScheme: "dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: site.name,
  url: site.url,
  email: site.email,
  description: site.description,
  areaServed: "Worldwide",
  knowsAbout: ["Web design", "Web development", "Interaction design"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${mona.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <noscript>
          <style>{`.erase-veil{display:none!important}.reveal-line>span{transform:none!important}[data-hero-in]{opacity:1!important}`}</style>
        </noscript>
      </head>
      <body>
        {/* Decides motion and whether to replay the intro before first paint. */}
        <Script id="boot" strategy="beforeInteractive">
          {`(function(d){var r=matchMedia('(prefers-reduced-motion: reduce)').matches,s=false;try{s=sessionStorage.getItem('erase:seen')==='1'}catch(e){}if(!r)d.classList.add('motion');if(r||s){d.classList.add('intro-skip');d.dataset.intro='done'}else d.dataset.intro='template'})(document.documentElement)`}
        </Script>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SmoothScroll />
        <Cursor />
        <PageTransition>
          <Nav />
          {children}
          <Footer />
          <ChapterFx />
        </PageTransition>
        <Details />
        <EraserStage />
        <Loader />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
