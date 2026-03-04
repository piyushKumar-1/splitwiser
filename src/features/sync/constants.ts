export const GOOGLE_CLIENT_ID = '58456227178-n5sma3eo1i9ps7kamp14cabasthain0j.apps.googleusercontent.com';

export const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
].join(' ');

export const SYNC_POLL_INTERVAL_MS = 20_000;

export const APP_PROPERTY_KEY = 'splitwiser';
export const APP_PROPERTY_VALUE = 'true';

export const SHEET_EVENTS_TAB = 'events';
export const SHEET_META_TAB = 'meta';
export const SHEET_MEMBERS_TAB = 'members';

export const MEMBERS_HEADER_ROW = ['memberId', 'name', 'email'];

export const EVENTS_HEADER_ROW = [
  'eventId',
  'entityType',
  'entityId',
  'action',
  'data',
  'timestamp',
  'authorEmail',
];
