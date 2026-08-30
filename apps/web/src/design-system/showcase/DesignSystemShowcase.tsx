/**
 * StitchFlow Design System Showcase — Phase 18 Stage 5 §30.
 * Controlled component laboratory: static, public, no production data,
 * no workflows. Renders every foundational primitive so a11y/responsive/
 * imagery behaviour can be validated in real DOM context. NOT the product.
 *
 * Imagery: Stage 4 library per docs/VISUAL_ASSET_MANIFEST.md (all
 * AI-generated, disclosed; P0/P1 review still pending human approval —
 * rendered here exactly for that in-context evaluation).
 */
import { useState } from 'react';
import {
  ActionBar, ActivityItem, AiAdvisory, Alert, Badge, Button, ButtonGroup, Checkbox,
  Dialog, Drawer, DataList, Divider, Display, EmptyState, ErrorState, FormField,
  Heading, IconButton, ImageFrame, Input, KeyValue, Label, Link, Metric, PaymentPill,
  ProductionTracker, Progress, Radio, Select, Skeleton, Stack, StatusPill, StepIndicator,
  Stepper, Surface, Switch, Table, Tabs, Td, Textarea, Th, Timeline, Checklist,
  DensitySurface, Inline, Section, Body, Numeric, type AiVerb, type CanonicalStage,
} from '../index';

