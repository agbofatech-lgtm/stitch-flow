import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, Plus, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  AtelierConfidence,
  AtelierJourney,
  AtelierStage,
  AtelierWorkroom,
  Button,
  Dialog,
  ExperienceEmptyState,
  Field,
  Input,
  StatusBadge,
  Textarea,
} from '../experience';
import { goAtelierRoom } from '../experience/atelier/navigate';
import { motionOrInstant, motionPresets } from '../experience/motion/motion';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';
import { useWorkflow } from '../workflow/WorkflowContext';
import type { Customer } from '../shared/types';

function initials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();
  return letters || '?';
}

function isValidEmail(email: string) {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizeClientPayload(data: {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}) {
  return {
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    email: data.email.trim().toLowerCase(),
    address: data.address.trim(),
    notes: data.notes.trim(),
  };
}

export function Customers() {
  const {
    customers,
    orders,
    measurementProfiles,
    addCustomer,
    updateCustomer,
    getCustomerOrders,
    getCustomerMeasurementProfiles,
  } = useApp();
  const workflow = useWorkflow();
  const [search, setSearch] = useState('');
  const [listOpen, setListOpen] = useState(() => !workflow.customerId);
  const [editor, setEditor] = useState<'receive' | Customer | null>(null);
  const [pendingSelect, setPendingSelect] = useState<{ fullName: string; phone: string } | null>(null);

  const selected = customers.find((customer) => customer.id === workflow.customerId) || null;
  const selectedOrder = orders.find((order) => order.id === workflow.orderId) || null;

  useEffect(() => {
    if (!pendingSelect) return;
    const found = customers.find(
      (customer) => customer.fullName === pendingSelect.fullName && customer.phone === pendingSelect.phone
    );
    if (!found) return;
    workflow.selectCustomer(found.id);
    setPendingSelect(null);
  }, [customers, pendingSelect, workflow]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => {
      return (
        customer.fullName.toLowerCase().includes(query) ||
        (customer.email || '').toLowerCase().includes(query) ||
        (customer.phone || '').includes(search.trim())
      );
    });
  }, [customers, search]);

  function openClient(id: string) {
    workflow.selectCustomer(id);
    setListOpen(false);
  }

  const history = selected ? getCustomerOrders(selected.id) : [];
  const profiles = selected ? getCustomerMeasurementProfiles(selected.id) : [];
  const liveProfileCount = selected
    ? measurementProfiles.filter((profile) => profile.customerId === selected.id).length
    : 0;

  return (
    <AtelierWorkroom
      place="Client room"
      title={selected ? selected.fullName : 'Select a client'}
      purpose={
        selected
          ? 'Relationship and history for this fitting. Continue when you understand who you are dressing.'
          : 'Open a dossier to begin this tailoring thread. This room does not invent an active client.'
      }
      confidence={
        <AtelierConfidence
          state="local"
          detail="AppContext workspace store. Same people as the Floor. Not shop authority."
        />
      }
      primaryAction={
        selected ? undefined : (
          <Button variant="primary" onClick={() => setEditor('receive')}>
            <Plus className="h-4 w-4" />
            Receive client
          </Button>
        )
      }
    >
      <div className="grid items-start gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <section
          data-client-list="true"
          className={selected && !listOpen ? 'hidden xl:block' : selected ? 'order-2 xl:order-1' : undefined}
        >
          <h3 className="font-display text-heading-sm text-ink-primary">People</h3>
          <p className="mt-1 text-meta text-ink-muted">The atelier index. Selecting a person starts the thread.</p>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clients"
              aria-label="Search clients"
              className="sf-focus-ring min-h-11 w-full rounded-sf border border-line bg-surface-panel py-2 pl-10 pr-3 text-body text-ink-primary outline-none placeholder:text-ink-muted"
            />
          </div>
          {customers.length === 0 ? (
            <div className="mt-4">
              <ExperienceEmptyState
                title="No clients yet"
                description="Receive the first person you will dress. This room does not invent records from an unmounted shop path."
                action={
                  <Button size="md" onClick={() => setEditor('receive')}>
                    Receive client
                  </Button>
                }
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-4">
              <ExperienceEmptyState
                title="No clients match"
                description="Try a different name, phone, or email."
              />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
              {filtered.map((customer) => {
                const current = customer.id === selected?.id;
                return (
                  <li key={customer.id}>
                    <button
                      type="button"
                      aria-current={current ? 'true' : undefined}
                      onClick={() => openClient(customer.id)}
                      className="sf-focus-ring sf-micro-press flex min-h-11 w-full items-center gap-3 py-3 text-left"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-meta font-semibold ${
                          current ? 'bg-action-primary text-ink-inverse' : 'bg-action-secondary text-action-primary'
                        }`}
                      >
                        {initials(customer.fullName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-label text-ink-primary">{customer.fullName}</span>
                        <span className="block font-numeric text-meta text-ink-muted">
                          {customer.phone || 'No phone'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {customers.length > 0 ? (
            <div className="mt-4">
              <Button variant="secondary" className="w-full" onClick={() => setEditor('receive')}>
                <Plus className="h-4 w-4" />
                Receive client
              </Button>
            </div>
          ) : null}
        </section>

        <section data-client-dossier="true" className={selected ? 'order-1 xl:order-2' : undefined}>
          {selected ? (
            <motion.div
              key={selected.id}
              data-client-identity={selected.id}
              data-motion-category="contextual"
              {...motionOrInstant(motionPresets.contextual)}
            >
              <AtelierStage>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-meta text-ink-muted">Dossier</p>
                    <p className="mt-1 font-display text-heading text-ink-primary">{selected.fullName}</p>
                    <div className="mt-2">
                      <AtelierJourney current="clients" />
                    </div>
                    <p className="mt-2 text-meta text-ink-muted">
                      {selectedOrder
                        ? `Active garment ${selectedOrder.orderNumber}`
                        : 'No garment on the thread yet'}
                      <span aria-hidden="true"> · </span>
                      In this workspace since{' '}
                      {selected.createdAt ? format(new Date(selected.createdAt), 'MMM yyyy') : '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" className="xl:hidden" onClick={() => setListOpen(true)}>
                      All clients
                    </Button>
                    <Button variant="secondary" onClick={() => setEditor(selected)}>
                      Edit dossier
                    </Button>
                  </div>
                </div>

                <ul className="mt-4 space-y-2 text-body text-ink-secondary">
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                    <span className="font-numeric">{selected.phone || 'No phone'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                    {selected.email || 'No email'}
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    <span>{selected.address || 'No address'}</span>
                  </li>
                </ul>

                {selected.notes ? (
                  <p className="mt-4 rounded-sf bg-surface-workspace p-3 text-body text-ink-secondary">{selected.notes}</p>
                ) : null}

                {selected.preferredStyle || (selected.preferredColors && selected.preferredColors.length) ? (
                  <p className="mt-3 text-meta text-ink-muted">
                    {selected.preferredStyle ? `Prefers ${selected.preferredStyle}` : 'Preferences on file'}
                    {selected.preferredColors?.length ? ` · ${selected.preferredColors.join(', ')}` : ''}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => goAtelierRoom('measurements')}>Continue to measurements</Button>
                  <Button variant="ghost" onClick={() => goAtelierRoom('design')}>
                    Continue to design
                  </Button>
                </div>
              </AtelierStage>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <section>
                  <h3 className="font-display text-heading-sm text-ink-primary">Live profiles</h3>
                  <p className="mt-1 text-meta text-ink-muted">
                    {liveProfileCount === 0
                      ? 'No live measurement profile yet. Capture begins at the table.'
                      : `${liveProfileCount} live ${liveProfileCount === 1 ? 'profile' : 'profiles'} in the workspace store.`}
                  </p>
                  {profiles.length === 0 ? (
                    <div className="mt-3">
                      <ExperienceEmptyState
                        title="No measurements on this person"
                        description="The measurement table captures body and garment separately. Live profiles stay transitional until frozen."
                        action={
                          <Button size="md" onClick={() => goAtelierRoom('measurements')}>
                            Open measurement table
                          </Button>
                        }
                      />
                    </div>
                  ) : (
                    <ul className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
                      {profiles.map((profile) => (
                        <li key={profile.id}>
                          <button
                            type="button"
                            className="sf-focus-ring sf-micro-press flex min-h-11 w-full items-center justify-between py-3 text-left"
                            onClick={() => {
                              workflow.selectProfile(profile.id);
                              goAtelierRoom('measurements');
                            }}
                          >
                            <span className="text-label text-ink-primary">{profile.label}</span>
                            {profile.isDefault ? <StatusBadge status="active" /> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="font-display text-heading-sm text-ink-primary">Garment history</h3>
                  <p className="mt-1 text-meta text-ink-muted">Orders from this workspace store. Not a remote shop ledger.</p>
                  {history.length === 0 ? (
                    <div className="mt-3">
                      <ExperienceEmptyState
                        title="No garments on record"
                        description="When an order is cut for this client, it will appear here."
                      />
                    </div>
                  ) : (
                    <ul className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
                      {history.map((order) => {
                        const current = order.id === selectedOrder?.id;
                        return (
                          <li key={order.id}>
                            <button
                              type="button"
                              aria-current={current ? 'true' : undefined}
                              className="sf-focus-ring sf-micro-press flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left"
                              onClick={() => workflow.selectOrder(order.id)}
                            >
                              <span>
                                <span className="block font-numeric text-body text-ink-primary">{order.orderNumber}</span>
                                <span className="block text-meta text-ink-muted">{order.orderType}</span>
                              </span>
                              <span className="text-right">
                                <StatusBadge status={order.status} />
                                <span className="mt-1 block font-numeric text-meta text-ink-muted">
                                  {formatCurrency(order.totalAmount, safeCurrency(order.currency, 'GHS'))}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </motion.div>
          ) : (
            <ExperienceEmptyState
              title="No client selected"
              description="Choose a person from the list to open their dossier. This room does not invent an active client."
              action={
                customers.length === 0 ? (
                  <Button onClick={() => setEditor('receive')}>Receive client</Button>
                ) : undefined
              }
            />
          )}
        </section>
      </div>

      {editor ? (
        <ClientEditorDialog
          client={editor === 'receive' ? null : editor}
          onClose={() => setEditor(null)}
          onReceive={(payload) => {
            const result = addCustomer(payload);
            if (!result.success) return result;
            setPendingSelect({ fullName: payload.fullName, phone: payload.phone });
            setListOpen(false);
            return result;
          }}
          onSave={(id, payload) => {
            updateCustomer(id, payload);
          }}
        />
      ) : null}
    </AtelierWorkroom>
  );
}

function ClientEditorDialog({
  client,
  onClose,
  onReceive,
  onSave,
}: {
  client: Customer | null;
  onClose: () => void;
  onReceive: (data: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
  }) => { success: boolean; error?: string };
  onSave: (
    id: string,
    data: {
      fullName: string;
      phone: string;
      email: string;
      address: string;
      notes: string;
    }
  ) => void;
}) {
  const [form, setForm] = useState({
    fullName: client?.fullName || '',
    phone: client?.phone || '',
    email: client?.email || '',
    address: client?.address || '',
    notes: client?.notes || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const payload = normalizeClientPayload(form);
    if (!payload.fullName) {
      setError('A name is required.');
      return;
    }
    if (!payload.phone) {
      setError('A phone number is required.');
      return;
    }
    if (!isValidEmail(payload.email)) {
      setError('Enter a valid email, or leave it blank.');
      return;
    }
    setSaving(true);
    setError(null);
    if (client) {
      onSave(client.id, payload);
      onClose();
      return;
    }
    const result = onReceive(payload);
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'This workspace could not receive the client.');
      return;
    }
    onClose();
  }

  return (
    <Dialog open title={client ? 'Edit dossier' : 'Receive client'} size="lg" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        {error ? (
          <p role="alert" className="text-body text-status-danger">
            {error}
          </p>
        ) : null}
        <Field label="Full name" htmlFor="client-name" required>
          <Input
            id="client-name"
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            autoComplete="name"
          />
        </Field>
        <Field label="Phone" htmlFor="client-phone" required>
          <Input
            id="client-phone"
            type="tel"
            className="font-numeric"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            autoComplete="tel"
          />
        </Field>
        <Field label="Email" htmlFor="client-email">
          <Input
            id="client-email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            autoComplete="email"
          />
        </Field>
        <Field label="Address" htmlFor="client-address">
          <Textarea
            id="client-address"
            value={form.address}
            onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
          />
        </Field>
        <Field label="Fitting notes" htmlFor="client-notes" hint="Preferences, allergies, and how this person likes to be dressed.">
          <Textarea
            id="client-notes"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </Field>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={saving}>
            {client ? 'Save dossier' : 'Receive client'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
