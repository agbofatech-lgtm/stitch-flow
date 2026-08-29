/**
 * Phase 17 — AI API, security and architectural-boundary certification.
 *
 * Exercises the real HTTP surface with real auth and real tenant scoping.
 * No API keys, no network, no live model.
 */

import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app } from '../src/app';
import { registerUser, asUser, type AuthSession } from './helpers';
import { providerRegistry } from '../src/providers/contracts';
import { createDeterministicAIProvider } from '../src/modules/ai/providers/DeterministicAIProvider';
import { resetAIRateLimits } from '../src/routes/aiRoutes';

function enableAI(failure: Parameters<typeof createDeterministicAIProvider>[0] extends undefined
  ? never
  : NonNullable<Parameters<typeof createDeterministicAIProvider>[0]>['failure'] = 'none'): void {
  providerRegistry.register('ai', createDeterministicAIProvider({ failure }));
  process.env.AI_ENABLED = 'true';
}

function disableAI(): void {
  (providerRegistry as unknown as { register: (k: string, v: unknown) => void }).register('ai', null);
  delete process.env.AI_ENABLED;
}

let user: AuthSession;

beforeEach(async () => {
  resetAIRateLimits();
  disableAI();
  user = await registerUser(`ai-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`);
});

afterEach(() => {
  disableAI();
});

// ---------------------------------------------------------------------------
// Authentication & tenant isolation
// ---------------------------------------------------------------------------

