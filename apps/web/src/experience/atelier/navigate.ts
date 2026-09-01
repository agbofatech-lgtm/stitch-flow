import type { StudioWorkspaceId } from '../../studio/workspaces';

type Handler = (room: StudioWorkspaceId) => void;

let handler: Handler | null = null;

export function registerAtelierRoomHandler(next: Handler) {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

export function goAtelierRoom(room: StudioWorkspaceId) {
  handler?.(room);
}
