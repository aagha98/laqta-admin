import { getAuth } from 'firebase-admin/auth';
import { getFirebaseApp } from './firebase.js';

/// Firebase reports numbers in E.164 (+966512345678); the rest of the app
/// stores the bare Saudi form (512345678). Returns null for anything that
/// isn't a Saudi mobile, so a number from another country can't slip in.
export function toSaudiLocal(e164) {
  if (typeof e164 !== 'string') return null;
  const digits = e164.replace(/[^\d]/g, '');
  const local = digits.startsWith('966') ? digits.slice(3) : digits;
  return /^5\d{8}$/.test(local) ? local : null;
}

export class PhoneTokenError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/// Turns a Firebase ID token into a verified Saudi number, or throws a
/// [PhoneTokenError] the route can hand straight back to the client.
///
/// Firebase runs the whole SMS challenge on the device — generating the
/// code, sending it, checking it — so verifying this token is the only
/// thing standing between a claimed number and a real one.
export async function verifiedPhoneFromToken(idToken) {
  const app = getFirebaseApp();
  if (!app) {
    throw new PhoneTokenError(503, 'FIREBASE_UNAVAILABLE', 'Phone verification is unavailable.');
  }
  if (!idToken || typeof idToken !== 'string') {
    throw new PhoneTokenError(400, 'MISSING_ID_TOKEN', 'A Firebase ID token is required.');
  }

  let decoded;
  try {
    // checkRevoked: a token from a session Firebase has since revoked
    // (disabled or deleted account) must not buy a fresh session here.
    decoded = await getAuth(app).verifyIdToken(idToken, true);
  } catch {
    throw new PhoneTokenError(401, 'INVALID_ID_TOKEN', 'Could not verify this sign-in.');
  }

  // Only a real phone verification may assert a phone number — otherwise a
  // token from any other provider on the same project would do.
  if (decoded.firebase?.sign_in_provider !== 'phone') {
    throw new PhoneTokenError(401, 'WRONG_PROVIDER', 'This sign-in method is not supported.');
  }

  const phoneNumber = toSaudiLocal(decoded.phone_number);
  if (!phoneNumber) {
    throw new PhoneTokenError(400, 'UNSUPPORTED_NUMBER', 'Only Saudi mobile numbers are supported.');
  }
  return phoneNumber;
}
