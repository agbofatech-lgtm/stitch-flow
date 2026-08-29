/**
 * Phase 12 — Cinematic Public Experience (code-split; default export for
 * React.lazy in App.tsx). Native scrolling, IO-driven reveals, Phase 11
 * tokens/motion only. No authenticated modules imported here.
 */
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { HeroSection } from './sections/HeroSection';
import { NarrativeIntro } from './sections/NarrativeIntro';
import { WorkflowSections } from './sections/WorkflowSection';
import { FinalCTASection } from './sections/FinalCTASection';
import { WorkflowProgress } from './components/WorkflowProgress';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ivory">
      <PublicHeader />
      <WorkflowProgress />
      <main id="main">
        <HeroSection />
        <NarrativeIntro />
        <WorkflowSections />
        <FinalCTASection />
      </main>
      <PublicFooter />
    </div>
  );
}
