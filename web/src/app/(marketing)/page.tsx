import { MarketingHeader } from "@/components/marketing/marketing-header";
import { Hero } from "@/components/marketing/hero";
import { ValueTriad } from "@/components/marketing/value-triad";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { FeatureSave } from "@/components/marketing/feature-save";
import { FeatureConnect } from "@/components/marketing/feature-connect";
import { FeatureGraph } from "@/components/marketing/feature-graph";
import { Pricing } from "@/components/marketing/pricing";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/footer";

// P14.S2 — the public `knowledge` landing at `/`. Composes the nine sections in
// band order: hero (dark) → what-it-is (paper) → how-it-works (sunken) → save &
// search (paper) → connect (dark) → graph (paper, recessed plate) → pricing
// (paper) → final CTA (dark) → footer (deep). Every section is a server
// component; the only client islands are the header (scroll state), the graph
// motif (canvas), and the <Reveal> scroll wrapper.
export default function LandingPage() {
  return (
    <>
      <MarketingHeader />
      <main id="main-content">
        <Hero />
        <ValueTriad />
        <HowItWorks />
        <FeatureSave />
        <FeatureConnect />
        <FeatureGraph />
        <Pricing />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