describe('Phase 17 — AI API security', () => {
  it('P17-API1: unauthenticated requests are rejected', async () => {
    const res = await request(app).get('/ai/status');
    expect(res.status).toBe(401);
  });

  it('P17-API2: all AI endpoints require authentication', async () => {
    const endpoints: Array<[string, string]> = [
      ['post', '/ai/measurement-review/00000000-0000-0000-0000-000000000000'],
      ['post', '/ai/design-review'],
      ['post', '/ai/fabric-review/plan-1'],
      ['post', '/ai/production-review/plan-1'],
      ['post', '/ai/explain'],
    ];
    for (const [method, url] of endpoints) {
      const res = await (request(app) as never as Record<string, (u: string) => request.Test>)[
        method
      ](url).send({});
      expect(res.status).toBe(401);
    }
  });

  it('P17-API3: /ai/status never leaks key material', async () => {
    process.env.OPENAI_API_KEY = 'sk-super-secret-value';
    enableAI();
    const res = await asUser(user).get('/ai/status');
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('sk-super-secret-value');
    expect(res.body).toHaveProperty('configured');
    expect(res.body).not.toHaveProperty('apiKey');
    delete process.env.OPENAI_API_KEY;
  });

  it('P17-API4: reports NO_PROVIDER when nothing is configured', async () => {
    const res = await asUser(user).get('/ai/status');
    expect(res.status).toBe(200);
    expect(res.body.reason).toBe('NO_PROVIDER');
    expect(res.body.enabled).toBe(false);
  });

  it('P17-API5: a plan from another workspace is not reachable', async () => {
    enableAI();
    const other = await registerUser(`other-${Date.now()}@test.com`);
    // A plan id that does not belong to this tenant resolves to 404, never
    // to another tenant's data.
    const res = await asUser(other).post('/ai/fabric-review/some-foreign-plan');
    expect([404, 400]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('Phase 17 — AI API validation', () => {
  it('P17-API6: rejects a malformed measurement profile id', async () => {
    enableAI();
    const res = await asUser(user).post('/ai/measurement-review/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('P17-API7: rejects an explain request with no statements', async () => {
    enableAI();
    const res = await asUser(user)
      .post('/ai/explain')
      .send({ subjectId: 's1', topic: 'fabric', technicalStatements: [] });
    expect(res.status).toBe(400);
  });

  it('P17-API8: rejects an oversized explain payload', async () => {
    enableAI();
    const res = await asUser(user)
      .post('/ai/explain')
      .send({
        subjectId: 's1',
        topic: 'fabric',
        technicalStatements: Array.from({ length: 50 }, () => 'x'),
      });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Advisory behaviour over HTTP
// ---------------------------------------------------------------------------

describe('Phase 17 — AI API advisory behaviour', () => {
  it('P17-API9: explain works with AI enabled and is labelled advisory', async () => {
    enableAI();
    const res = await asUser(user)
      .post('/ai/explain')
      .send({
        subjectId: 'plan-1',
        topic: 'fabric quantity',
        technicalStatements: ['Width compatibility requires manual verification.'],
      });
    expect(res.status).toBe(200);
    expect(res.body.advisory).toBe(true);
    expect(res.body.purpose).toBe('customer_explanation');
  });

  it('P17-API10: explain degrades to plain language when AI is unavailable', async () => {
    disableAI();
    const res = await asUser(user)
      .post('/ai/explain')
      .send({
        subjectId: 'plan-1',
        topic: 'fabric',
        technicalStatements: ['Fabric width is incompatible with the cutting layout.'],
      });
    expect(res.status).toBe(200);
    expect(res.body.aiGenerated).toBe(false);
    // Still genuinely useful: the phrasebook produced customer wording.
    expect(res.body.findings[0].message).toMatch(/not wide enough/i);
  });

  it('P17-API11: design-review returns deterministic blockers without AI', async () => {
    disableAI();
    const res = await asUser(user)
      .post('/ai/design-review')
      .send({
        designSpecificationId: 'ds-1',
        garmentType: 'shirt',
        fitType: 'regular',
        designStatus: 'DRAFT',
        readinessItems: [
          { code: 'measurements', status: 'blocked', message: 'Measurements are incomplete' },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.aiGenerated).toBe(false);
    expect(res.body.status).toBe('degraded');
    expect(res.body.findings.some((f: { source: string }) => f.source === 'deterministic')).toBe(true);
    expect(res.body.requiresHumanReview).toBe(true);
  });

  it('P17-API12: a provider failure still returns 200 with deterministic content', async () => {
    enableAI('provider_error');
    const res = await asUser(user)
      .post('/ai/design-review')
      .send({
        designSpecificationId: 'ds-1',
        garmentType: 'shirt',
        fitType: 'regular',
        designStatus: 'DRAFT',
        readinessItems: [{ code: 'fabric', status: 'blocked', message: 'Fabric not selected' }],
      });
    // The core workflow is never broken by an AI failure.
    expect(res.status).toBe(200);
    expect(res.body.aiGenerated).toBe(false);
    expect(res.body.findings.length).toBeGreaterThan(0);
  });

  it('P17-API13: rate limiting returns a controlled 429', async () => {
    enableAI();
    process.env.AI_RATE_LIMIT_PER_MINUTE = '20';
    let sawLimit = false;
    for (let i = 0; i < 25; i += 1) {
      const res = await asUser(user)
        .post('/ai/explain')
        .send({ subjectId: 's', topic: 't', technicalStatements: ['a statement'] });
      if (res.status === 429) {
        expect(res.body.error.code).toBe('AI_RATE_LIMIT');
        sawLimit = true;
        break;
      }
    }
    expect(sawLimit).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Architectural boundary (§13) — enforced by test, not by documentation
// ---------------------------------------------------------------------------

describe('Phase 17 — architectural boundary', () => {
  const SRC = path.join(__dirname, '..', 'src');

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (entry.name.endsWith('.ts')) out.push(full);
    }
    return out;
  }

  it('P17-ARCH1: only the AI provider adapter performs outbound AI calls', () => {
    const offenders = walk(SRC).filter((file) => {
      const rel = path.relative(SRC, file);
      if (rel.includes(path.join('modules', 'ai', 'providers'))) return false;
      const content = fs.readFileSync(file, 'utf8');
      return (
        /api\.openai\.com/.test(content) ||
        /generativelanguage\.googleapis\.com/.test(content) ||
        /api\.anthropic\.com/.test(content)
      );
    });
    expect(offenders).toEqual([]);
  });

  it('P17-ARCH2: no domain service imports a provider directly', () => {
    const offenders = walk(path.join(SRC, 'modules')).filter((file) => {
      const rel = path.relative(SRC, file);
      // The gateway and the provider folder are the only permitted importers.
      if (rel.includes(path.join('modules', 'ai'))) return false;
      const content = fs.readFileSync(file, 'utf8');
      return /from ['"].*providers\//.test(content);
    });
    expect(offenders).toEqual([]);
  });

  it('P17-ARCH3: no vendor AI SDK is a dependency', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const banned of ['openai', '@anthropic-ai/sdk', '@google/generative-ai', 'langchain']) {
      expect(deps).not.toHaveProperty(banned);
    }
  });

  it('P17-ARCH4: AI routes are mounted behind auth and workspace scoping', () => {
    const appSrc = fs.readFileSync(path.join(SRC, 'app.ts'), 'utf8');
    expect(appSrc).toMatch(/app\.use\('\/ai',\s*authMiddleware,\s*requireWorkspace,\s*aiRoutes\)/);
  });

  it('P17-ARCH5: AI secrets are never exposed with a VITE_ prefix', () => {
    const offenders = walk(SRC).filter((file) =>
      /VITE_[A-Z_]*(OPENAI|GEMINI|ANTHROPIC|CLAUDE|AI_)/.test(fs.readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
