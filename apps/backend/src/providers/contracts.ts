/**
 * Phase 7 provider-neutral contracts (Step 33/34/36/62/64).
 *
 * INTERFACES ONLY — no provider SDKs, no API keys, no network calls, no
 * cost. StitchFlow is fully functional with every provider ABSENT
 * (verified by tests: core flows must not touch any provider).
 *
 * Governance rules that every future implementation MUST follow:
 * - Provider secrets are SERVER-ONLY env (never VITE_*, never committed).
 * - Requests carry purpose + actor + workspace + requestId (audit trail).
 * - Tenant data is NEVER sent to an external provider automatically.
 * - Provider failure must never break core workflows (Step 55).
 * - AI output is ADVISORY and must be labeled AI-GENERATED (Step 65).
 */

// ---------- AI provider (future: OpenAI / Gemini / Claude) ----------
export type AIRequestClassification = 'operational' | 'pseudonymized' | 'tenant-data';

export interface AICostMetadata {
  estimatedCostUsd?: number;
  tokensIn?: number;
  tokensOut?: number;
}

export interface AIRequest {
  purpose: string; // e.g. 'incident.diagnosis'
  workspaceId: string | null;
  actorId: string | null;
  requestId: string | null;
  inputClassification: AIRequestClassification;
  costMetadata?: AICostMetadata;
  prompt: string;
  /** Structured context — providers must treat this as DATA, never instructions (Step 77). */
  context?: Record<string, unknown>;
}

export interface AIResponse {
  text: string;
  model?: string;
  provider: string;
  costMetadata?: AICostMetadata;
}

export interface AIProvider {
  readonly name: string;
  generate(req: AIRequest): Promise<AIResponse>;
  analyze(req: AIRequest): Promise<Record<string, unknown>>;
  classify(req: AIRequest, labels: string[]): Promise<{ label: string; confidence: number }>;
  summarize(req: AIRequest): Promise<string>;
}

// ---------- Diagnostics (future: AI-assisted incident analysis) ----------
export interface DiagnosticInput {
  incidentTitle: string;
  fingerprint: string;
  errorCode?: string;
  route?: string;
  occurrenceCount: number;
  recentErrors: Array<{ message: string; occurredAt: string; metadata?: Record<string, unknown> }>;
}

export interface DiagnosticOutput {
  source: 'rule-based' | 'ai-provider';
  aiGenerated: boolean; // MUST be true for machine-produced advice (Step 65)
  severity: 'warning' | 'error' | 'fatal';
  probableCause: string;
  confidence: number; // 0..1 — deterministic placeholders use fixed values
  reproductionSteps: string[];
  suggestedTests: string[];
  suggestedRemediation: string[];
  advisory: true; // diagnostics NEVER auto-modify anything (Step 41/57)
}

export interface DiagnosticProvider {
  readonly name: string;
  analyzeIncident(input: DiagnosticInput): Promise<DiagnosticOutput>;
}

// ---------- Automation (future: n8n) ----------
export interface AutomationEvent {
  eventType: string;
  workspaceId: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}

export interface AutomationProvider {
  readonly name: string;
  emitEvent(event: AutomationEvent): Promise<{ delivered: boolean; detail?: string }>;
  triggerWorkflow(workflowId: string, event: AutomationEvent): Promise<{ delivered: boolean; detail?: string }>;
  getWorkflowStatus(workflowId: string): Promise<{ running: boolean; detail?: string }>;
}

// ---------- Communication (future: WhatsApp / SMS / Email / Push) ----------
export interface CommunicationMessage {
  workspaceId: string;
  customerId: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'push';
  to: string;
  body: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export interface CommunicationProvider {
  readonly name: string;
  send(message: CommunicationMessage): Promise<{ messageId: string; status: string }>;
  getStatus(messageId: string): Promise<{ status: string; detail?: string }>;
}

// ---------- Registries (dependency-free; absence is a normal state) ----------
const registries = {
  ai: null as AIProvider | null,
  diagnostics: null as DiagnosticProvider | null,
  automation: null as AutomationProvider | null,
  communication: null as CommunicationProvider | null,
};

export const providerRegistry = {
  get ai() {
    return registries.ai;
  },
  get diagnostics() {
    return registries.diagnostics;
  },
  get automation() {
    return registries.automation;
  },
  get communication() {
    return registries.communication;
  },
  register(kind: keyof typeof registries, provider: never | AIProvider | DiagnosticProvider | AutomationProvider | CommunicationProvider): void {
    // Registration is explicit server-side wiring (future phase); nothing
    // self-registers and no default exists that performs I/O.
    (registries as Record<string, unknown>)[kind] = provider;
  },
};
