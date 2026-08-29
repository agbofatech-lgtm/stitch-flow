import type { ReactNode } from 'react';
import { WORKFLOW_STAGES, type WorkflowStage } from '../workflow';
import { useInView } from '../hooks/useInView';
import { MeasureArt, DesignArt, PatternArt, ProduceArt, ManageArt } from '../components/StageIllustrations';

const ART: Record<string, ReactNode> = {
  measure: <MeasureArt />,
  design: <DesignArt />,
  pattern: <PatternArt />,
  produce: <ProduceArt />,
  manage: <ManageArt />,
};

function Stage({ stage, flip }: { stage: WorkflowStage; flip: boolean }) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section ref={ref} id={`stage-${stage.id}`} aria-labelledby={`stage-${stage.id}-title`} className="relative scroll-mt-24">
      <div className={`mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:gap-16 ${inView ? 'sf-rise-enter' : 'opacity-0'}`}>
        <div className={flip ? 'md:order-2' : ''}>
          <p className="font-mono text-xs font-semibold text-gold-dark">{stage.index}</p>
          <h2 id={`stage-${stage.id}-title`} className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {stage.title}
          </h2>
          <p className="mt-5 text-base text-ink">{stage.happens}</p>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">{stage.matters}</p>
          <p className="mt-4 border-l-2 border-gold pl-4 text-sm font-medium text-ink-soft">{stage.helps}</p>
        </div>
        <div className={`${flip ? 'md:order-1' : ''} rounded-card border border-line bg-surface p-6 shadow-e1`}>
          {ART[stage.id]}
        </div>
      </div>
    </section>
  );
}

/** Phase 12 — the sequential Measure→Manage narrative with a connecting spine. */
export function WorkflowSections() {
  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-gold/50 to-transparent md:block" />
      {WORKFLOW_STAGES.map((s, i) => (
        <Stage key={s.id} stage={s} flip={i % 2 === 1} />
      ))}
    </div>
  );
}
