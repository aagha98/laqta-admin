'use client';

import { useCallback, useEffect, useState } from 'react';

const STATUSES = ['pending', 'approved', 'rejected'];

const STATUS_STYLES = {
  pending: 'bg-accent/20 text-ink',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
};

const CATEGORY_LABELS = {
  japanese: 'Japanese',
  korean: 'Korean',
  american: 'American',
  european: 'European',
  chinese: 'Chinese',
  other: 'Other',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const response = await fetch(`/api/admin/suppliers?${params.toString()}`);
    const data = await response.json();
    setSuppliers(data.suppliers || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id, status) {
    let rejectionReason = '';
    if (status === 'rejected') {
      const reason = window.prompt('Reason for rejection (shown to the supplier):');
      if (reason === null) return;
      rejectionReason = reason;
    }
    setBusyId(id);
    await fetch(`/api/admin/suppliers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason }),
    });
    setBusyId(null);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Suppliers</h1>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Specialties</th>
              <th className="px-4 py-3">License</th>
              <th className="px-4 py-3">Photo</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Applied</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && suppliers.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-muted">
                  No suppliers{statusFilter ? ` with status "${statusFilter}"` : ''}.
                </td>
              </tr>
            )}
            {suppliers.map((user) => {
              const s = user.supplier || {};
              return (
                <tr key={user._id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3 font-medium text-ink">{s.shopName || '—'}</td>
                  <td className="px-4 py-3 text-muted">
                    <div>{user.fullName || '—'}</div>
                    <div className="text-xs">+966 {user.phoneNumber || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{s.city || '—'}</td>
                  <td className="px-4 py-3 text-muted">
                    {(s.specialties || []).map((c) => CATEGORY_LABELS[c] || c).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">{s.licenseNumber || '—'}</td>
                  <td className="px-4 py-3">
                    {s.shopPhoto ? (
                      <a
                        href={`/api/admin/photos/${s.shopPhoto}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={`/api/admin/photos/${s.shopPhoto}`}
                          alt="Shop"
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {s.ratingCount ? `${user.supplierRating} (${s.ratingCount})` : '—'}
                    <div className="text-xs">{s.completedDeals || 0} deals</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[s.status] || ''}`}
                    >
                      {s.status}
                    </span>
                    {s.status === 'rejected' && s.rejectionReason && (
                      <div className="mt-1 max-w-[12rem] text-xs text-muted">{s.rejectionReason}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {s.appliedAt ? new Date(s.appliedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {s.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={busyId === user._id}
                          onClick={() => review(user._id, 'approved')}
                          className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {s.status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={busyId === user._id}
                          onClick={() => review(user._id, 'rejected')}
                          className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
