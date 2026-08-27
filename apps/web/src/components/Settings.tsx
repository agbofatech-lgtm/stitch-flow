import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useApp } from '../context/AppContext';
import { AccountPanel } from './AccountPanel';
import {
  Crown,
  Users,
  Shield,
  Check,
  X,
  Lock,
  Upload,
  Image as ImageIcon,
  Trash2,
  Droplets,
  Building2,
  Mail,
  Phone,
  MapPin,
  Palette,
  Info,
} from 'lucide-react';
import { FEATURE_COMPARISON } from '@modules/services/tierEnforcement';
import type { CurrencyCode } from '../types';
import { safeCurrency } from '@shared/utils/currency';
import { BRAND } from '../config/brand';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';
import { fetchSettings, updateSetting } from '@shared/api/settings';
import {
  fetchWorkspaceMembers,
  createWorkspaceMember,
  deleteWorkspaceMember,
  type ApiWorkspaceMember,
} from '@shared/api/workspaceMembers';
export function Settings() {
  const {
    currentWorkspace,
    featureAccess,
    tierSimulation,
    simulateTier,
    canPerform,
    updateWorkspaceBranding,
    updateWorkspaceProfile,
  } = useApp();

  const canManageBilling = canPerform('manage_billing');
  const canManageAssistants = canPerform('manage_assistants');
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const effectiveWorkspaceId = currentWorkspace.id || 'default-workspace';

  const [members, setMembers] = useState<ApiWorkspaceMember[]>([]);

  const [assistantForm, setAssistantForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    canManageCustomers: true,
    canManageOrders: true,
    canManagePayments: false,
  });

  const [profileForm, setProfileForm] = useState({
    ownerName: '',
    name: currentWorkspace.name || '',
    defaultCurrency: currentWorkspace.defaultCurrency || 'GHS',
    phone: currentWorkspace.phone || '',
    email: currentWorkspace.email || '',
    address: currentWorkspace.address || '',
  });

  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadBackendSettings = async () => {
      try {
        setSettingsLoading(true);
        setSettingsError(null);

        const settings = await fetchSettings();

        if (!active) return;

        const workspaceProfile =
          (settings.workspace_profile as Record<string, unknown> | undefined) || {};
        const branding =
          (settings.branding as Record<string, unknown> | undefined) || {};

        const backendMembers = await fetchWorkspaceMembers(effectiveWorkspaceId);
        if (!active) return;
        setMembers(backendMembers);

        setProfileForm((prev) => ({
          ...prev,
          name: String(workspaceProfile.name ?? prev.name ?? ''),
          defaultCurrency: safeCurrency(
            String(workspaceProfile.defaultCurrency ?? prev.defaultCurrency ?? 'GHS')
          ),
          phone: String(workspaceProfile.phone ?? prev.phone ?? ''),
          email: String(workspaceProfile.email ?? prev.email ?? ''),
          address: String(workspaceProfile.address ?? prev.address ?? ''),
          ownerName: String(workspaceProfile.ownerName ?? ''),
        }));

        updateWorkspaceProfile({
          ownerName: String(workspaceProfile.ownerName ?? ''),
          name: String(workspaceProfile.name ?? currentWorkspace.name ?? ''),
          defaultCurrency: String(
            workspaceProfile.defaultCurrency ?? currentWorkspace.defaultCurrency ?? 'GHS'
          ) as CurrencyCode,
          phone: String(workspaceProfile.phone ?? currentWorkspace.phone ?? ''),
          email: String(workspaceProfile.email ?? currentWorkspace.email ?? ''),
          address: String(workspaceProfile.address ?? currentWorkspace.address ?? ''),
        });

        updateWorkspaceBranding({
          brandColor: String(
            branding.brandColor ?? currentWorkspace.brandColor ?? BRAND.colors.primary
          ),
          logoUrl:
            typeof branding.logoUrl === 'string'
              ? branding.logoUrl
              : currentWorkspace.logoUrl ?? null,
          useLogoAsWatermark:
            typeof branding.useLogoAsWatermark === 'boolean'
              ? branding.useLogoAsWatermark
              : !!currentWorkspace.useLogoAsWatermark,
        });
      } catch (error) {
        if (!active) return;
        setSettingsError(
          error instanceof Error ? error.message : 'Failed to load backend settings'
        );
      } finally {
        if (active) {
          setSettingsLoading(false);
        }
      }
    };

    void loadBackendSettings();

    return () => {
      active = false;
    };
  }, []);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const logoUrl = (event.target?.result as string) || null;

      updateWorkspaceBranding({
        logoUrl,
      });

      try {
        setSettingsSaving(true);
        setSettingsError(null);
        setSettingsMessage(null);

        await updateSetting('branding', {
          logoUrl,
          brandColor: currentWorkspace.brandColor || BRAND.colors.primary,
          useLogoAsWatermark: !!currentWorkspace.useLogoAsWatermark,
        });

        setSettingsMessage('Logo uploaded and saved.');
      } catch (error) {
        setSettingsError(
          error instanceof Error ? error.message : 'Failed to save uploaded logo'
        );
      } finally {
        setSettingsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddAssistant = async () => {
    try {
      setSettingsSaving(true);
      setSettingsError(null);
      setSettingsMessage(null);

      if (!assistantForm.fullName.trim()) {
        setSettingsError('Assistant name is required.');
        return;
      }

      if (!assistantForm.email.trim() && !assistantForm.phone.trim()) {
        setSettingsError('Provide either assistant email or phone number.');
        return;
      }

      const created = await createWorkspaceMember({
        workspaceId: effectiveWorkspaceId,
        fullName: assistantForm.fullName.trim(),
        email: assistantForm.email.trim(),
        phone: assistantForm.phone.trim(),
        role: 'assistant',
        canManageCustomers: assistantForm.canManageCustomers,
        canManageOrders: assistantForm.canManageOrders,
        canManagePayments: assistantForm.canManagePayments,
      });

      setMembers((prev) => [...prev, created]);
      setAssistantForm({
        fullName: '',
        email: '',
        phone: '',
        canManageCustomers: true,
        canManageOrders: true,
        canManagePayments: false,
      });
      setSettingsMessage('Assistant added successfully.');
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : 'Failed to add assistant'
      );
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleDeleteAssistant = async (memberId: string) => {
    try {
      setSettingsSaving(true);
      setSettingsError(null);
      setSettingsMessage(null);

      await deleteWorkspaceMember(memberId);
      setMembers((prev) => prev.filter((member) => member.id !== memberId));
      setSettingsMessage('Assistant removed.');
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : 'Failed to remove assistant'
      );
    } finally {
      setSettingsSaving(false);
    }
  };
  const handleSaveProfile = async () => {
    try {
      setSettingsSaving(true);
      setSettingsError(null);
      setSettingsMessage(null);

      const payload = {
        ownerName: profileForm.ownerName,
        name: profileForm.name,
        defaultCurrency: profileForm.defaultCurrency as CurrencyCode,
        phone: profileForm.phone,
        email: profileForm.email,
        address: profileForm.address,
      };

      updateWorkspaceProfile(payload);

      await updateSetting('workspace_profile', payload);

      setSettingsMessage('Company profile saved.');
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : 'Failed to save company profile'
      );
    } finally {
      setSettingsSaving(false);
    }
  };

  const planKey = tierSimulation as keyof typeof FEATURE_COMPARISON;
  const currentPlan = FEATURE_COMPARISON[planKey] || FEATURE_COMPARISON.BASIC;

  const planColors =
    tierSimulation === 'STUDIO'
      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
      : tierSimulation === 'PRO'
        ? 'bg-[#0F6E8C] text-white'
        : 'bg-slate-100 text-slate-700';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="mx-auto max-w-6xl p-4 lg:p-8">
        <AccountPanel />
        <div className="mb-8 overflow-hidden rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#0F6E8C]/10 px-3 py-1 text-sm font-medium text-[#0F6E8C]">
                <Palette className="h-4 w-4" />
                {BRAND.productName} by {BRAND.parentName}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
                Settings
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 lg:text-base">
                Manage your workspace profile, branding, subscription, and team access.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
              <div className="mb-3 flex items-center gap-3">
                <img
                  src={stitchflowLogo}
                  alt={`${BRAND.productName} logo`}
                  className="h-11 w-auto"
                />
              </div>

              <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 ${planColors}`}>
                {tierSimulation !== 'BASIC' && <Crown className="h-4 w-4" />}
                <span className="font-semibold">{currentPlan.name}</span>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                Active workspace:{' '}
                <span className="font-medium text-slate-800">{currentWorkspace.name}</span>
              </p>
            </div>
          </div>
        </div>

        {(settingsLoading || settingsSaving || settingsMessage || settingsError) && (
          <div className="mb-6 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            {settingsLoading && (
              <p className="text-sm text-slate-600">Loading backend settings...</p>
            )}
            {settingsSaving && (
              <p className="text-sm text-[#0F6E8C]">Saving settings...</p>
            )}
            {settingsMessage && (
              <p className="text-sm text-green-700">{settingsMessage}</p>
            )}
            {settingsError && (
              <p className="text-sm text-red-700">{settingsError}</p>
            )}
          </div>
        )}

        <div className="mb-6 rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Company Profile</h2>
            <p className="mt-1 text-sm text-slate-500">
              Update the business information used across the app and branded invoice exports.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
  <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
    <Users className="h-4 w-4 text-slate-400" />
    Owner Name
  </label>
  <input
    type="text"
    value={profileForm.ownerName || ''}
    onChange={(e) =>
      setProfileForm((prev) => ({ ...prev, ownerName: e.target.value }))
    }
    className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
    placeholder="Enter owner name"
  />
</div>
<div className="md:col-span-2">
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Building2 className="h-4 w-4 text-slate-400" />
                Company Name
              </label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#0F6E8C] focus:ring-2 focus:ring-[#0F6E8C]/15"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Palette className="h-4 w-4 text-slate-400" />
                Default Currency
              </label>
              <select
                value={profileForm.defaultCurrency}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    defaultCurrency: safeCurrency(e.target.value),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#0F6E8C] focus:ring-2 focus:ring-[#0F6E8C]/15"
              >
                <option value="GHS">GHS</option>
                <option value="USD">USD</option>
                <option value="NGN">NGN</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Phone className="h-4 w-4 text-slate-400" />
                Business Phone
              </label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#0F6E8C] focus:ring-2 focus:ring-[#0F6E8C]/15"
                placeholder="+233 24 000 0000"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4 text-slate-400" />
                Business Email
              </label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#0F6E8C] focus:ring-2 focus:ring-[#0F6E8C]/15"
                placeholder="studio@example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-slate-400" />
                Business Address
              </label>
              <textarea
                value={profileForm.address}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, address: e.target.value }))
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#0F6E8C] focus:ring-2 focus:ring-[#0F6E8C]/15"
                placeholder="East Legon, Accra, Ghana"
              />
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={handleSaveProfile}
              className="rounded-xl bg-[#0F6E8C] px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-[#0C5C74]"
            >
              Save Company Profile
            </button>
          </div>
        </div>

        {(settingsLoading || settingsSaving || settingsMessage || settingsError) && (
          <div className="mb-6 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            {settingsLoading && (
              <p className="text-sm text-slate-600">Loading backend settings...</p>
            )}
            {settingsSaving && (
              <p className="text-sm text-[#0F6E8C]">Saving settings...</p>
            )}
            {settingsMessage && (
              <p className="text-sm text-green-700">{settingsMessage}</p>
            )}
            {settingsError && (
              <p className="text-sm text-red-700">{settingsError}</p>
            )}
          </div>
        )}

        <div className="mb-6 rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
              <p className="mt-1 text-sm text-slate-500">{currentWorkspace.name}</p>
            </div>

            <div className={`flex items-center gap-2 rounded-xl px-4 py-2 ${planColors}`}>
              {tierSimulation !== 'BASIC' && <Crown className="h-4 w-4" />}
              <span className="font-semibold">{currentPlan.name}</span>
            </div>
          </div>

          {tierSimulation === 'BASIC' ? (
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
              <h3 className="mb-2 font-medium text-sky-900">Upgrade your workspace</h3>
              <p className="mb-4 text-sm text-sky-700">
                Unlock PDF export, branding, advanced workflow tools, reports, and more.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => canManageBilling && simulateTier('PRO')}
                  disabled={!canManageBilling}
                  className={`rounded-xl px-4 py-2.5 font-medium ${
                    canManageBilling
                      ? 'bg-[#0F6E8C] text-white hover:bg-[#0C5C74]'
                      : 'cursor-not-allowed bg-slate-200 text-slate-400'
                  }`}
                >
                  {canManageBilling ? 'Upgrade to Pro' : 'Owner access required'}
                </button>

                <button
                  onClick={() => canManageBilling && simulateTier('STUDIO')}
                  disabled={!canManageBilling}
                  className={`rounded-xl px-4 py-2.5 font-medium ${
                    canManageBilling
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'cursor-not-allowed bg-slate-200 text-slate-400'
                  }`}
                >
                  {canManageBilling ? 'Upgrade to Studio' : 'Owner access required'}
                </button>
              </div>
            </div>
          ) : tierSimulation === 'PRO' ? (
            <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
              <div className="flex items-center gap-2 text-green-800">
                <Check className="h-5 w-5" />
                <span className="font-medium">You're on Pro</span>
              </div>
              <p className="mt-1 text-sm text-green-700">
                Branded exports, PDF downloads, analytics, and inventory tools are available.
              </p>

              {canManageBilling && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    onClick={() => simulateTier('STUDIO')}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                  >
                    Upgrade to Studio
                  </button>

                  <button
                    onClick={() => simulateTier('BASIC')}
                    className="rounded-xl px-4 py-2 text-sm text-slate-500 underline hover:text-slate-700"
                  >
                    Simulate Basic plan
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <Crown className="h-5 w-5" />
                <span className="font-medium">You're on Studio</span>
              </div>
              <p className="mt-1 text-sm text-amber-700">
                Full branded exports, watermark support, advanced reports, and Studio insights are
                unlocked.
              </p>

              {canManageBilling && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    onClick={() => simulateTier('PRO')}
                    className="rounded-xl bg-[#0F6E8C] px-4 py-2 text-sm font-medium text-white hover:bg-[#0C5C74]"
                  >
                    Simulate Pro plan
                  </button>

                  <button
                    onClick={() => simulateTier('BASIC')}
                    className="rounded-xl px-4 py-2 text-sm text-slate-500 underline hover:text-slate-700"
                  >
                    Simulate Basic plan
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {(settingsLoading || settingsSaving || settingsMessage || settingsError) && (
          <div className="mb-6 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            {settingsLoading && (
              <p className="text-sm text-slate-600">Loading backend settings...</p>
            )}
            {settingsSaving && (
              <p className="text-sm text-[#0F6E8C]">Saving settings...</p>
            )}
            {settingsMessage && (
              <p className="text-sm text-green-700">{settingsMessage}</p>
            )}
            {settingsError && (
              <p className="text-sm text-red-700">{settingsError}</p>
            )}
          </div>
        )}

        <div className="mb-6 rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Branding</h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload your business logo so it appears on invoice PDFs and branded exports.
            </p>
          </div>

          {!featureAccess.canBrandExport.allowed ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <Lock className="h-4 w-4" />
                <span className="font-medium">
                  {featureAccess.canBrandExport.reason || 'Branded export requires Pro plan'}
                </span>
              </div>
              <p className="mt-1 text-sm text-amber-700">
                Upgrade to enable logo branding on invoices and exported documents.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                {currentWorkspace.logoUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <div className="flex aspect-square items-center justify-center bg-white p-4">
                      <img
                        src={currentWorkspace.logoUrl}
                        alt="Workspace logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div className="flex gap-2 border-t border-slate-200 p-3">
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Upload className="h-4 w-4" />
                        Replace
                      </button>

                      <button
                        onClick={async () => {
                          updateWorkspaceBranding({
                            logoUrl: null,
                          });

                          try {
                            await updateSetting('branding', {
                              logoUrl: null,
                              brandColor: currentWorkspace.brandColor || BRAND.colors.primary,
                              useLogoAsWatermark: !!currentWorkspace.useLogoAsWatermark,
                            });

                            setSettingsMessage('Logo removed.');
                          } catch (error) {
                            setSettingsError(
                              error instanceof Error
                                ? error.message
                                : 'Failed to remove logo'
                            );
                          }
                        }}
                        className="flex items-center justify-center rounded-xl bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="flex aspect-square w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-[#0F6E8C] hover:bg-sky-50"
                  >
                    <ImageIcon className="mb-3 h-8 w-8 text-slate-400" />
                    <span className="font-medium text-slate-700">Upload Logo</span>
                    <span className="mt-1 text-sm text-slate-500">
                      PNG, JPG, or other image formats
                    </span>
                  </button>
                )}
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <h3 className="mb-2 font-medium text-slate-900">Brand Settings</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Brand Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={currentWorkspace.brandColor || BRAND.colors.primary}
                          onChange={async (e) => {
                            const brandColor = e.target.value;

                            updateWorkspaceBranding({
                              brandColor,
                            });

                            try {
                              await updateSetting('branding', {
                                logoUrl: currentWorkspace.logoUrl || null,
                                brandColor,
                                useLogoAsWatermark: !!currentWorkspace.useLogoAsWatermark,
                              });
                            } catch (error) {
                              setSettingsError(
                                error instanceof Error
                                  ? error.message
                                  : 'Failed to save brand color'
                              );
                            }
                          }}
                          className="h-11 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1"
                        />
                        <input
                          type="text"
                          value={currentWorkspace.brandColor || BRAND.colors.primary}
                          onChange={async (e) => {
                            const brandColor = e.target.value;

                            updateWorkspaceBranding({
                              brandColor,
                            });

                            try {
                              await updateSetting('branding', {
                                logoUrl: currentWorkspace.logoUrl || null,
                                brandColor,
                                useLogoAsWatermark: !!currentWorkspace.useLogoAsWatermark,
                              });
                            } catch (error) {
                              setSettingsError(
                                error instanceof Error
                                  ? error.message
                                  : 'Failed to save brand color'
                              );
                            }
                          }}
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0F6E8C] focus:ring-2 focus:ring-[#0F6E8C]/15"
                          placeholder="#0F6E8C"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                      <input
                        type="checkbox"
                        checked={!!currentWorkspace.useLogoAsWatermark}
                        onChange={async (e) => {
                          const useLogoAsWatermark = e.target.checked;

                          updateWorkspaceBranding({
                            useLogoAsWatermark,
                          });

                          try {
                            await updateSetting('branding', {
                              logoUrl: currentWorkspace.logoUrl || null,
                              brandColor: currentWorkspace.brandColor || BRAND.colors.primary,
                              useLogoAsWatermark,
                            });
                          } catch (error) {
                            setSettingsError(
                              error instanceof Error
                                ? error.message
                                : 'Failed to save watermark setting'
                            );
                          }
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="flex items-center gap-2 font-medium text-slate-900">
                          <Droplets className="h-4 w-4 text-slate-500" />
                          Use logo as watermark
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          When enabled, the uploaded logo appears faintly behind invoice PDF
                          content.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-2 font-medium text-slate-900">How it works</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>• Your uploaded logo appears in invoice PDF exports.</li>
                    <li>• Watermark uses the same uploaded logo.</li>
                    <li>• Brand color can be reused across branded export styling.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {(settingsLoading || settingsSaving || settingsMessage || settingsError) && (
          <div className="mb-6 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            {settingsLoading && (
              <p className="text-sm text-slate-600">Loading backend settings...</p>
            )}
            {settingsSaving && (
              <p className="text-sm text-[#0F6E8C]">Saving settings...</p>
            )}
            {settingsMessage && (
              <p className="text-sm text-green-700">{settingsMessage}</p>
            )}
            {settingsError && (
              <p className="text-sm text-red-700">{settingsError}</p>
            )}
          </div>
        )}

        <div className="mb-6 rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-[#0F6E8C]" />
            <h2 className="text-lg font-semibold text-slate-900">About</h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <img
              src={stitchflowLogo}
              alt={`${BRAND.productName} logo`}
              className="h-11 w-auto"
            />
            <p className="mt-3 text-sm text-slate-500">Version {BRAND.version}</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {BRAND.productName} is a tailoring business management platform for fashion SMEs.
            </p>
            <p className="mt-2 text-sm font-medium text-[#0F6E8C]">
              An {BRAND.parentName} Product
            </p>
          </div>
        </div>

        {(settingsLoading || settingsSaving || settingsMessage || settingsError) && (
          <div className="mb-6 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            {settingsLoading && (
              <p className="text-sm text-slate-600">Loading backend settings...</p>
            )}
            {settingsSaving && (
              <p className="text-sm text-[#0F6E8C]">Saving settings...</p>
            )}
            {settingsMessage && (
              <p className="text-sm text-green-700">{settingsMessage}</p>
            )}
            {settingsError && (
              <p className="text-sm text-red-700">{settingsError}</p>
            )}
          </div>
        )}

        <div className="mb-6 rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Plan Comparison</h2>

          <div className="overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-4 gap-4 text-sm">
              <div className="font-medium text-slate-700">Feature</div>
              <div className="text-center font-medium text-slate-700">
                {FEATURE_COMPARISON.BASIC.name}
              </div>
              <div className="text-center font-medium text-[#0F6E8C]">
                {FEATURE_COMPARISON.PRO.name}
              </div>
              <div className="text-center font-medium text-amber-600">
                {FEATURE_COMPARISON.STUDIO.name}
              </div>

              {(FEATURE_COMPARISON.BASIC.features ?? []).map((feature, i) => (
                <div key={`row-${i}`} className="contents">
                  <div className="border-t border-slate-100 py-2">{feature.name}</div>

                  <div className="flex justify-center border-t border-slate-100 py-2">
                    {FEATURE_COMPARISON.BASIC.features[i].included ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-slate-300" />
                    )}
                  </div>

                  <div className="flex justify-center border-t border-slate-100 py-2">
                    {FEATURE_COMPARISON.PRO.features[i]?.included ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-slate-300" />
                    )}
                  </div>

                  <div className="flex justify-center border-t border-slate-100 py-2">
                    {FEATURE_COMPARISON.STUDIO.features[i]?.included ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {(settingsLoading || settingsSaving || settingsMessage || settingsError) && (
          <div className="mb-6 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            {settingsLoading && (
              <p className="text-sm text-slate-600">Loading backend settings...</p>
            )}
            {settingsSaving && (
              <p className="text-sm text-[#0F6E8C]">Saving settings...</p>
            )}
            {settingsMessage && (
              <p className="text-sm text-green-700">{settingsMessage}</p>
            )}
            {settingsError && (
              <p className="text-sm text-red-700">{settingsError}</p>
            )}
          </div>
        )}

        <div className="mb-6 rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
              <p className="text-sm text-slate-500">
                {members.length} member{members.length !== 1 && 's'}
                {featureAccess.canInviteAssistant.limit !== undefined &&
                  ` • ${featureAccess.canInviteAssistant.limit} assistant seats available`}
              </p>
            </div>

            <button
              disabled={!canManageAssistants || !featureAccess.canInviteAssistant.allowed}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium ${
                canManageAssistants && featureAccess.canInviteAssistant.allowed
                  ? 'bg-[#0F6E8C] text-white hover:bg-[#0C5C74]'
                  : 'cursor-not-allowed bg-slate-100 text-slate-400'
              }`}
            >
              {!featureAccess.canInviteAssistant.allowed ? (
                <>
                  <Lock className="h-4 w-4" />
                  Upgrade to Add
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Invite Member
                </>
              )}
            </button>
          </div>

          {!featureAccess.canInviteAssistant.allowed && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              {featureAccess.canInviteAssistant.reason}
            </div>
          )}

          {canManageAssistants && featureAccess.canInviteAssistant.allowed && (
  <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <h3 className="mb-3 font-medium text-slate-900">Invite Assistant</h3>

    <div className="grid gap-3 md:grid-cols-2">
      <input
        type="text"
        placeholder="Assistant full name"
        value={assistantForm.fullName}
        onChange={(e) =>
          setAssistantForm((prev) => ({ ...prev, fullName: e.target.value }))
        }
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#0F6E8C] focus:ring-2 focus:ring-[#0F6E8C]/15"
      />

      <input
        type="email"
        placeholder="assistant@email.com (optional)"
        value={assistantForm.email}
        onChange={(e) =>
          setAssistantForm((prev) => ({ ...prev, email: e.target.value }))
        }
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#0F6E8C] focus:ring-2 focus:ring-[#0F6E8C]/15"
      />

      <input
        type="text"
        placeholder="+233 24 000 0000 (optional)"
        value={assistantForm.phone}
        onChange={(e) =>
          setAssistantForm((prev) => ({ ...prev, phone: e.target.value }))
        }
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#0F6E8C] focus:ring-2 focus:ring-[#0F6E8C]/15"
      />
    </div>

    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={assistantForm.canManageCustomers}
          onChange={(e) =>
            setAssistantForm((prev) => ({
              ...prev,
              canManageCustomers: e.target.checked,
            }))
          }
        />
        Customers
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={assistantForm.canManageOrders}
          onChange={(e) =>
            setAssistantForm((prev) => ({
              ...prev,
              canManageOrders: e.target.checked,
            }))
          }
        />
        Orders
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={assistantForm.canManagePayments}
          onChange={(e) =>
            setAssistantForm((prev) => ({
              ...prev,
              canManagePayments: e.target.checked,
            }))
          }
        />
        Payments
      </label>
    </div>

    <div className="mt-4">
      <button
        onClick={handleAddAssistant}
        type="button"
        className="rounded-xl bg-[#0F6E8C] px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-[#0C5C74]"
      >
        Add Assistant
      </button>
    </div>
  </div>
)}
<div className="space-y-3">
            {(members ?? []).filter((member) => member.role === 'assistant').map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                    <span className="font-semibold text-[#0F6E8C]">
                      {member.user.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{member.user.fullName}</span>
                      {member.role === 'owner' && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Owner
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-slate-500">{member.user.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {member.role === 'assistant' && (
                    <>
                      <div className="space-x-2 text-xs text-slate-400">
                        {member.canManageCustomers && <span>Customers</span>}
                        {member.canManageOrders && <span>Orders</span>}
                        {member.canManagePayments && <span>Payments</span>}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteAssistant(member.id)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Role Permissions</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <span className="font-semibold text-slate-900">Owner</span>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Manage billing & subscription
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Invite and manage team members
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Full access to all features
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Export invoices and reports
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span className="font-semibold text-slate-900">Assistant</span>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-400" />
                  Cannot manage billing
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-400" />
                  Cannot invite assistants
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  View and edit assigned data
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 text-center text-amber-500">~</span>
                  Export only if permitted
                </li>
              </ul>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">{BRAND.footerText}</p>
        </div>
      </div>
    </div>
  );
}






















