const A = '/assets';
const Section_ = ({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) => (
  <section className="flex flex-col gap-4" aria-label={title}>
    <div>
      <Section>{title}</Section>
      {note && <Body className="text-ink-mute">{note}</Body>}
    </div>
    {children}
  </section>
);

export default function DesignSystemShowcase() {
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [step, setStep] = useState(1);
  const [switchOn, setSwitchOn] = useState(true);
  const [err, setErr] = useState<string | undefined>('Chest must be between 60 and 180 cm');
  return (
    <DensitySurface density="workspace" className="min-h-dvh bg-ds-bg px-4 py-8 sm:px-8">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <header className="flex flex-col gap-2">
          <Label>Phase 18 · Stage 5 · component laboratory</Label>
          <Display>StitchFlow Design System</Display>
          <Body className="max-w-prose text-ink-soft">
            Validation surface only — static, public, connected to no workflows. Visual contract:
            «Intelligence should feel calm.»
          </Body>
        </header>

        <Section_ title="Typography" note="Six roles, one voice — Hanken Grotesk / Geist / JetBrains Mono (bundled, VERIFIED)">
          <Display>Display 40/700</Display>
          <Heading>Heading 24/600</Heading>
          <Section>Section 17/600</Section>
          <Body>Body 15/400 — operational default text with calm hierarchy and comfortable measure.</Body>
          <Label>Label 12/500 upper</Label>
          <Numeric>102.40 cm · GHS 1,250.00 · mp-3f9c1a2e-…</Numeric>
        </Section_>

        <Section_ title="Actions" note="§17 hierarchy — one primary per region; tertiary is text-only">
          <ButtonGroup label="Button hierarchy">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="destructive">Delete order</Button>
            <Button variant="secondary" contextual>Contextual</Button>
            <IconButton label="Search">⌕</IconButton>
          </ButtonGroup>
          <Inline><Link href="#typography">Focus-visible link</Link></Inline>
        </Section_>

        <Section_ title="Forms" note="Measurement contract: canonical units never hidden; body vs garment distinguishable">
          <Surface className="grid gap-5 p-5 sm:grid-cols-2">
            <FormField label="Chest (body)" unit="cm" required hint="Soft range 60–180 cm" error={err}>
              {(aria) => <Input {...aria} numeric defaultValue="102.4" onChange={() => setErr(undefined)} />}
            </FormField>
            <FormField label="Chest (garment)" unit="cm" optional>
              {(aria) => <Input {...aria} numeric garment defaultValue="106.0" />}
            </FormField>
            <FormField label="Garment type" required>
              {(aria) => (
                <Select {...aria}>
                  <option value="shirt">Shirt</option>
                  <option value="trouser">Trouser</option>
                  <option value="kaftan">Kaftan</option>
                  <option value="dress">Dress</option>
                  <option value="jacket">Jacket</option>
                </Select>
              )}
            </FormField>
            <FormField label="Notes" optional>
              {(aria) => <Textarea {...aria} placeholder="Construction notes…" />}
            </FormField>
            <Checkbox label="Pattern-matching required" defaultChecked />
            <Radio label="Standard ease" name="ease" defaultChecked />
            <Radio label="Slim ease" name="ease" />
            <Inline gap={3}><Switch checked={switchOn} onCheckedChange={setSwitchOn} label="Notify customer at ready" /><Body>Notify at ready</Body></Inline>
          </Surface>
        </Section_>

        <Section_ title="Status language" note="Canonical stages seq 1–9 — text + shape + colour; payment independent of production">
          <Surface className="flex flex-col gap-4 p-5">
            <ProductionTracker current="sewing" />
            <ProductionTracker current="second_fitting" compact />
            <Inline gap={3}>
              {(['measurement', 'cutting', 'sewing', 'ready'] as CanonicalStage[]).map((s) => <StatusPill key={s} stage={s} />)}
            </Inline>
            <Divider label="Payment — independent dimension" />
            <Inline gap={3}>
              <PaymentPill state="unpaid" /><PaymentPill state="partial" /><PaymentPill state="paid" /><PaymentPill state="overdue" />
              <Badge tone="advisory">AI</Badge><Badge tone="neutral">Draft</Badge><Badge tone="success">Validated</Badge>
            </Inline>
          </Surface>
        </Section_>

        <Section_ title="AI advisory" note="§20 — advice, never authority; verbs INFORM/WARN/SUGGEST/EXPLAIN/RECOMMEND">
          <div className="grid gap-3 sm:grid-cols-2">
            <AiAdvisory verb="SUGGEST" title="Fabric may be insufficient" source="fabric-intelligence"
              onReview={() => {}} onDismiss={() => {}}>
              5.5 yd requested; estimate is 6.2 yd at 45 in width with pattern matching.
            </AiAdvisory>
            <AiAdvisory verb="WARN" title="Measurement drift detected" source="assistant">
              Waist differs 4.2 cm from the last two profiles. Confirm before cutting.
            </AiAdvisory>
          </div>
        </Section_>

        <Section_ title="Feedback & empty states">
          <div className="grid gap-3 sm:grid-cols-2">
            <Alert tone="success" title="Design validated">Version 3 is ready for pattern drafting.</Alert>
            <Alert tone="danger" title="Sync failed">Changes are saved locally and will retry.</Alert>
            <Skeleton label="Order list" />
            <Progress value={62} label="Order progress" />
          </div>
          <EmptyState illustration={`${A}/illustrations/empty-states/empty-state-no-orders-01-card-800.webp`}
            title="No orders yet" message="Create your first order to start the tailoring workflow — measurements, design and production flow from it."
            primaryAction={<Button variant="primary">New order</Button>}
            secondaryAction={<Button variant="tertiary">Add a customer first</Button>} />
          <ErrorState message="The order could not be loaded." errorId="err-0114" onRetry={() => {}} />
        </Section_>

        <Section_ title="Navigation" note="Tabs: roving tabindex + arrow keys; StepIndicator: wizard position">
          <Tabs tabs={[
            { id: 'details', label: 'Details', content: <Body>Tab panel A (aria-controls/labelled-by wired).</Body> },
            { id: 'measure', label: 'Measurements', content: <Body>Tab panel B.</Body> },
            { id: 'fabric', label: 'Fabric', content: <Body>Tab panel C.</Body> },
          ]} />
          <StepIndicator steps={[{ id: 'c', label: 'Customer' }, { id: 'o', label: 'Order' }, { id: 'm', label: 'Measure' }, { id: 'd', label: 'Design' }]} current={2} />
        </Section_>

        <Section_ title="Data" note="Desktop table (overflow-x policy) · mobile DataList transform">
          <Table caption="Recent orders">
            <thead><tr><Th>Customer</Th><Th>Garment</Th><Th numeric>Balance (GHS)</Th><Th>Production</Th></tr></thead>
            <tbody>
              <tr><Td>Abena O.</Td><Td>Dress</Td><Td numeric>150.00</Td><Td><StatusPill stage="cutting" size="sm" /></Td></tr>
              <tr><Td>Kwame A.</Td><Td>Kaftan</Td><Td numeric>0.00</Td><Td><StatusPill stage="ready" size="sm" /></Td></tr>
            </tbody>
          </Table>
          <DataList label="Recent orders" items={[
            { title: 'Abena O. — Dress', rows: [['Balance', 'GHS 150.00'], ['Stage', <StatusPill key="s" stage="cutting" size="sm" />]] },
            { title: 'Kwame A. — Kaftan', rows: [['Balance', 'GHS 0.00'], ['Stage', <StatusPill key="s" stage="ready" size="sm" />]] },
          ]} />
          <div className="grid gap-6 sm:grid-cols-3">
            <Metric label="Open orders" value={12} />
            <Metric label="Due today" value={3} />
            <KeyValue items={[['Stage', 'sewing'], ['Balance', 'GHS 150']]} />
          </div>
        </Section_>

        <Section_ title="Workflow" note="Spine made visible; sticky mobile action bar">
          <Stepper steps={[{ id: '1', label: 'Customer' }, { id: '2', label: 'Measurements' }, { id: '3', label: 'Design' }, { id: '4', label: 'Materials' }]} current={step} onStepClick={setStep}>
            <Surface className="flex flex-col gap-4 p-5">
              <Checklist items={[
                { label: 'Measurement profile attached', state: 'done' },
                { label: 'Design specification validated', state: 'done' },
                { label: 'Fabric readiness — pattern matching unresolved', state: 'blocked', note: 'Two candidates; never auto-solved' },
                { label: 'Cutting layout generated', state: 'todo' },
              ]} />
              <Timeline items={[
                { title: 'Order created', meta: '2026-08-28 09:12', done: true },
                { title: 'Design validated', meta: 'v3 · 2026-08-29', done: true },
                { title: 'Fabric assignment', current: true },
              ]} />
              <ActionBar label="Workflow actions">
                <Button variant="tertiary">Save draft</Button>
                <Button variant="primary">Continue to materials</Button>
              </ActionBar>
            </Surface>
          </Stepper>
        </Section_>

        <Section_ title="Imagery" note="Stage 4 library — AI-generated (disclosed); P0 human review pending">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ImageFrame variant="garment" src={`${A}/garments/garment-shirt-01-card-800.webp`} alt="Reference photo: tailored shirt, flat lay" />
            <ImageFrame variant="garment" src={`${A}/garments/garment-kaftan-01-card-800.webp`} alt="Reference photo: embroidered kaftan, flat lay" />
            <ImageFrame variant="fabric" src={`${A}/fabrics/fabric-kente-macro-01-card-800.webp`} alt="Kente cloth texture — visual reference, not inventory data" />
            <ImageFrame variant="fabric" src={undefined} alt="Missing fabric reference" />
          </div>
          <ImageFrame variant="hero" eager className="max-h-72" src={`${A}/landing/hero/hero-measurement-form-01-hero-1280.avif`}
            alt="Tailoring studio: dress form with measuring tape" />
        </Section_>

        <Section_ title="Overlays" note="Dialog + drawer (bottom-sheet on mobile): focus trap, Escape, restore">
          <ButtonGroup label="Overlay demos">
            <Button variant="secondary" onClick={() => setDialog(true)}>Open dialog</Button>
            <Button variant="secondary" onClick={() => setDrawer(true)}>Open drawer</Button>
          </ButtonGroup>
        </Section_>

        <Section_ title="Activity">
          <ActivityItem title="Production moved to sewing" meta="09:41">Order #0114 · Abena O.</ActivityItem>
          <ActivityItem title="Payment received — GHS 150.00" meta="Yesterday" />
        </Section_>

        <footer className="flex flex-col gap-1 border-t border-line pt-6">
          <Label>StitchFlow · AGBOFA Technology Ltd</Label>
          <Body className="text-ink-mute">Stage 5 component laboratory — not connected to production data.</Body>
        </footer>
      </main>

      <Dialog open={dialog} onClose={() => setDialog(false)} title="Confirm stage transition"
        footer={<>
          <Button variant="tertiary" onClick={() => setDialog(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setDialog(false)}>Mark sewing complete</Button>
        </>}>
        <Body>Moving to <strong>first fitting</strong>. QC note is required for embroidery completion.</Body>
      </Dialog>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Customer details"
        footer={<ActionBar label="Drawer actions"><Button variant="primary">Save</Button></ActionBar>}>
        <KeyValue items={[['Phone', '+233 …'], ['Orders', '8'], ['Balance', 'GHS 150.00']]} />
      </Drawer>
    </DensitySurface>
  );
}
