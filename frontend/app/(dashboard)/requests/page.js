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

const EMPTY_OFFER_FORM = {
  supplierName: '',
  supplierCity: '',
  supplierRating: '4.8',
  supplierReviewCount: '0',
  price: '',
  conditionLabel: '',
  conditionDescription: '',
  qualityScore: '90',
  warrantyDays: '30',
  verified: true,
  recommended: false,
};

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

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
              <RequestRow
                key={req._id}
                request={req}
                expanded={expandedId === req._id}
                onToggleExpand={() => setExpandedId(expandedId === req._id ? null : req._id)}
                onUpdateStatus={updateStatus}
                onDelete={deleteRequest}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestRow({ request: req, expanded, onToggleExpand, onUpdateStatus, onDelete }) {
  return (
    <>
      <tr className="border-b border-border last:border-0">
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
        <td className="px-4 py-3 text-muted">{new Date(req.createdAt).toLocaleDateString()}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleExpand}
              className="text-xs font-medium text-primary hover:underline"
            >
              {expanded ? 'Hide offers' : 'Offers'}
            </button>
            <select
              value={req.status}
              onChange={(event) => onUpdateStatus(req._id, event.target.value)}
              className="rounded-lg border border-border px-2 py-1 text-xs"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              onClick={() => onDelete(req._id)}
              className="text-xs font-medium text-error hover:underline"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-background/60">
          <td colSpan={6} className="px-4 py-4">
            <OffersPanel requestId={req._id} />
          </td>
        </tr>
      )}
    </>
  );
}

function OffersPanel({ requestId }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_OFFER_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/admin/requests/${requestId}/offers`);
    const data = await response.json();
    setOffers(data.offers || []);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitOffer(event) {
    event.preventDefault();
    if (!form.supplierName || !form.price) return;

    setSubmitting(true);
    await fetch(`/api/admin/requests/${requestId}/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        supplierRating: Number(form.supplierRating) || 0,
        supplierReviewCount: Number(form.supplierReviewCount) || 0,
        qualityScore: Number(form.qualityScore) || 0,
        warrantyDays: Number(form.warrantyDays) || 0,
      }),
    });
    setForm(EMPTY_OFFER_FORM);
    setShowForm(false);
    setSubmitting(false);
    load();
  }

  async function deleteOffer(offerId) {
    await fetch(`/api/admin/requests/${requestId}/offers/${offerId}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Offers ({offers.length})</h3>
        <button
          onClick={() => setShowForm((value) => !value)}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
        >
          {showForm ? 'Cancel' : '+ Add offer'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitOffer} className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-background p-3 sm:grid-cols-4">
          <input
            required
            placeholder="Supplier name"
            value={form.supplierName}
            onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
            className="rounded-lg border border-border px-2 py-1.5 text-xs"
          />
          <input
            placeholder="City"
            value={form.supplierCity}
            onChange={(e) => setForm({ ...form, supplierCity: e.target.value })}
            className="rounded-lg border border-border px-2 py-1.5 text-xs"
          />
          <input
            required
            type="number"
            placeholder="Price (SAR)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="rounded-lg border border-border px-2 py-1.5 text-xs"
          />
          <input
            type="number"
            step="0.1"
            placeholder="Rating (0-5)"
            value={form.supplierRating}
            onChange={(e) => setForm({ ...form, supplierRating: e.target.value })}
            className="rounded-lg border border-border px-2 py-1.5 text-xs"
          />
          <input
            type="number"
            placeholder="Review count"
            value={form.supplierReviewCount}
            onChange={(e) => setForm({ ...form, supplierReviewCount: e.target.value })}
            className="rounded-lg border border-border px-2 py-1.5 text-xs"
          />
          <input
            placeholder="Condition label"
            value={form.conditionLabel}
            onChange={(e) => setForm({ ...form, conditionLabel: e.target.value })}
            className="rounded-lg border border-border px-2 py-1.5 text-xs"
          />
          <input
            type="number"
            placeholder="Quality score (0-100)"
            value={form.qualityScore}
            onChange={(e) => setForm({ ...form, qualityScore: e.target.value })}
            className="rounded-lg border border-border px-2 py-1.5 text-xs"
          />
          <input
            type="number"
            placeholder="Warranty days"
            value={form.warrantyDays}
            onChange={(e) => setForm({ ...form, warrantyDays: e.target.value })}
            className="rounded-lg border border-border px-2 py-1.5 text-xs"
          />
          <input
            placeholder="Condition description"
            value={form.conditionDescription}
            onChange={(e) => setForm({ ...form, conditionDescription: e.target.value })}
            className="col-span-2 rounded-lg border border-border px-2 py-1.5 text-xs sm:col-span-4"
          />
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) => setForm({ ...form, verified: e.target.checked })}
            />
            Verified
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={form.recommended}
              onChange={(e) => setForm({ ...form, recommended: e.target.checked })}
            />
            Best match / recommended
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="col-span-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 sm:col-span-4"
          >
            {submitting ? 'Adding…' : 'Add offer'}
          </button>
        </form>
      )}

      {loading && <p className="text-xs text-muted">Loading offers…</p>}
      {!loading && offers.length === 0 && <p className="text-xs text-muted">No offers yet.</p>}
      {!loading && offers.length > 0 && (
        <div className="space-y-2">
          {offers.map((offer) => (
            <div
              key={offer._id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs"
            >
              <div>
                <p className="font-medium text-ink">
                  {offer.supplierName} {offer.verified && '✓'}
                  {offer.recommended && <span className="ml-1 text-accent">★ best match</span>}
                </p>
                <p className="text-muted">
                  {offer.supplierCity} • {offer.price} SAR • quality {offer.qualityScore}% •{' '}
                  {offer.warrantyDays}d warranty • {offer.status}
                </p>
              </div>
              <button
                onClick={() => deleteOffer(offer._id)}
                className="font-medium text-error hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
