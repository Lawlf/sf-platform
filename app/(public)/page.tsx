import {
  FaqJsonLd,
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
  WebSiteJsonLd,
} from "./_components/json-ld";
import { LandingFaq } from "./_components/landing-faq";
import { LandingFeatures } from "./_components/landing-features";
import { LandingFinalCta } from "./_components/landing-final-cta";
import { LandingFooter } from "./_components/landing-footer";
import { LandingFounder } from "./_components/landing-founder";
import { LandingHeader } from "./_components/landing-header";
import { LandingHero } from "./_components/landing-hero";
import { LandingHow } from "./_components/landing-how";
import { LandingPillars } from "./_components/landing-pillars";
import { LandingPricing } from "./_components/landing-pricing";
import { LandingPrivacy } from "./_components/landing-privacy";

export default function HomePage() {
  return (
    <div className="relative isolate min-h-screen bg-warm-gradient">
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <SoftwareApplicationJsonLd />
      <FaqJsonLd />
      <div aria-hidden className="bg-blob-top-right" />
      <div aria-hidden className="bg-blob-bottom-left" />
      <div aria-hidden className="bg-blob-mid" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-dots opacity-60"
      />

      <LandingHeader />
      <main className="relative">
        <LandingHero />
        <LandingPillars />
        <LandingFeatures />
        <LandingHow />
        <LandingPrivacy />
        <LandingPricing />
        <LandingFounder />
        <LandingFaq />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
