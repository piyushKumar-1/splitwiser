import { ensureValidToken } from './google-auth';
import {
  SHEET_EVENTS_TAB,
  SHEET_META_TAB,
  SHEET_MEMBERS_TAB,
  EVENTS_HEADER_ROW,
  MEMBERS_HEADER_ROW,
} from './constants';
import type { Member } from '@/shared/types';
import { setFileAppProperties } from './drive-api';
import type { SheetEventRow, SyncEvent } from './types';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function authHeaders(): Promise<HeadersInit> {
  const token = await ensureValidToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function createSpreadsheetWithTitle(
  title: string,
  groupId: string,
  ownerEmail: string,
): Promise<string> {
  const headers = await authHeaders();

  const body = {
    properties: { title },
    sheets: [
      { properties: { title: SHEET_EVENTS_TAB } },
      { properties: { title: SHEET_META_TAB } },
      { properties: { title: SHEET_MEMBERS_TAB } },
    ],
  };

  const res = await fetch(SHEETS_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to create spreadsheet: ${res.status}`);

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId as string;

  // Write header row to events sheet
  await appendRows(spreadsheetId, SHEET_EVENTS_TAB, [EVENTS_HEADER_ROW]);

  // Write meta data
  await appendRows(spreadsheetId, SHEET_META_TAB, [
    ['key', 'value'],
    ['groupId', groupId],
    ['createdBy', ownerEmail],
    ['appVersion', '1'],
  ]);

  // Write header row to members sheet
  await appendRows(spreadsheetId, SHEET_MEMBERS_TAB, [MEMBERS_HEADER_ROW]);

  // Set appProperties on the Drive file for discovery
  await setFileAppProperties(spreadsheetId);

  return spreadsheetId;
}

export async function createSpreadsheet(
  groupName: string,
  groupId: string,
  ownerEmail: string,
): Promise<string> {
  return createSpreadsheetWithTitle(
    `Splitwiser: ${groupName} [${groupId.slice(0, 8)}]`,
    groupId,
    ownerEmail,
  );
}

export async function appendRows(
  spreadsheetId: string,
  sheetTab: string,
  rows: string[][],
): Promise<number> {
  const headers = await authHeaders();
  const range = `${sheetTab}!A:G`;
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ values: rows }),
    },
  );
  if (!res.ok) throw new Error(`Failed to append rows: ${res.status}`);

  const data = await res.json();
  const updatedRange = data.updates?.updatedRange as string | undefined;
  const match = updatedRange?.match(/!A(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function readRows(
  spreadsheetId: string,
  sheetTab: string,
  startRow: number,
): Promise<string[][]> {
  const headers = await authHeaders();
  const range = `${sheetTab}!A${startRow}:G`;
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers },
  );
  if (!res.ok) throw new Error(`Failed to read rows: ${res.status}`);

  const data = await res.json();
  return (data.values as string[][]) || [];
}

export async function getRowCount(
  spreadsheetId: string,
  sheetTab: string,
): Promise<number> {
  const headers = await authHeaders();
  const range = `${sheetTab}!A:A`;
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers },
  );
  if (!res.ok) throw new Error(`Failed to get row count: ${res.status}`);

  const data = await res.json();
  return (data.values as string[][])?.length || 0;
}

export function parseEventRows(rows: string[][]): SheetEventRow[] {
  return rows
    .filter((row) => row.length >= 7 && row[0]) // skip empty rows
    .map((row) => ({
      eventId: row[0],
      entityType: row[1],
      entityId: row[2],
      action: row[3],
      data: row[4],
      timestamp: row[5],
      authorEmail: row[6],
    }));
}

export function eventToRow(event: SyncEvent): string[] {
  return [
    event.id,
    event.entityType,
    event.entityId,
    event.action,
    event.data,
    event.timestamp,
    event.authorEmail,
  ];
}

// ── MEMBERS SHEET HELPERS ──────────────────────────────────────

export async function writeMembersToSheet(
  spreadsheetId: string,
  members: Member[],
): Promise<void> {
  const headers = await authHeaders();
  const values = [MEMBERS_HEADER_ROW, ...members.map((m) => [m.id, m.name, m.email])];
  const range = `${SHEET_MEMBERS_TAB}!A1:C${values.length}`;

  // Clear existing data first
  const clearRes = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(`${SHEET_MEMBERS_TAB}!A:C`)}:clear`,
    { method: 'POST', headers },
  );
  if (!clearRes.ok) throw new Error(`Failed to clear members: ${clearRes.status}`);

  // Write header + members
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({ values }),
    },
  );
  if (!res.ok) throw new Error(`Failed to write members: ${res.status}`);
}

export async function readMembersFromSheet(
  spreadsheetId: string,
): Promise<Member[]> {
  const headers = await authHeaders();
  const range = `${SHEET_MEMBERS_TAB}!A2:C`;
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers },
  );
  if (!res.ok) throw new Error(`Failed to read members: ${res.status}`);

  const data = await res.json();
  const rows = (data.values as string[][]) || [];
  return rows
    .filter((row) => row.length >= 3 && row[0])
    .map((row) => ({ id: row[0], name: row[1], email: row[2] }));
}
