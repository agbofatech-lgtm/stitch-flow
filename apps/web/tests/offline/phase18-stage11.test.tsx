/**
 * Phase 18 — Stage 11 Public Landing tests (PL namespace).
 * jsdom + RTL. The landing page is real and code-split; `navigate` is
 * mocked to the VERIFIED router contract (/login, /register public auth
 * routes). Asset existence is checked against public/ (manifest-governed).
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

const navigateMock = vi.fn();
vi.mock('@shared/router', () => ({ navigate: (...a: unknown[]) => navigateMock(...a) }));

import LandingPage from '../../src/public/LandingPage';
import { CANONICAL_STAGES, STAGE_META } from '../../src/design-system/Status';
import { WORKFLOW_STAGES } from '../../src/public/workflow';

const PUBLIC_DIR = path.resolve(__dirname, '../../public');

beforeEach(() => navigateMock.mockClear());
afterEach(cleanup);

const text = () => document.body.textContent ?? '';

describe('PL1/PL15 · Public route renders without the workspace shell', () => {
  it('renders header, hero, all seven acts and footer; no authenticated shell', () => {
    render(<LandingPage />);
    for (const hook of ['craft', 'complexity', 'intelligence', 'rhythm', 'material']) {
      expect(document.querySelector(`[data-landing="${hook}"]`)).toBeTruthy();
    }
    expect(document.querySelector('[data-shell="workspace"]')).toBeNull();
    expect(screen.getAllByRole('banner').length).toBeGreaterThan(0); // public header
    expect(screen.getByRole('contentinfo')).toBeTruthy(); // footer
  });
});

describe('PL2/PL3 · Hero CTA → verified auth routes', () => {
  it('primary CTA navigates to /register; secondary to /login', () => {
    render(<LandingPage />);
    const hero = within(screen.getByRole('main') as HTMLElement);
    fireEvent.click(hero.getAllByRole('button', { name: 'Start with StitchFlow' })[0]);
    expect(navigateMock).toHaveBeenCalledWith('/register');
    fireEvent.click(hero.getAllByRole('button', { name: 'Sign In' })[0]);
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });
  it('hero image is eager + high priority (LCP), intrinsic size (no shift)', () => {
    render(<LandingPage />);
    const img = document.querySelector('[data-landing="craft"]') // ensure render
      ? document.querySelector('main img') : document.querySelector('main img');
    const hero = Array.from(document.querySelectorAll('main img')).find((i) => (i.getAttribute('loading')) === 'eager');
    expect(hero).toBeTruthy();
    expect(hero!.getAttribute('fetchpriority')).toBe('high');
    expect(hero!.getAttribute('width')).toBeTruthy();
    expect(hero!.getAttribute('height')).toBeTruthy();
    expect(img).toBeTruthy();
  });
});

describe('PL4/PL14 · Navigation and footer resolve only to existing destinations', () => {
  it('header + footer navigate only to /login and /register', () => {
    render(<LandingPage />);
    for (const btn of Array.from(document.querySelectorAll('header button, footer button'))) {
      fireEvent.click(btn);
    }
    const calls = navigateMock.mock.calls.map((c) => c[0]);
    expect(new Set(calls)).toEqual(new Set(['/login', '/register']));
  });
});

describe('PL5/PL6 · Keyboard + reduced motion', () => {
  it('skip-to-content link exists; CTAs are real focusable buttons', () => {
    render(<LandingPage />);
    expect(screen.getByText('Skip to content')).toBeTruthy();
    for (const b of Array.from(document.querySelectorAll('main button'))) expect(b.tagName).toBe('BUTTON');
  });
  it('reduced motion: global CSS neutralizes animations; no video/autoplay exists', () => {
    render(<LandingPage />);
    expect(document.querySelectorAll('video').length).toBe(0);
    const css = fs.readFileSync(path.resolve(PUBLIC_DIR, '../src/index.css'), 'utf8');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toMatch(/animation-duration:\s*0\.01ms/);
  });
});

describe('PL7/PL8 · Image alt discipline', () => {
  it('every meaningful image has non-empty alt; decorative layers are aria-hidden', () => {
    render(<LandingPage />);
    const imgs = Array.from(document.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThan(4); // hero + craft ×3 + material ×4 + production
    for (const img of imgs) expect(img.getAttribute('alt')?.length ?? 0).toBeGreaterThan(10);
    // ambient hero grid + workflow spine are decorative:
    const decor = Array.from(document.querySelectorAll('[aria-hidden="true"]'));
    expect(decor.length).toBeGreaterThan(1);
  });
});

describe('PL9/PL29 · No fabricated metrics, testimonials or prohibited claims', () => {
  it('contains no fabricated social proof or SaaS-hype claims', () => {
    render(<LandingPage />);
    expect(text()).not.toMatch(/10,000|trusted by|4\.9|99\.99|testimonial|revolutioniz|disrupt|supercharge|game-chang|all-in-one/i);
    expect(text()).not.toMatch(/\b\d+\+?\s+(tailors|designers|users|studios|countries)/i);
  });
  it('never claims AI autonomy or guaranteed fit', () => {
    render(<LandingPage />);
    expect(text()).not.toMatch(/automatically (design|decid|creat|correct)|autonomous|guaranteed perfect|perfect fit guarantee|replaces the tailor/i);
  });
  it('intelligence language keeps the advisory boundary', () => {
    render(<LandingPage />);
    expect(text()).toContain('Intelligence that knows when not to decide for you');
    expect(text()).toContain('never changes a measurement');
    expect(text()).toContain('leaves every decision with you');
  });
});

describe('PL10 · Workflow claims map to implemented concepts (Stages 7–10)', () => {
  it('journey chapters are exactly the five verified capabilities', () => {
    expect(WORKFLOW_STAGES.map((s) => s.id)).toEqual(['customer', 'garment', 'context', 'production', 'finance']);
    render(<LandingPage />);
    for (const s of WORKFLOW_STAGES) {
      expect(document.getElementById(`stage-${s.id}`)).toBeTruthy();
      expect(text()).toContain(s.title);
    }
  });
});

describe('PL12 · Production rhythm uses the canonical repository sequence', () => {
  it('renders all nine canonical stages, in order, from CANONICAL_STAGES', () => {
    render(<LandingPage />);
    const rendered = Array.from(document.querySelectorAll('[data-canonical-stages] [data-stage]'))
      .map((el) => el.getAttribute('data-stage'));
    expect(rendered).toEqual([...CANONICAL_STAGES]);
    for (const code of CANONICAL_STAGES) {
      expect(document.querySelector(`[data-canonical-stages] [data-stage="${code}"]`)!.textContent).toContain(STAGE_META[code].label);
    }
  });
});

describe('PL17/PL18 · Assets exist locally; no external runtime imagery', () => {
  it('every referenced image file exists in public/ (manifest-governed)', () => {
    render(<LandingPage />);
    const srcs = [
      ...Array.from(document.querySelectorAll('img')).map((i) => i.getAttribute('src') ?? ''),
      ...Array.from(document.querySelectorAll('source')).flatMap((s) => (s.getAttribute('srcset') ?? '').split(', ').map((x) => x.trim())),
    ].filter(Boolean);
    expect(srcs.length).toBeGreaterThan(8);
    for (const src of srcs) {
      expect(src.startsWith('/')).toBe(true); // relative only
      expect(fs.existsSync(path.join(PUBLIC_DIR, src))).toBe(true);
    }
  });
  it('no external/remote image dependencies are introduced', () => {
    render(<LandingPage />);
    for (const attr of ['src', 'srcset']) {
      for (const el of Array.from(document.querySelectorAll(`[${attr}]`))) {
        expect(el.getAttribute(attr)).not.toMatch(/^https?:\/\//);
      }
    }
  });
});
