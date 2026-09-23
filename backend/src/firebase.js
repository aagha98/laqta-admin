import fs from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';

// One Firebase app for the whole process. Push and phone sign-in both need
// it, and firebase-admin refuses a second default app.
//
// Credentials come from FIREBASE_SERVICE_ACCOUNT (the JSON key inline, how
// Render stores it) or FIREBASE_SERVICE_ACCOUNT_PATH (a file, for local
// development). Without either, callers get null and degrade gracefully.
function loadCredentials() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch {
      console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
      return null;
    }
  }
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path && fs.existsSync(path)) {
    try {
      return JSON.parse(fs.readFileSync(path, 'utf8'));
    } catch {
      console.error(`Could not read ${path}.`);
      return null;
    }
  }
  return null;
}

let app = null;
let attempted = false;

/// The shared app, or null when Firebase isn't configured. Safe to call
/// repeatedly; initialization is attempted once.
export function getFirebaseApp() {
  if (attempted) return app;
  attempted = true;

  const credentials = loadCredentials();
  if (!credentials) {
    console.log('Firebase is not configured (no service-account credentials).');
    return null;
  }

  try {
    app = initializeApp({ credential: cert(credentials) });
  } catch (error) {
    console.error('Firebase credentials rejected.', error.message);
    app = null;
  }
  return app;
}

export function isFirebaseConfigured() {
  return getFirebaseApp() !== null;
}
