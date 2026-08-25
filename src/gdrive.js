import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config';

let tokenClient = null;
let accessToken = null;
let onTokenCallback = null;

export function loadGoogleScripts() {
  return new Promise((resolve) => {
    let loaded = 0;
    const check = () => { loaded++; if (loaded === 2) resolve(); };

    // Load GIS (Google Identity Services)
    if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      const s1 = document.createElement('script');
      s1.src = 'https://accounts.google.com/gsi/client';
      s1.onload = check;
      document.head.appendChild(s1);
    } else check();

    // Load Google API Client
    if (!document.querySelector('script[src*="apis.google.com/js/api.js"]')) {
      const s2 = document.createElement('script');
      s2.src = 'https://apis.google.com/js/api.js';
      s2.onload = check;
      document.head.appendChild(s2);
    } else check();
  });
}

export function initGoogleAuth(onToken) {
  onTokenCallback = onToken;

  return new Promise((resolve) => {
    const checkGapi = setInterval(() => {
      if (window.gapi && window.google) {
        clearInterval(checkGapi);

        window.gapi.load('client', async () => {
          await window.gapi.client.init({
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          });
        });

        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: GOOGLE_SCOPES.join(' '),
          callback: (response) => {
            if (response.error) {
              console.error('Auth error:', response);
              return;
            }
            accessToken = response.access_token;
            localStorage.setItem('gdrive_token', accessToken);
            localStorage.setItem('gdrive_token_time', Date.now().toString());
            if (onTokenCallback) onTokenCallback(accessToken);
          },
        });

        resolve();
      }
    }, 100);
  });
}

export function requestAccessToken() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }
}

export function getStoredToken() {
  const token = localStorage.getItem('gdrive_token');
  const time = localStorage.getItem('gdrive_token_time');
  if (token && time) {
    const elapsed = Date.now() - parseInt(time);
    if (elapsed < 55 * 60 * 1000) return token; // 55 min validity
    localStorage.removeItem('gdrive_token');
    localStorage.removeItem('gdrive_token_time');
  }
  return null;
}

export function setAccessToken(token) {
  accessToken = token;
  localStorage.setItem('gdrive_token', token);
  localStorage.setItem('gdrive_token_time', Date.now().toString());
}

export function clearAccessToken() {
  accessToken = null;
  localStorage.removeItem('gdrive_token');
  localStorage.removeItem('gdrive_token_time');
  if (window.google) {
    window.google.accounts.oauth2.revoke(accessToken || '', () => {});
  }
}

export function isConnected() {
  return !!getStoredToken();
}

// ═══════════════════════════════════════════════════════════
// Drive API calls
// ═══════════════════════════════════════════════════════════

async function apiCall(url, token) {
  const tkn = token || getStoredToken();
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + tkn }
  });
  if (!res.ok) throw new Error('API error: ' + res.status);
  return res.json();
}

export async function getDriveUserInfo(token) {
  const data = await apiCall('https://www.googleapis.com/drive/v3/about?fields=user', token);
  return data.user;
}

export async function listFolders(parentId = 'root', token) {
  const q = encodeURIComponent(`'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const fields = encodeURIComponent('files(id,name,modifiedTime,iconLink)');
  const data = await apiCall(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(${fields})&orderBy=name&pageSize=100`,
    token
  );
  return data.files || [];
}

export async function listExcelFiles(parentId = 'root', token) {
  const mimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ];
  const q = encodeURIComponent(`'${parentId}' in parents and trashed=false and (${mimes.map(m => `mimeType='${m}'`).join(' or ')})`);
  const fields = encodeURIComponent('files(id,name,mimeType,size,modifiedTime)');
  const data = await apiCall(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(${fields})&orderBy=name&pageSize=100`,
    token
  );
  return data.files || [];
}

export async function downloadFile(fileId, token) {
  const tkn = token || getStoredToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: 'Bearer ' + tkn } }
  );
  if (!res.ok) throw new Error('Download error');
  return res.arrayBuffer();
}

export async function searchFiles(query, token) {
  const q = encodeURIComponent(query);
  const data = await apiCall(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,parents)&orderBy=name&pageSize=50`,
    token
  );
  return data.files || [];
}

export async function getFileContent(fileId, token) {
  const tkn = token || getStoredToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: 'Bearer ' + tkn } }
  );
  return res;
}