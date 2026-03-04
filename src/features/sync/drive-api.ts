import { ensureValidToken } from './google-auth';
import { APP_PROPERTY_KEY, APP_PROPERTY_VALUE } from './constants';

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';

async function authHeaders(): Promise<HeadersInit> {
  const token = await ensureValidToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function getFileModifiedTime(fileId: string): Promise<string> {
  const headers = await authHeaders();
  const res = await fetch(
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?fields=modifiedTime`,
    { headers },
  );
  if (!res.ok) throw new Error(`Drive files.get failed: ${res.status}`);
  const data = await res.json();
  return data.modifiedTime as string;
}

export async function shareWithUser(
  fileId: string,
  email: string,
  role: 'writer' | 'reader' = 'writer',
): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}/permissions`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'user',
        role,
        emailAddress: email,
      }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Share failed: ${(err as { error?: { message?: string } }).error?.message || res.status}`,
    );
  }
}

export async function listPermissions(
  fileId: string,
): Promise<Array<{ id: string; emailAddress: string; role: string }>> {
  const headers = await authHeaders();
  const res = await fetch(
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}/permissions?fields=permissions(id,emailAddress,role)`,
    { headers },
  );
  if (!res.ok) throw new Error(`List permissions failed: ${res.status}`);
  const data = await res.json();
  return data.permissions || [];
}

export async function revokePermission(
  fileId: string,
  permissionId: string,
): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(permissionId)}`,
    { method: 'DELETE', headers },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Revoke permission failed: ${res.status}`);
  }
}

export async function deleteFile(fileId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}`,
    { method: 'DELETE', headers },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete file failed: ${res.status}`);
  }
}

export async function setFileAppProperties(fileId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        appProperties: { [APP_PROPERTY_KEY]: APP_PROPERTY_VALUE },
      }),
    },
  );
  if (!res.ok)
    throw new Error(`Set appProperties failed: ${res.status}`);
}

export async function discoverSharedSpreadsheets(): Promise<
  Array<{
    id: string;
    name: string;
    owners: Array<{ emailAddress: string }>;
    modifiedTime: string;
  }>
> {
  const headers = await authHeaders();
  const query = `appProperties has { key='${APP_PROPERTY_KEY}' and value='${APP_PROPERTY_VALUE}' } and mimeType='application/vnd.google-apps.spreadsheet'`;
  const res = await fetch(
    `${DRIVE_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,owners,modifiedTime)`,
    { headers },
  );
  if (!res.ok) throw new Error(`Discovery failed: ${res.status}`);
  const data = await res.json();
  return data.files || [];
}
