const DRIVE_CLIENT_ID = '';
const DRIVE_API_KEY = '';
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let tokenClient = null;
let gapiInited = false;
let gisInited = false;

export function initGapi() {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('client:picker', async () => {
        await window.gapi.client.init({ apiKey: DRIVE_API_KEY, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'] });
        gapiInited = true;
        resolve();
      });
    };
    document.head.appendChild(script);
  });
}

export function initGis(callback) {
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.onload = () => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: DRIVE_CLIENT_ID,
      scope: DRIVE_SCOPES,
      callback: (resp) => { if (resp.access_token) callback(resp.access_token); },
    });
    gisInited = true;
  };
  document.head.appendChild(script);
}

export function requestDriveAccess() {
  if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
}

export async function listDriveFolders(accessToken, parentId = 'root') {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name,modifiedTime)&orderBy=name`,
    { headers: { Authorization: 'Bearer ' + accessToken } }
  );
  const data = await res.json();
  return data.files || [];
}

export async function listDriveFiles(accessToken, parentId, mimeTypes = []) {
  let q = `'${parentId}' in parents and trashed=false`;
  if (mimeTypes.length) q += ` and (${mimeTypes.map(m => `mimeType='${m}'`).join(' or ')})`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=name`,
    { headers: { Authorization: 'Bearer ' + accessToken } }
  );
  const data = await res.json();
  return data.files || [];
}

export async function downloadDriveFile(accessToken, fileId) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: 'Bearer ' + accessToken } }
  );
  return await res.arrayBuffer();
}

export async function searchDriveFiles(accessToken, query) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,parents)&orderBy=name`,
    { headers: { Authorization: 'Bearer ' + accessToken } }
  );
  const data = await res.json();
  return data.files || [];
}

export const EXCEL_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv'
];

export function isDriveConnected() {
  return !!localStorage.getItem('drive_token');
}

export function setDriveToken(token) {
  localStorage.setItem('drive_token', token);
}

export function getDriveToken() {
  return localStorage.getItem('drive_token');
}

export function clearDriveToken() {
  localStorage.removeItem('drive_token');
}