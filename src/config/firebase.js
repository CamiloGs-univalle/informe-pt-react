/**
 * config/firebase.js
 * ─────────────────────────────────────────────────────────────────────────
 * Firebase app initialization (Auth + Firestore + optional Analytics).
 *
 * The config values below can be overridden with `VITE_FIREBASE_*` env
 * vars (see `.env.example`); if unset, they fall back to the project's
 * existing `reportes-pt-ejecutivos` Firebase project so behaviour is
 * unchanged out of the box.
 *
 * Note: Firebase web config values (apiKey, authDomain, etc.) are not
 * secret — they identify the project, not a credential — so committing a
 * default here is safe. Real access control is enforced by Firebase
 * Authentication + Firestore security rules, not by hiding this object.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCPbChH3Q7CopvRVbK6sCi6ZZisv-yW8_g',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'reportes-pt-ejecutivos.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'reportes-pt-ejecutivos',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'reportes-pt-ejecutivos.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '482464283860',
  appId: env.VITE_FIREBASE_APP_ID || '1:482464283860:web:3f332be45404f7e4098f41',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-1H0V2BFBET',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics only when supported (not in SSR / private browsing).
isSupported().then(ok => { if (ok) { try { getAnalytics(app); } catch (e) { /* analytics unavailable */ } } });

export default app;
