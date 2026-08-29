/**
 * Phase 13 — Measurement Profile List.
 * Lists all profiles for a customer with status badges, version chain,
 * and actions (view, new version, archive).
 */
import { Clock, Plus, Archive, GitBranch, ChevronRight } from 'lucide-react';
import type { ApiMeasurementProfile, ProfileStatus } from './MeasurementTypes';
import { STATUS_LABEL, STATUS_TONE } from './MeasurementTypes';
import { Badge } from '../ui/Badge';
import type { BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Loading, ErrorState } from '../ui/Feedback';

function ProfileCard({
  profile,
  onSelect,
  onArchive,
  onNewVersion,
}: {
  profile: ApiMeasurementProfile;
  onSelect: (id: string) => void;
  onArchive: (id: string) => void;
  onNewVersion: (id: string) => void;
}) {
  const canArchive =
    profile.status === 'DRAFT' || profile.status === 'VALIDATED' || profile.status === 'ACTIVE';
  const canNewVersion = profile.status === 'ACTIVE' || profile.status === 'VALIDATED';

  return (
    <div className="sf-fade-in rounded-card border border-line bg-surface p-4 shadow-e1 transition-shadow hover:shadow-e2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate font-display text-sm font-semibold text-ink">
              {profile.name || `Profile v${profile.version}`}
            </h4>
            <Badge tone={STATUS_TONE[profile.status] as BadgeTone}>
              {STATUS_LABEL[profile.status]}
            </Badge>
            {profile.version > 1 && (
              <Badge tone="info">v{profile.version}</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-mute">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Taken {profile.dateTaken}
            </span>
            {profile.parentProfileId && (
              <span className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" aria-hidden="true" />
                Continues v{profile.version - 1}
              </span>
            )}
          </div>
          {profile.notes && (
            <p className="mt-1 truncate text-xs text-ink-soft">{profile.notes}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSelect(profile.id)}
            icon={<ChevronRight className="h-3.5 w-3.5" />}
          >
            Open
          </Button>
          {canNewVersion && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNewVersion(profile.id)}
              icon={<GitBranch className="h-3.5 w-3.5" />}
              title="Create a new version from this profile"
            >
              New Version
            </Button>
          )}
          {canArchive && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onArchive(profile.id)}
              icon={<Archive className="h-3.5 w-3.5" />}
              title="Archive this profile"
            >
              Archive
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProfileList({
  profiles,
  loading,
  error,
  onSelect,
  onCreate,
  onArchive,
  onNewVersion,
}: {
  profiles: ApiMeasurementProfile[];
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onArchive: (id: string) => void;
  onNewVersion: (id: string) => void;
}) {
  if (loading) return <Loading label="Loading measurement profiles…" />;
  if (error) return <ErrorState message={error} />;

  // Sort: ACTIVE first, then VALIDATED, then DRAFT, then SUPERSEDED/ARCHIVED
  const ORDER: Record<ProfileStatus, number> = {
    ACTIVE: 0,
    VALIDATED: 1,
    DRAFT: 2,
    SUPERSEDED: 3,
    ARCHIVED: 4,
  };
  const sorted = [...profiles].sort((a, b) => {
    const statusDiff = (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9);
    if (statusDiff !== 0) return statusDiff;
    return b.version - a.version;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">Measurement Profiles</h3>
        <Button
          size="sm"
          variant="primary"
          onClick={onCreate}
          icon={<Plus className="h-3.5 w-3.5" />}
        >
          New Profile
        </Button>
      </div>

      {sorted.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-grey-light/20 py-10 text-center">
          <p className="text-sm text-ink-soft">No measurement profiles yet.</p>
          <Button size="sm" variant="secondary" onClick={onCreate} icon={<Plus className="h-3.5 w-3.5" />}>
            Create First Profile
          </Button>
        </div>
      )}

      <div className="space-y-2 sf-stagger">
        {sorted.map((p) => (
          <ProfileCard
            key={p.id}
            profile={p}
            onSelect={onSelect}
            onArchive={onArchive}
            onNewVersion={onNewVersion}
          />
        ))}
      </div>
    </div>
  );
}
