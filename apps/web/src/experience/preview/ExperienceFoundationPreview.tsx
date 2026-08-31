import { useState } from 'react';
import {
  Badge,
  Breadcrumb,
  Button,
  Checkbox,
  CommandMenu,
  Container,
  DataTable,
  Dialog,
  Dropdown,
  ErrorState,
  ExperienceEmptyState,
  Field,
  Grid,
  IconButton,
  Input,
  LoadingState,
  Pagination,
  Panel,
  Radio,
  Section,
  Select,
  Skeleton,
  SplitPane,
  Stack,
  Switch,
  Tabs,
  Toast,
  Tooltip,
} from '../index';

const CONCEPTS = [
  { id: 'context', title: 'Context', body: 'What am I working on?' },
  { id: 'tools', title: 'Tools', body: 'What can I do?' },
  { id: 'canvas', title: 'Canvas', body: 'Where does the primary work happen?' },
  { id: 'inspector', title: 'Inspector', body: 'What are the properties of the selected object?' },
  { id: 'intelligence', title: 'Intelligence', body: 'What information can help me? Advisory only.' },
];

export function ExperienceFoundationPreview() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [tab, setTab] = useState('tokens');
  const [switched, setSwitched] = useState(true);
  const [page, setPage] = useState(1);

  return (
    <div data-theme={theme} className="min-h-screen bg-surface-canvas text-ink-primary">
      <Container className="py-10">
        <Stack gap={8}>
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-meta uppercase tracking-[0.18em] text-ink-muted">T4 Experience Foundation</p>
              <h1 className="mt-2 font-display text-display">Beauty × Function = Experience</h1>
              <p className="mt-2 max-w-2xl text-body text-ink-secondary">
                Tokenized primitives for the future StitchFlow Studio. This preview is not the Studio shell.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                {theme === 'light' ? 'Dark tokens' : 'Light tokens'}
              </Button>
              <Button onClick={() => setCommandOpen(true)}>Command menu</Button>
            </div>
          </header>

          <Breadcrumb
            items={[
              { id: 't3', label: 'T3 Domain' },
              { id: 't4', label: 'T4 Experience' },
            ]}
          />

          <Grid columns={3}>
            {CONCEPTS.map((concept) => (
              <Panel key={concept.id}>
                <p className="text-label text-action-primary">{concept.title}</p>
                <p className="mt-2 text-body text-ink-secondary">{concept.body}</p>
              </Panel>
            ))}
          </Grid>

          <SplitPane
            primary={
              <Section title="Workspace canvas" description="Primary work region. Not a Design Studio rewrite.">
                <Panel elevated>
                  <p className="text-body">Representative canvas surface. No pattern mathematics live here.</p>
                </Panel>
              </Section>
            }
            secondary={
              <Section title="Inspector" description="Properties of the selected object.">
                <Panel>
                  <Field label="Garment type" htmlFor="garment">
                    <Select id="garment" defaultValue="shirt">
                      <option value="shirt">Shirt</option>
                      <option value="skirt">Skirt</option>
                    </Select>
                  </Field>
                </Panel>
              </Section>
            }
          />

          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              {
                id: 'tokens',
                label: 'Tokens',
                panel: (
                  <Grid columns={4}>
                    <div className="overflow-hidden rounded-sf border border-line">
                      <div className="h-16 bg-surface-canvas" />
                      <p className="px-3 py-2 text-meta">surface.canvas</p>
                    </div>
                    <div className="overflow-hidden rounded-sf border border-line">
                      <div className="h-16 bg-surface-workspace" />
                      <p className="px-3 py-2 text-meta">surface.workspace</p>
                    </div>
                    <div className="overflow-hidden rounded-sf border border-line">
                      <div className="h-16 bg-surface-panel" />
                      <p className="px-3 py-2 text-meta">surface.panel</p>
                    </div>
                    <div className="overflow-hidden rounded-sf border border-line">
                      <div className="h-16 bg-surface-elevated" />
                      <p className="px-3 py-2 text-meta">surface.elevated</p>
                    </div>
                  </Grid>
                ),
              },
              {
                id: 'controls',
                label: 'Controls',
                panel: (
                  <Stack>
                    <div className="flex flex-wrap gap-2">
                      <Button>Primary</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="danger">Danger</Button>
                      <Button loading>Save</Button>
                      <Button disabled>Disabled</Button>
                      <Tooltip label="Refresh workspace">
                        <IconButton label="Refresh">↻</IconButton>
                      </Tooltip>
                    </div>
                    <Field label="Customer name" htmlFor="name" hint="Visible to the workshop" required>
                      <Input id="name" placeholder="Ama Mensah" />
                    </Field>
                    <Field label="Broken field" htmlFor="bad" error="This value is required">
                      <Input id="bad" aria-invalid />
                    </Field>
                    <Checkbox id="agree" label="Notify when fitting is due" defaultChecked />
                    <Radio id="fit-a" name="fit" label="Regular fit" defaultChecked />
                    <div className="flex items-center gap-3">
                      <Switch checked={switched} onCheckedChange={setSwitched} label="Reduced motion demo" />
                      <span className="text-meta text-ink-muted">{switched ? 'On' : 'Off'}</span>
                    </div>
                    <Dropdown
                      label="Actions"
                      items={[{ id: 'export', label: 'Export', onSelect: () => undefined }]}
                    />
                  </Stack>
                ),
              },
              {
                id: 'states',
                label: 'States',
                panel: (
                  <Stack>
                    <div className="flex flex-wrap gap-2">
                      <Badge>Info</Badge>
                      <Badge tone="success">Success</Badge>
                      <Badge tone="warning">Warning</Badge>
                      <Badge tone="danger">Danger</Badge>
                    </div>
                    <LoadingState />
                    <ErrorState description="The experience layer does not own domain recovery." />
                    <Skeleton className="h-10 w-full" />
                    <Toast tone="success">Draft tokens saved in memory only.</Toast>
                    <ExperienceEmptyState title="No selection" description="Select a garment to inspect properties." />
                    <Pagination page={page} pageCount={4} onPage={setPage} />
                    <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                      Open dialog
                    </Button>
                  </Stack>
                ),
              },
            ]}
          />

          <Section title="Data presentation" description="Tables consume application data. They do not calculate ease or fabric.">
            <DataTable
              caption="Sample customers"
              columns={[
                { id: 'name', header: 'Name', cell: (row) => row.name },
                { id: 'phone', header: 'Phone', cell: (row) => row.phone },
              ]}
              rows={[
                { id: '1', name: 'Ama Mensah', phone: '024 000 0000' },
                { id: '2', name: 'Kojo Asare', phone: '020 111 1111' },
              ]}
            />
          </Section>
        </Stack>
      </Container>

      <Dialog open={dialogOpen} title="Confirm" onClose={() => setDialogOpen(false)}>
        <p className="text-body text-ink-secondary">Escape closes. Overlay click closes. Focus returns to the opener.</p>
        <div className="mt-4">
          <Button onClick={() => setDialogOpen(false)}>Done</Button>
        </div>
      </Dialog>

      <CommandMenu
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        commands={[
          { id: 'tokens', label: 'Show tokens', onSelect: () => setTab('tokens') },
          { id: 'controls', label: 'Show controls', onSelect: () => setTab('controls') },
        ]}
      />
    </div>
  );
}
