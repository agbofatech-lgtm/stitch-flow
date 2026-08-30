/**
 * Phase 12 — Cinematic Public Experience (code-split; default export for
 * React.lazy in App.tsx). Native scrolling, IO-driven reveals, Phase 11
 * tokens/motion only. No authenticated modules imported here.
 */
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { HeroSection } from './sections/HeroSection';
import { CraftSection } from './sections/CraftSection';
import { NarrativeIntro } from './sections/NarrativeIntro';
import { IntelligenceSection } from './sections/IntelligenceSection';
import { WorkflowSections } from './sections/WorkflowSection';
import { ProductionRhythmSection } from './sections/ProductionRhythmSection';
import { MaterialSection } from './sections/MaterialSection';
import { FinalCTASection } from './sections/FinalCTASection';
import { WorkflowProgress } from './components/WorkflowProgress';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ivory">
      <PublicHeader />
      <WorkflowProgress />
      <main id="main">
        {/* Stage 11 cinematic acts: craft → complexity → intelligence →
            journey → rhythm → material → invitation. */}
        <HeroSection />
        <CraftSection />
        <NarrativeIntro />
        <IntelligenceSection />
        <WorkflowSections />
        <ProductionRhythmSection />
        <MaterialSection />
        <FinalCTASection />
      </main>
      <PublicFooter />
    </div>
  );
}
