import { MarketingHeader } from "@/components/marketing/marketing-header";
import { Hero } from "@/components/marketing/hero";
import { ValueTriad } from "@/components/marketing/value-triad";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { FeatureSave } from "@/components/marketing/feature-save";
import { FeatureConnect } from "@/components/marketing/feature-connect";
import { AgentQuickstart } from "@/components/marketing/agent-quickstart";
import { FeatureSkill } from "@/components/marketing/feature-skill";
import { FeatureGraph } from "@/components/marketing/feature-graph";
import { Pricing } from "@/components/marketing/pricing";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/footer";

// P14.S2 — the public `knowledge` landing at `/`. Composes the sections in band
// order: hero (dark) → what-it-is (paper) → how-it-works (sunken) → save & search
// (paper) → connect (dark) → agent-quickstart (dark, one continuous "built for
// agents" territory with Connect, hairline-divided) → the-skill (sunken) → graph
// (paper, recessed plate) → pricing (paper) → final CTA (dark) → footer (deep).
// The two onboarding sections are P20.S3 (round-02 design). Every section is a
// server component; the only client islands are the header (scroll state), the
// graph motif (canvas), the copy controls + skill-pane expand, and the <Reveal>
// scroll wrapper.
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
        <AgentQuickstart />
        <FeatureSkill />
        <FeatureGraph />
        <Pricing />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
