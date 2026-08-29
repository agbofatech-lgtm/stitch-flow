/**
 * Phase 17 — AI provider selection and registration.
 *
 * This is the ONLY place that decides which AI provider is active. It
 * mirrors the proven house pattern in `src/billing/providers` (a
 * `BillingProvider` interface, a `TestBillingProvider` double, and live
 * implementations chosen by config).
 *
 * Providers are REPLACEABLE INFRASTRUCTURE: swapping OpenAI for Gemini is a
 * configuration change and touches no domain code.
 *
 * SECRETS (§24): API keys are read from server-only environment variables.
 * They are never bundled to the browser, never logged, never persisted, and
 * never returned in an API response.
 */

import { providerRegistry, type AIProvider } from '../../../providers/contracts';
import { createDeterministicAIProvider } from './DeterministicAIProvider';
import { createHttpAIProvider, type HttpProviderConfig } from './HttpAIProvider';

export type AIProviderKind = 'none' | 'deterministic' | 'openai' | 'gemini' | 'claude';

/** Which provider the deployment has selected. Defaults to `none`. */
export function configuredProviderKind(): AIProviderKind {
  const raw = (process.env.AI_PROVIDER ?? 'none').trim().toLowerCase();
  switch (raw) {
    case 'deterministic':
    case 'test':
      return 'deterministic';
    case 'openai':
      return 'openai';
    case 'gemini':
    case 'google':
      return 'gemini';
    case 'claude':
    case 'anthropic':
      return 'claude';
    default:
      return 'none';
  }
}

/**
 * Provider wire configurations.
 *
 * All three speak HTTP+JSON, so a single well-tested adapter covers them.
 * This avoids pulling in three vendor SDKs (each with its own transitive
 * dependency tree and update cadence) for what is one POST request.
 */
function openAIConfig(): HttpProviderConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    name: 'openai',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    url: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1/chat/completions',
    apiKey,
    buildHeaders: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (model, system, user) => ({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    }),
    extractText: (json) => {
      const j = json as { choices?: Array<{ message?: { content?: string } }> };
      return j.choices?.[0]?.message?.content ?? '';
    },
  };
}

function geminiConfig(): HttpProviderConfig | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
  const base =
    process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/models';
  return {
    name: 'gemini',
    model,
    url: `${base}/${model}:generateContent`,
    apiKey,
    // Gemini takes the key as a header rather than a bearer token.
    buildHeaders: (key) => ({ 'x-goog-api-key': key }),
    buildBody: (_model, system, user) => ({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    }),
    extractText: (json) => {
      const j = json as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return j.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    },
  };
}

function claudeConfig(): HttpProviderConfig | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return {
    name: 'claude',
    model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-latest',
    url: process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1/messages',
    apiKey,
    buildHeaders: (key) => ({
      'x-api-key': key,
      'anthropic-version': process.env.ANTHROPIC_VERSION ?? '2023-06-01',
    }),
    buildBody: (model, system, user) => ({
      model,
      max_tokens: 2048,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    extractText: (json) => {
      const j = json as { content?: Array<{ text?: string }> };
      return j.content?.[0]?.text ?? '';
    },
  };
}

/**
 * Build the configured provider, or `null` when none is available.
 *
 * A provider selected without its API key yields `null` rather than a
 * half-configured client: the gateway then reports NO_PROVIDER and the
 * application degrades cleanly instead of failing at request time.
 */
export function buildConfiguredProvider(): AIProvider | null {
  switch (configuredProviderKind()) {
    case 'deterministic':
      return createDeterministicAIProvider();
    case 'openai': {
      const cfg = openAIConfig();
      return cfg ? createHttpAIProvider(cfg) : null;
    }
    case 'gemini': {
      const cfg = geminiConfig();
      return cfg ? createHttpAIProvider(cfg) : null;
    }
    case 'claude': {
      const cfg = claudeConfig();
      return cfg ? createHttpAIProvider(cfg) : null;
    }
    case 'none':
    default:
      return null;
  }
}

/**
 * Register the configured AI provider with the Phase 7 registry.
 *
 * Called once during server start-up. Registering nothing is a normal,
 * fully-supported state — StitchFlow works without AI.
 */
export function registerConfiguredAIProvider(): AIProvider | null {
  const provider = buildConfiguredProvider();
  if (provider) {
    providerRegistry.register('ai', provider);
  }
  return provider;
}

export { createDeterministicAIProvider } from './DeterministicAIProvider';
export type { SimulatedFailure } from './DeterministicAIProvider';
