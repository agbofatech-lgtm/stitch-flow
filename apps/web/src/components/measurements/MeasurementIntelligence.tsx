/**
 * Phase 13 — Measurement Intelligence main container.
 * Orchestrates: ProfileList → ProfileDetail + ProfileHistory.
 * Manages all API calls, loading/error states, and local caching.
 * Preserves the app's offline-first, state-driven navigation model.
 * Does NOT use React Router — view state is component-local.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ruler } from 'lucide-react';
import type { ApiMeasurementDefinition } from './MeasurementTypes';
import type { ApiMeasurementProfile, ApiProfileFull, ApiProfileComparison } from './MeasurementTypes';
import { ProfileList } from './ProfileList';
import { ProfileDetail } from './ProfileDetail';
import { ProfileHistory } from './ProfileHistory';
import type { SuggestionItem } from './ValidationPanel';
import type { DraftUpdate } from './MeasurementTypes';
import * as svc from '../../modules/services/measurementService';
import { Loading, ErrorState } from '../ui/Feedback';

type View = 'list' | 'detail' | 'history';

const BODY_DEFS_CACHE: { defs: ApiMeasurementDefinition[] | null } = { defs: null };
const GARMENT_DEFS_CACHE: Record<string, ApiMeasurementDefinition[]> = {};

async function loadBodyDefs(): Promise<ApiMeasurementDefinition[]> {
  if (BODY_DEFS_CACHE.defs) return BODY_DEFS_CACHE.defs;
  const defs = await svc.api.listDefinitions({ category: 'body' });
  BODY_DEFS_CACHE.defs = defs;
  return defs;
}

async function loadGarmentDefs(garmentType: string): Promise<ApiMeasurementDefinition[]> {
  if (GARMENT_DEFS_CACHE[garmentType]) return GARMENT_DEFS_CACHE[garmentType];
  const defs = await svc.api.listDefinitions({ garmentType });
  GARMENT_DEFS_CACHE[garmentType] = defs;
  return defs;
}

// Known garment types to pre-load
const KNOWN_GT = ['shirt', 'trouser', 'kaftan', 'dress', 'jacket'];

export function MeasurementIntelligence({
  customerId,
  workspaceId,
}: {
  customerId: string;
  workspaceId: string;
}) {
  const [view, setView] = useState<View>('list');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Profile list state
  const [profiles, setProfiles] = useState<ApiMeasurementProfile[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Profile detail state
  const [profileFull, setProfileFull] = useState<ApiProfileFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Definition registry
  const [bodyDefs, setBodyDefs] = useState<ApiMeasurementDefinition[]>([]);
  const [garmentDefsMap, setGarmentDefsMap] = useState<Record<string, ApiMeasurementDefinition[]>>({});
  const [defsLoading, setDefsLoading] = useState(true);

  // Suggestions
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);

  // Action states
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // History / comparison
  const [comparison, setComparison] = useState<ApiProfileComparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Load definition registry once
  useEffect(() => {
    setDefsLoading(true);
    Promise.all([
      loadBodyDefs(),
      ...KNOWN_GT.map((gt) => loadGarmentDefs(gt).then((defs) => ({ gt, defs }))),
    ])
      .then(([bodyDefsResult, ...garmentResults]) => {
        if (!mounted.current) return;
        setBodyDefs(bodyDefsResult as ApiMeasurementDefinition[]);
        const map: Record<string, ApiMeasurementDefinition[]> = {};
        for (const r of garmentResults as { gt: string; defs: ApiMeasurementDefinition[] }[]) {
          map[r.gt] = r.defs;
        }
        setGarmentDefsMap(map);
      })
      .catch(() => {
        // definitions failed — app still functional with empty defs
      })
      .finally(() => {
        if (mounted.current) setDefsLoading(false);
      });
  }, []);

  // Load profile list
  const loadProfiles = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await svc.listProfiles(customerId, workspaceId);
      if (mounted.current) setProfiles(data);
    } catch {
      if (mounted.current) setListError('Failed to load measurement profiles.');
    } finally {
      if (mounted.current) setListLoading(false);
    }
  }, [customerId, workspaceId]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Load profile detail
  const loadProfileDetail = useCallback(
    async (profileId: string) => {
      setDetailLoading(true);
      setDetailError(null);
      setProfileFull(null);
      setSuggestions([]);
      try {
        const full = await svc.getProfileFull(customerId, profileId, workspaceId);
        if (!mounted.current) return;
        setProfileFull(full);
        // No client-side suggestion computation — suggestions come from backend validation
      } catch {
        if (mounted.current) setDetailError('Failed to load profile details.');
      } finally {
        if (mounted.current) setDetailLoading(false);
      }
    },
    [customerId, workspaceId],
  );

  const handleSelectProfile = useCallback(
    (id: string) => {
      setSelectedProfileId(id);
      setView('detail');
      loadProfileDetail(id);
    },
    [loadProfileDetail],
  );

  const handleBack = () => {
    setView('list');
    setSelectedProfileId(null);
    setProfileFull(null);
    setSuggestions([]);
    setDetailError(null);
  };

  const handleCreate = async () => {
    try {
      const profile = await svc.createProfile(customerId, workspaceId);
      setProfiles((prev) => [profile, ...prev]);
      handleSelectProfile(profile.id);
    } catch {
      setListError('Failed to create profile.');
    }
  };

  const handleSaveDraft = async (data: DraftUpdate) => {
    if (!selectedProfileId) return;
    setSaving(true);
    setDetailError(null);
    try {
      const full = await svc.updateDraft(customerId, selectedProfileId, workspaceId, data);
      if (mounted.current) {
        setProfileFull(full);
        setProfiles((prev) =>
          prev.map((p) => (p.id === full.profile.id ? full.profile : p)),
        );
      }
    } catch (e) {
      if (mounted.current) {
        const msg = e instanceof Error ? e.message : 'Failed to save draft.';
        setDetailError(msg.includes('409') ? 'This profile is immutable (validated/active). Create a new version instead.' : msg);
      }
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedProfileId) return;
    setValidating(true);
    setDetailError(null);
    try {
      // Save first if DRAFT
      if (profileFull?.profile.status === 'DRAFT' && profileFull) {
        // nothing to save if no changes — just call validate
      }
      const result = await svc.validateProfile(customerId, selectedProfileId);
      if (mounted.current) {
        setProfileFull((prev) =>
          prev ? { ...prev, profile: result.profile, validation: result.validation } : null,
        );
        setProfiles((prev) =>
          prev.map((p) => (p.id === result.profile.id ? result.profile : p)),
        );
      }
    } catch (e) {
      if (mounted.current) {
        const msg = e instanceof Error ? e.message : 'Validation failed.';
        setDetailError(msg.includes('422') ? 'Cannot validate: complete all required measurements first.' : msg);
      }
    } finally {
      if (mounted.current) setValidating(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedProfileId) return;
    setActivating(true);
    setDetailError(null);
    try {
      const result = await svc.activateProfile(customerId, selectedProfileId);
      if (mounted.current) {
        setProfileFull((prev) => (prev ? { ...prev, profile: result.profile } : null));
        // Also update list — previous ACTIVE becomes SUPERSEDED
        await loadProfiles();
      }
    } catch (e) {
      if (mounted.current) {
        setDetailError(e instanceof Error ? e.message : 'Activation failed.');
      }
    } finally {
      if (mounted.current) setActivating(false);
    }
  };

  const handleArchive = async (profileId?: string) => {
    const id = profileId ?? selectedProfileId;
    if (!id) return;
    setArchiving(true);
    setDetailError(null);
    try {
      await svc.archiveProfile(customerId, id);
      if (mounted.current) {
        await loadProfiles();
        if (!profileId) {
          // archiving current detail → go back
          handleBack();
        }
      }
    } catch (e) {
      if (mounted.current) {
        setDetailError(e instanceof Error ? e.message : 'Archive failed.');
      }
    } finally {
      if (mounted.current) setArchiving(false);
    }
  };

  const handleNewVersion = async (profileId: string) => {
    try {
      const result = await svc.createNewVersion(customerId, profileId);
      setProfiles((prev) => [result.profile, ...prev]);
      handleSelectProfile(result.profile.id);
    } catch {
      setListError('Failed to create new version.');
    }
  };

  const handleCompare = async (currentId: string, previousId: string) => {
    setComparisonLoading(true);
    try {
      const c = await svc.compareProfiles(customerId, currentId, previousId);
      if (mounted.current) setComparison(c);
    } catch {
      // comparison failure is non-fatal
    } finally {
      if (mounted.current) setComparisonLoading(false);
    }
  };

  // ---- Render ----

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <Ruler className="h-4 w-4 text-ink-mute" aria-hidden="true" />
        <h2 className="font-display text-base font-semibold text-ink">Measurement Intelligence</h2>
        {profiles.length > 0 && (
          <span className="text-xs text-ink-mute">
            {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
          </span>
        )}
        {view === 'list' && profiles.length > 1 && (
          <button
            type="button"
            onClick={() => setView('history')}
            className="ml-auto text-xs font-semibold text-gold hover:text-gold-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            Compare History
          </button>
        )}
        {view === 'history' && (
          <button
            type="button"
            onClick={() => setView('list')}
            className="ml-auto text-xs font-semibold text-ink-soft hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            ← Back to Profiles
          </button>
        )}
      </div>

      {defsLoading && <Loading label="Loading measurement definitions…" />}

      {!defsLoading && view === 'list' && (
        <ProfileList
          profiles={profiles}
          loading={listLoading}
          error={listError}
          onSelect={handleSelectProfile}
          onCreate={handleCreate}
          onArchive={(id) => handleArchive(id)}
          onNewVersion={handleNewVersion}
        />
      )}

      {!defsLoading && view === 'history' && (
        <ProfileHistory
          profiles={profiles}
          loadingComparison={comparisonLoading}
          comparison={comparison}
          onCompare={handleCompare}
        />
      )}

      {view === 'detail' && (
        <>
          {detailLoading && <Loading label="Loading profile…" />}
          {detailError && !profileFull && <ErrorState message={detailError} />}
          {profileFull && (
            <ProfileDetail
              profile={profileFull.profile}
              sets={profileFull.sets}
              validation={profileFull.validation}
              bodyDefs={bodyDefs}
              garmentDefsMap={garmentDefsMap}
              suggestions={suggestions}
              saving={saving}
              validating={validating}
              activating={activating}
              archiving={archiving}
              error={detailError}
              onBack={handleBack}
              onSaveDraft={handleSaveDraft}
              onValidate={handleValidate}
              onActivate={handleActivate}
              onArchive={() => handleArchive()}
              onUseSuggestion={(code, valueCm) => {
                // Injecting suggestion is handled inside ProfileDetail
                // This callback just acknowledges the user intent
                setSuggestions((prev) => prev.filter((s) => s.definitionCode !== code));
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
