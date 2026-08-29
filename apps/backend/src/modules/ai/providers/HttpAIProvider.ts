/**
 * Phase 17 — generic HTTP AI provider adapter.
 *
 * OpenAI, Gemini and Claude all expose an HTTPS + JSON chat endpoint. One
 * well-tested adapter, configured per vendor, covers all three without
 * pulling three vendor SDKs (and their transitive dependency trees) into
 * the backend.
 *
 * This file is the ONLY place in StitchFlow that performs an outbound AI
 * network call. Domain services never reach a provider directly (§13).
 *
 * SECURITY:
 *  - The API key is injected via headers only; it is never logged and never
 *    included in an error message returned to a caller.
 *  - Errors are re-thrown as plain, non-sensitive messages so the gateway
 *    can classify them without leaking configuration.
 */

import type { AIProvider, AIRequest, AIResponse } from '../../../providers/contracts';

export interface HttpProviderConfig {
  name: string;
  model: string;
  url: string;
  apiKey: string;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: (model: string, systemPrompt: string, userContent: string) => unknown;
  extractText: (json: unknown) => string;
  timeoutMs?: number;
}

const DEFAULT_HTTP_TIMEOUT_MS = 20_000;

export function createHttpAIProvider(config: HttpProviderConfig): AIProvider {
  async function call(req: AIRequest): Promise<AIResponse> {
    // The structured context travels as a separate JSON document so that
    // customer-supplied strings are never spliced into the instruction text.
    const userContent = JSON.stringify({
      purpose: req.purpose,
      context: req.context ?? {},
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(config.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...config.buildHeaders(config.apiKey),
        },
        body: JSON.stringify(config.buildBody(config.model, req.prompt, userContent)),
        signal: controller.signal,
      });
    } catch (err) {
      // Never surface the URL or key material in the error.
      const aborted = err instanceof Error && err.name === 'AbortError';
      throw new Error(aborted ? 'AI provider timeout' : 'AI provider network failure');
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 429) {
      throw new Error('AI provider rate limit (429)');
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error('AI provider unauthorized: invalid api key configuration');
    }
    if (!res.ok) {
      throw new Error(`AI provider error (${res.status})`);
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new Error('AI provider returned unreadable body');
    }

    return {
      text: config.extractText(json) ?? '',
      provider: config.name,
      model: config.model,
    };
  }

  return {
    name: config.name,
    async generate(req) {
      return call(req);
    },
    async analyze(req) {
      const res = await call(req);
      return { text: res.text };
    },
    async classify(_req, labels) {
      return { label: labels[0] ?? 'unknown', confidence: 0 };
    },
    async summarize(req) {
      const res = await call(req);
      return res.text;
    },
  };
}
