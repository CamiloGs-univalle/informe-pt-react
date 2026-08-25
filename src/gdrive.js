import { GOOGLE_CLIENT_ID } from './config';

const SCOPES = 'https://www.googleapis.com/auth/drive';
let tokenClient = null;
let onTokenCallback = null;

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

export function initGoogleAuth(onToken) {
  onTokenCallback = onToken;
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (window.gapi && window.google) {
        clearInterval(check);
        window.gapi.load('client', async () => {
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

export function requestAccessToken() {
  if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
}

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

export function isConnected() { return !!getStoredToken(); }

async function apiFetch(url, token) {
  const tkn = token || getStoredToken();
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + tkn } });
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${res.status}: ${text}`);
  return JSON.parse(text);
}

export async function getDriveUserInfo(token) {
  return await apiFetch('https://www.googleapis.com/drive/v3/about?fields=user', token);
}

export async function listFolders(parentId = 'root', token) {
  const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,mimeType)&orderBy=name&pageSize=200`;
  const data = await apiFetch(url, token);
  return data.files || [];
}

export async function listExcelFiles(parentId = 'root', token) {
  const q = `'${parentId}' in parents and trashed=false and (mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel' or mimeType='text/csv' or name contains '.xlsx' or name contains '.xls' or name contains '.csv')`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=name&pageSize=200`;
  const data = await apiFetch(url, token);
  return data.files || [];
}

export async function downloadFile(fileId, token) {
  const tkn = token || getStoredToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: 'Bearer ' + tkn }
  });
  if (!res.ok) throw new Error('Download failed: ' + res.status);
  return res.arrayBuffer();
}

export async function listAllContents(parentId = 'root', token) {
  const tkn = token || getStoredToken();
  const [folders, files] = await Promise.all([
    listFolders(parentId, tkn),
    listExcelFiles(parentId, tkn)
  ]);
  return { folders, files };
}