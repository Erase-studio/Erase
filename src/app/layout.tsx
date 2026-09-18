import type { Metadata, Viewport } from "next";
import { Geist_Mono, Mona_Sans } from "next/font/google";
import Script from "next/script";
import { site } from "@/content/site";
import { SmoothScroll } from "@/components/system/SmoothScroll";
import { Cursor } from "@/components/system/Cursor";
import { SoundDirector } from "@/components/system/SoundDirector";
import { PillFx } from "@/components/system/PillFx";
import { Loader } from "@/components/system/Loader";
import { PageTransition } from "@/components/system/PageTransition";
import { Nav } from "@/components/system/Nav";
import { RevealFx } from "@/components/system/RevealFx";
import { Footer } from "@/components/site/Footer";
import { Details } from "@/components/system/Details";
import { StageCanvas } from "@/components/stage/StageCanvas";
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
    default: "Erase: nothing generic survives here",
    template: "%s · Erase",
  },
  description: site.description,
  openGraph: {
    title: "Erase: nothing generic survives here",
    description: site.description,
    url: site.url,
    siteName: "Erase",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#ecebe6",
  colorScheme: "light",
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
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}.loader{display:none!important}`}</style>
        </noscript>
      </head>
      <body>
        {/* Decides motion and day/night before first paint; returning visitors get a shorter loader. */}
        <Script id="boot" strategy="beforeInteractive">
          {`(function(d){var r=matchMedia('(prefers-reduced-motion: reduce)').matches,s=false;try{s=sessionStorage.getItem('erase:seen')==='1'}catch(e){}if(!r)d.classList.add('motion');var t=null;try{t=localStorage.getItem('erase:theme')}catch(e){}d.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(s)d.classList.add('intro-skip')})(document.documentElement)`}
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
          <RevealFx />
        </PageTransition>
        <StageCanvas />
        <Details />
        <Loader />
        <SoundDirector />
        <PillFx />
        <div className="grain" aria-hidden="true" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
