export interface SyncEvent {
  id: string;
  groupId: string;
  entityType: 'group' | 'expense' | 'settlement' | 'member';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  data: string; // JSON.stringify() of entity snapshot
  timestamp: string; // ISO 8601
  authorEmail: string;
  synced: 0 | 1; // 0 = pending push, 1 = pushed to sheet
}

export interface SyncMeta {
  groupId: string;
  spreadsheetId: string;
  lastSyncedRow: number;
  lastSyncedAt: string;
  lastRemoteModifiedTime: string;
  ownerEmail: string;
  syncEnabled: boolean;
}

export type SyncConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type SyncOperationStatus = 'idle' | 'pushing' | 'pulling' | 'error';

export interface SyncState {
  isSignedIn: boolean;
  userEmail: string | null;
  userDisplayName: string | null;
  connectionStatus: SyncConnectionStatus;
  operationStatus: SyncOperationStatus;
  lastSyncAt: string | null;
  error: string | null;
  syncedGroupIds: string[];
  discoveredGroups: DiscoveredGroup[];
}

export interface DiscoveredGroup {
  spreadsheetId: string;
  groupName: string;
  ownerEmail: string;
  sharedAt: string;
}

export interface SheetEventRow {
  eventId: string;
  entityType: string;
  entityId: string;
  action: string;
  data: string;
  timestamp: string;
  authorEmail: string;
}

export interface GoogleUser {
  email: string;
  name: string;
  accessToken: string;
  expiresAt: number; // epoch ms
}
