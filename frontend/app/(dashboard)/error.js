'use client';

export default function DashboardError({ error, reset }) {
  return (
    <div className="glass p-8 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-danger/15 text-2xl text-danger">
        ⚠
      </div>
      <h2 className="text-lg font-semibold text-white">حدث خطأ غير متوقع</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">
        {error?.message || 'تعذّر تحميل الصفحة.'} — إذا كان الخادم نائمًا فقد يحتاج 30 ثانية ليستيقظ.
      </p>
      <button type="button" onClick={() => reset()} className="btn-secondary mt-5">
        إعادة المحاولة
      </button>
    </div>
  );
}
