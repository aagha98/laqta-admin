'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'تعذر تسجيل الدخول.');
        return;
      }
      router.push('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-32 end-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 start-1/4 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

      <form onSubmit={handleSubmit} className="glass-raised relative w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-xl text-primary-bright shadow-glow">
            ⚙
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">لقطة</h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-bright">
              لوحة الإدارة
            </p>
          </div>
        </div>

        <label className="mb-1 block text-xs font-semibold text-muted">البريد الإلكتروني</label>
        <input
          type="email"
          dir="ltr"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="input mb-4"
        />

        <label className="mb-1 block text-xs font-semibold text-muted">كلمة المرور</label>
        <input
          type="password"
          dir="ltr"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input mb-5"
        />

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">
          {loading ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
        </button>
      </form>
    </div>
  );
}
