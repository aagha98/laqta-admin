'use client';

import { useEffect, useState, useCallback } from 'react';

const STATUSES = ['submitted', 'underReview', 'matched', 'completed', 'cancelled'];
const TYPES = ['spareParts', 'sellCar'];

const STATUS_STYLES = {
  submitted: 'bg-blue-100 text-blue-800',
  underReview: 'bg-accent/20 text-ink',
  matched: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
};

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('type', typeFilter);

    const response = await fetch(`/api/admin/requests?${params.toString()}`);
    const data = await response.json();
    setRequests(data.requests || []);
    setLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id, status) {
    await fetch(`/api/admin/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function deleteRequest(id) {
    if (!confirm('Delete this request permanently?')) return;
    await fetch(`/api/admin/requests/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Requests</h1>

      <div className="mb-4 flex gap-3">
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
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
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  No requests found.
                </td>
              </tr>
            )}
            {requests.map((req) => (
              <tr key={req._id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{req.title}</p>
                  {req.subtitle && <p className="text-xs text-muted">{req.subtitle}</p>}
                </td>
                <td className="px-4 py-3 text-muted">{req.type}</td>
                <td className="px-4 py-3 text-muted">
                  {req.user?.fullName || req.user?.phoneNumber || '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLES[req.status] || ''}`}
                  >
                    {req.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">
                  {new Date(req.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={req.status}
                      onChange={(event) => updateStatus(req._id, event.target.value)}
                      className="rounded-lg border border-border px-2 py-1 text-xs"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => deleteRequest(req._id)}
                      className="text-xs font-medium text-error hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
