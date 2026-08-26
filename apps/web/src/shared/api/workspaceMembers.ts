import { apiGet, apiPost, apiDelete } from '../utils/api';

export interface ApiWorkspaceMember {
  id: string;
  email: string;
  fullName: string;
  role: 'owner' | 'admin' | 'assistant';
}
export async function fetchWorkspaceMembers(workspaceId: string): Promise<ApiWorkspaceMember[]> {
  try { return await apiGet<ApiWorkspaceMember[]>(`/settings/workspace-members?workspaceId=${workspaceId}`); } catch { return []; }
}
export async function createWorkspaceMember(workspaceId: string, data: { email: string; fullName: string; role: 'assistant' }): Promise<ApiWorkspaceMember> {
  return apiPost<ApiWorkspaceMember>('/settings/workspace-members', { ...data, workspaceId });
}
export async function deleteWorkspaceMember(memberId: string): Promise<void> {
  await apiDelete(`/settings/workspace-members/${memberId}`);
}