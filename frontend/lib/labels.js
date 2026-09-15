export const STATUS = {
  submitted: { label: 'بانتظار العروض', tone: 'primary' },
  underReview: { label: 'وصلت عروض', tone: 'accent' },
  matched: { label: 'تم اختيار عرض', tone: 'success' },
  completed: { label: 'مكتمل', tone: 'success' },
  cancelled: { label: 'ملغي', tone: 'danger' },
  expired: { label: 'منتهي', tone: 'muted' },
};

export const OFFER_STATUS = {
  pending: { label: 'بانتظار العميل', tone: 'accent' },
  accepted: { label: 'مقبول', tone: 'success' },
  rejected: { label: 'لم يُختر', tone: 'muted' },
};

export const SUPPLIER_STATUS = {
  pending: { label: 'قيد المراجعة', tone: 'accent' },
  approved: { label: 'معتمد', tone: 'success' },
  rejected: { label: 'مرفوض', tone: 'danger' },
};

export const CATEGORY = {
  japanese: 'ياباني',
  korean: 'كوري',
  american: 'أمريكي',
  european: 'أوروبي',
  chinese: 'صيني',
  other: 'أخرى',
};

export const CONDITION = {
  likeNew: 'شبه جديدة',
  excellent: 'ممتازة',
  average: 'متوسطة',
  refurbished: 'مجددة',
};

export const REQUEST_TYPE = { spareParts: 'قطعة غيار', sellCar: 'بيع سيارة' };

const numberFormat = new Intl.NumberFormat('en-US');

export function formatNumber(value) {
  return numberFormat.format(value ?? 0);
}

export function formatSar(value) {
  return `${numberFormat.format(value ?? 0)} ر.س`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatDay(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', { day: 'numeric', month: 'short' }).format(
    new Date(value),
  );
}

export function timeAgo(value) {
  if (!value) return '';
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `قبل ${minutes} د`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `قبل ${hours} س`;
  const days = Math.round(hours / 24);
  return `قبل ${days} ي`;
}

export function timeLeft(value) {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  if (ms <= 0) return { label: 'انتهى', urgent: true };
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const label = hours >= 24 ? `${Math.floor(hours / 24)} ي ${hours % 24} س` : hours > 0 ? `${hours} س ${minutes} د` : `${minutes} د`;
  return { label, urgent: hours < 6 };
}

export function formatMinutes(minutes) {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} د`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} س`;
  return `${Math.round(minutes / 1440)} ي`;
}

export function vehicleLabel(request) {
  if (!request) return '';
  const parts = [request.vehicleMake, request.vehicleModel, request.vehicleYear].filter(Boolean);
  return parts.length ? parts.join(' ') : request.subtitle || '';
}
