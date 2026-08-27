import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

/**
 * Workspace member API contract. Mirrors
 * apps/backend/src/routes/settingsRoutes.ts (`mapWorkspaceMember`).
 */
export interface ApiWorkspaceMember {
  id: string;
  workspaceId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  role: 'owner' | 'admin' | 'assistant';
  canManageCustomers: boolean;
  canManageOrders: boolean;
  canManagePayments: boolean;
  joinedAt: string;
}

/** Body accepted by POST /settings/workspace-members. */
export type WorkspaceMemberPayload = {
  workspaceId: string;
  fullName: string;
  email?: string;
  phone?: string;
  role?: 'owner' | 'admin' | 'assistant';
  canManageCustomers?: boolean;
  canManageOrders?: boolean;
  canManagePayments?: boolean;
};

export async function fetchWorkspaceMembers(workspaceId: string): Promise<ApiWorkspaceMember[]> {
  try {
    return await apiGet<ApiWorkspaceMember[]>(
      `/settings/workspace-members?workspaceId=${encodeURIComponent(workspaceId)}`
    );
  } catch {
    return [];
  }
}

export async function createWorkspaceMember(
  payload: WorkspaceMemberPayload
): Promise<ApiWorkspaceMember> {
  return apiPost<ApiWorkspaceMember>('/settings/workspace-members', payload);
}

export async function updateWorkspaceMember(
  memberId: string,
  updates: Partial<Omit<WorkspaceMemberPayload, 'workspaceId'>>
): Promise<ApiWorkspaceMember> {
  return apiPut<ApiWorkspaceMember>(
    `/settings/workspace-members/${encodeURIComponent(memberId)}`,
    updates
  );
}

export async function deleteWorkspaceMember(memberId: string): Promise<void> {
  await apiDelete(`/settings/workspace-members/${encodeURIComponent(memberId)}`);
}
