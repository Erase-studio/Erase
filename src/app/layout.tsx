import type { Metadata, Viewport } from "next";
import { Geist_Mono, Mona_Sans } from "next/font/google";
import { site } from "@/content/site";
import { SmoothScroll } from "@/components/system/SmoothScroll";
import { Cursor } from "@/components/system/Cursor";
import { Wash } from "@/components/system/Wash";
import { SoundDirector } from "@/components/system/SoundDirector";
import { Loader } from "@/components/system/Loader";
import { PageTransition } from "@/components/system/PageTransition";
import { Nav } from "@/components/system/Nav";
import { RevealFx } from "@/components/system/RevealFx";
import { Footer } from "@/components/site/Footer";
import { NextDoor } from "@/components/site/NextDoor";
import { Ticks } from "@/components/system/Ticks";
import { Flags } from "@/components/system/Flags";
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
    template: "%s | Erase",
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

/**
 * The site opens at night, so the browser chrome does too. ThemeToggle rewrites
 * the meta tag when you turn the lights on, and the boot script below fixes it
 * for anyone whose last visit ended in daylight.
 */
export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark light",
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

const BOOT = `(function(d){var r=false,s=false,t=null;try{r=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}try{s=sessionStorage.getItem('erase:seen')==='1'}catch(e){}if(!r)d.classList.add('motion');try{t=localStorage.getItem('erase:theme')}catch(e){}d.dataset.theme=t||'dark';if(s)d.classList.add('intro-skip')})(document.documentElement)`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${mona.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Decides motion and day/night before anything is painted. It has to be a
          plain inline script in the head: handed to next/script it runs only once
          the framework has loaded, and until then (or if that is ever delayed)
          every pinned scene on the page sits in its no-motion layout.
        */}
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}.loader{display:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Flags />
        <SmoothScroll />
        <Wash />
        <Ticks />
        <Cursor />
        <PageTransition>
          <Nav />
          {children}
          <Footer />
          <NextDoor />
          <RevealFx />
        </PageTransition>
        <StageCanvas />
        <Details />
        <Loader />
        <SoundDirector />
        <div className="grain" aria-hidden="true" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
