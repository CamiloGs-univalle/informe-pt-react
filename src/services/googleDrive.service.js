/**
 * services/googleDrive.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Thin wrapper around Google's `gapi` + Google Identity Services (GIS)
 * client libraries, used by `views/common/DriveExplorer.jsx` to let a user
 * browse their Google Drive and pick Excel files without leaving the app.
 *
 * This is the only module that talks to `window.gapi` / `window.google`
 * directly — everything else consumes the plain async functions below.
 *
 * (Moved from the previous flat `src/gdrive.js`, same behaviour. The
 * older, unused `src/driveAuth.js` duplicate of this integration was
 * removed — see CHANGELOG.md.)
 */
import { GOOGLE_CLIENT_ID } from '../config/app.config';

const SCOPES = 'https://www.googleapis.com/auth/drive';
let tokenClient = null;
let onTokenCallback = null;
let gapiInited = false;

/** Loads the Google API + Identity Services `<script>` tags (once). */
export async function loadGoogleScripts() {
  const loadScript = (src) => new Promise((resolve) => {
    if (document.querySelector(`script[src*="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    document.head.appendChild(s);
  });
  await loadScript('https://accounts.google.com/gsi/client');
  await loadScript('https://apis.google.com/js/api.js');
}

/** Initializes the OAuth token client; invokes `onToken(accessToken)` once authorized. */
export function initGoogleAuth(onToken) {
  onTokenCallback = onToken;
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (window.gapi && window.google && !gapiInited) {
        clearInterval(check);
        gapiInited = true;
        window.gapi.load('client:picker', async () => {
          await window.gapi.client.init({
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          });
        });
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (resp) => {
            if (resp.error) { console.error('Auth error:', resp); return; }
            localStorage.setItem('gdrive_token', resp.access_token);
            localStorage.setItem('gdrive_token_time', Date.now().toString());
            if (onTokenCallback) onTokenCallback(resp.access_token);
          },
        });
        resolve();
      }
    }, 100);
  });
}

/** Triggers the Google OAuth consent popup. */
export function requestAccessToken() {
  if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
}

/** Returns the cached access token if still fresh (< 50 min old), else null. */
export function getStoredToken() {
  const token = localStorage.getItem('gdrive_token');
  const time = localStorage.getItem('gdrive_token_time');
  if (token && time && (Date.now() - parseInt(time) < 50 * 60 * 1000)) return token;
  localStorage.removeItem('gdrive_token');
  localStorage.removeItem('gdrive_token_time');
  return null;
}

export function setAccessToken(token) {
  localStorage.setItem('gdrive_token', token);
  localStorage.setItem('gdrive_token_time', Date.now().toString());
}

export function clearAccessToken() {
  localStorage.removeItem('gdrive_token');
  localStorage.removeItem('gdrive_token_time');
}

async function gapiRequest(url) {
  const token = getStoredToken();
  if (!token) throw new Error('No token');
  const res = await window.gapi.client.request({
    path: url,
    headers: { Authorization: 'Bearer ' + token },
  });
  return res.result;
}

export async function getDriveUserInfo() {
  return gapiRequest('/drive/v3/about?fields=user');
}

export async function listFolders(parentId = 'root') {
  const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const resp = await gapiRequest(
    `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,mimeType)&orderBy=name&pageSize=200`
  );
  return resp.files || [];
}

export async function listExcelFiles(parentId = 'root') {
  // Fetch everything in the folder, then filter client-side for spreadsheets.
  const q = `'${parentId}' in parents and trashed=false`;
  const resp = await gapiRequest(
    `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=name&pageSize=500`
  );
  const allFiles = resp.files || [];
  const spreadsheetTypes = [
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ];
  return allFiles.filter(f => {
    const isSpreadsheet = spreadsheetTypes.includes(f.mimeType);
    const hasExcelExt = /\.(xlsx?|csv)$/i.test(f.name);
    return isSpreadsheet || hasExcelExt;
  });
}

export async function downloadFile(fileId, mimeType) {
  const token = getStoredToken();
  let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
  }
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('Download failed: ' + res.status);
  return res.arrayBuffer();
}

export async function listAllContents(parentId = 'root') {
  const [folders, files] = await Promise.all([listFolders(parentId), listExcelFiles(parentId)]);
  return { folders, files };
}
