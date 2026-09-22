import fs from 'node:fs';
import admin from 'firebase-admin';
import User from './models/User.js';

// Credentials come from FIREBASE_SERVICE_ACCOUNT (the JSON key inline, how
// Render stores it) or FIREBASE_SERVICE_ACCOUNT_PATH (a file, for local
// development). Without either, push is simply disabled and the in-app
// notification feed still works.
function loadCredentials() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch {
      console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON; push disabled.');
      return null;
    }
  }
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path && fs.existsSync(path)) {
    try {
      return JSON.parse(fs.readFileSync(path, 'utf8'));
    } catch {
      console.error(`Could not read ${path}; push disabled.`);
      return null;
    }
  }
  return null;
}

let app = null;

export function initPush() {
  if (app) return app;
  const credentials = loadCredentials();
  if (!credentials) {
    console.log('Push notifications are disabled (no Firebase credentials).');
    return null;
  }
  app = admin.initializeApp({ credential: admin.credential.cert(credentials) });
  console.log('Push notifications enabled.');
  return app;
}

export function isPushEnabled() {
  return app !== null;
}

// Titles/bodies are rendered by the app from `type`, so the payload stays
// language-agnostic; these are only the fallback the OS shows.
const FALLBACK = {
  newRequest: { title: 'طلب جديد', body: 'وصل طلب يطابق تخصصك' },
  newOffer: { title: 'عرض جديد', body: 'وصلك عرض على طلبك' },
  offerAccepted: { title: 'تم قبول عرضك', body: 'اختار العميل عرضك' },
  offerRejected: { title: 'لم يُختر عرضك', body: 'اختار العميل عرضًا آخر' },
  supplierApproved: { title: 'تم اعتماد حسابك', body: 'تقدر تستقبل الطلبات الآن' },
  supplierRejected: { title: 'لم يتم قبول طلبك', body: 'راجع بياناتك وأعد التقديم' },
  requestExpired: { title: 'انتهت مهلة طلبك', body: 'تقدر تعيد نشره' },
  requestExpiringSoon: { title: 'طلبك ينتهي قريبًا', body: 'ما وصلك عرض بعد' },
  newQuestion: { title: 'سؤال على عرضك', body: 'العميل يسأل عن القطعة' },
  newAnswer: { title: 'رد المورد', body: 'وصلك رد على سؤالك' },
  offerWithdrawn: { title: 'سُحب عرض', body: 'سحب مورد عرضه على طلبك' },
  requestClarified: { title: 'توضيح جديد', body: 'أضاف العميل تفاصيل للطلب' },
  disputeOpened: { title: 'بلاغ على الصفقة', body: 'العميل بلّغ عن مشكلة' },
  disputeResolved: { title: 'أُغلق البلاغ', body: 'راجع القرار في التطبيق' },
};

/// Sends one push per device, dropping tokens FCM reports as dead.
export async function sendPush(userIds, type, data = {}) {
  if (!app) return;
  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean).map(String))];
  if (ids.length === 0) return;

  const users = await User.find({ _id: { $in: ids }, deletedAt: null }).select('deviceTokens');
  const tokens = users.flatMap((u) => u.deviceTokens ?? []);
  if (tokens.length === 0) return;

  const fallback = FALLBACK[type] ?? { title: 'لقطة', body: '' };
  const payload = {
    tokens,
    notification: fallback,
    data: {
      type,
      requestId: String(data.requestId ?? ''),
      offerId: String(data.offerId ?? ''),
    },
    android: {
      priority: 'high',
      notification: { channelId: 'laqta_default', sound: 'default' },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(payload);
    const dead = [];
    response.responses.forEach((result, index) => {
      const code = result.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument'
      ) {
        dead.push(tokens[index]);
      }
    });
    if (dead.length > 0) {
      await User.updateMany(
        { _id: { $in: ids } },
        { $pull: { deviceTokens: { $in: dead } } },
      );
    }
  } catch (error) {
    // Push must never break the request that triggered it.
    console.error('push send failed', error.message);
  }
}
