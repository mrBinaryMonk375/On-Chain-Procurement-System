'use client';

import { useState } from 'react';
import { useRequests, useRequestDetails, useCreateRequest, usePlaceBid, useSelectBid, useCompleteRequest, useCancelRequest } from '@/hooks/useProcurement';
import { useAppStore } from '@/lib/store';
import { shortenAddress, timeAgo } from '@/lib/utils';
import { RequestStatus, BidStatus, ProcurementRequest, Bid } from '@/types';

const statusLabel: Record<number, string> = {
  0: 'Open',
  1: 'In Progress',
  2: 'Completed',
  3: 'Cancelled',
};
const statusClass: Record<number, string> = {
  0: 'status-open',
  1: 'status-inprogress',
  2: 'status-completed',
  3: 'status-cancelled',
};
const bidStatusLabel: Record<number, string> = { 0: 'Pending', 1: 'Accepted', 2: 'Rejected' };

// ── Skeleton Card ──
function SkeletonCard() {
  return (
    <div className="glass-card p-6">
      <div className="skeleton h-5 w-2/3 mb-3" />
      <div className="skeleton h-4 w-full mb-2" />
      <div className="skeleton h-4 w-1/2 mb-4" />
      <div className="flex gap-2">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

// ── Create RFP Modal ──
function CreateRFPModal({ onClose }: { onClose: () => void }) {
  const createRequest = useCreateRequest();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !budget) return;
    try {
      await createRequest.mutateAsync({ title, description, budget: Number(budget) });
      onClose();
    } catch {
      // Error handled via tx tracking
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-card w-full max-w-lg p-6 border border-indigo-500/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-black">Create Procurement Request</h2>
          <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-black text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Server Rack Equipment"
              className="w-full mt-1 px-4 py-2.5 rounded-lg bg-[var(--secondary)] text-black border border-[var(--border)] focus:border-indigo-500/50 focus:outline-none transition-colors text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of what you need..."
              rows={3}
              className="w-full mt-1 px-4 py-2.5 rounded-lg bg-[var(--secondary)] text-black border border-[var(--border)] focus:border-indigo-500/50 focus:outline-none transition-colors text-sm resize-none"
              required
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Budget (XLM)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="1000"
              min="1"
              className="w-full mt-1 px-4 py-2.5 rounded-lg bg-[var(--secondary)] text-black border border-[var(--border)] focus:border-indigo-500/50 focus:outline-none transition-colors text-sm"
              required
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">This amount will be locked in smart contract escrow.</p>
          </div>
          <button
            type="submit"
            disabled={createRequest.isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
          >
            {createRequest.isPending ? '⏳ Signing & Submitting…' : '📋 Create RFP & Lock Escrow'}
          </button>
          {createRequest.isError && (
            <p className="text-red-400 text-xs text-center">
              {createRequest.error?.message || 'Transaction failed.'}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Place Bid Modal ──
function PlaceBidModal({ requestId, maxBudget, onClose }: { requestId: number; maxBudget: number; onClose: () => void }) {
  const placeBid = usePlaceBid();
  const [amount, setAmount] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !deliveryTime || !description) return;
    try {
      await placeBid.mutateAsync({ requestId, amount: Number(amount), deliveryTime: Number(deliveryTime), description });
      onClose();
    } catch {
      // Error handled via tx tracking
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-card w-full max-w-lg p-6 border border-emerald-500/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-black">Submit Bid for RFP #{requestId}</h2>
          <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-black text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Bid Amount (XLM)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Max: ${maxBudget}`}
              max={maxBudget}
              min="1"
              className="w-full mt-1 px-4 py-2.5 rounded-lg bg-[var(--secondary)] text-black border border-[var(--border)] focus:border-emerald-500/50 focus:outline-none transition-colors text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Delivery Time (Days)</label>
            <input
              type="number"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              placeholder="e.g. 7"
              min="1"
              className="w-full mt-1 px-4 py-2.5 rounded-lg bg-[var(--secondary)] text-black border border-[var(--border)] focus:border-emerald-500/50 focus:outline-none transition-colors text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Proposal Details</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your offering..."
              rows={3}
              className="w-full mt-1 px-4 py-2.5 rounded-lg bg-[var(--secondary)] text-black border border-[var(--border)] focus:border-emerald-500/50 focus:outline-none transition-colors text-sm resize-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={placeBid.isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50"
          >
            {placeBid.isPending ? '⏳ Signing & Submitting…' : '💰 Submit Bid'}
          </button>
          {placeBid.isError && (
            <p className="text-red-400 text-xs text-center">{placeBid.error?.message || 'Bid failed.'}</p>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Request Detail Panel ──
function RequestDetail({ requestId, onClose }: { requestId: number; onClose: () => void }) {
  const { data, isLoading, isError } = useRequestDetails(requestId);
  const { address } = useAppStore();
  const selectBid = useSelectBid();
  const completeRequest = useCompleteRequest();
  const cancelRequest = useCancelRequest();
  const [showBidForm, setShowBidForm] = useState(false);

  if (isLoading) {
    return (
      <div className="glass-card p-6 animate-fade-in">
        <div className="skeleton h-6 w-1/2 mb-4" />
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-3/4 mb-4" />
        <div className="skeleton h-20 w-full" />
      </div>
    );
  }

  if (isError || !data?.request) {
    return (
      <div className="glass-card p-6 text-center animate-fade-in">
        <span className="text-3xl">❌</span>
        <p className="text-red-400 mt-2">Failed to load request details.</p>
        <button onClick={onClose} className="mt-4 text-xs text-indigo-400 hover:text-indigo-300">← Back to list</button>
      </div>
    );
  }

  const req = data.request;
  const bids = data.bids || [];
  const isBuyer = address && req.buyer === address;
  const budgetXLM = Number(req.budget) / 10000000;

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={onClose} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">← Back to all RFPs</button>

      {/* Request Header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-black">{req.title}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass[req.status]}`}>
                {statusLabel[req.status]}
              </span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{req.description}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-amber-400">{budgetXLM.toLocaleString()} <span className="text-sm">XLM</span></p>
            <p className="text-xs text-[var(--muted-foreground)]">Escrow Budget</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-[var(--border)]">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">RFP ID</p>
            <p className="font-mono text-sm text-black">#{req.id}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Buyer</p>
            <p className="font-mono text-sm text-indigo-400">{shortenAddress(req.buyer, 6)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Created</p>
            <p className="text-sm text-black">{timeAgo(req.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Bids</p>
            <p className="text-sm text-black">{bids.length}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-6">
          {req.status === RequestStatus.Open && !isBuyer && address && (
            <button
              onClick={() => setShowBidForm(true)}
              className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              💰 Place Bid
            </button>
          )}
          {req.status === RequestStatus.InProgress && isBuyer && (
            <button
              onClick={() => completeRequest.mutate(req.id)}
              disabled={completeRequest.isPending}
              className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
            >
              {completeRequest.isPending ? '⏳ Processing…' : '✅ Confirm Delivery & Release Escrow'}
            </button>
          )}
          {req.status === RequestStatus.Open && isBuyer && (
            <button
              onClick={() => cancelRequest.mutate(req.id)}
              disabled={cancelRequest.isPending}
              className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {cancelRequest.isPending ? '⏳ Processing…' : '🚫 Cancel RFP'}
            </button>
          )}
        </div>
      </div>

      {/* Bids List */}
      <div>
        <h3 className="text-lg font-semibold text-black mb-4">Bids ({bids.length})</h3>
        {bids.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <span className="text-3xl">📭</span>
            <p className="text-[var(--muted-foreground)] mt-2">No bids submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bids.map((bid: Bid) => {
              const bidXLM = Number(bid.amount) / 10000000;
              return (
                <div key={bid.id} className="glass-card p-5 hover:border-indigo-500/15 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-black">Bid #{bid.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          bid.status === BidStatus.Accepted ? 'status-open' :
                          bid.status === BidStatus.Rejected ? 'status-cancelled' :
                          'status-pending'
                        }`}>
                          {bidStatusLabel[bid.status]}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)]">{bid.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-[var(--muted-foreground)]">
                        <span>Vendor: <span className="text-indigo-400 font-mono">{shortenAddress(bid.vendor, 6)}</span></span>
                        <span>Delivery: {bid.deliveryTime} days</span>
                        <span>{timeAgo(bid.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-emerald-400">{bidXLM.toLocaleString()} <span className="text-xs">XLM</span></p>
                      {req.status === RequestStatus.Open && isBuyer && bid.status === BidStatus.Pending && (
                        <button
                          onClick={() => selectBid.mutate({ requestId: req.id, bidId: bid.id })}
                          disabled={selectBid.isPending}
                          className="mt-2 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-medium border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                        >
                          {selectBid.isPending ? '⏳' : '✓ Accept'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showBidForm && <PlaceBidModal requestId={req.id} maxBudget={budgetXLM} onClose={() => setShowBidForm(false)} />}
    </div>
  );
}

// ── Main Procurement Page ──
export default function ProcurementPage() {
  const { data: requests, isLoading, isError } = useRequests();
  const { address } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 0 | 1 | 2 | 3>('all');

  if (selectedId !== null) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RequestDetail requestId={selectedId} onClose={() => setSelectedId(null)} />
      </div>
    );
  }

  const filtered = requests?.filter(r => filter === 'all' || r.status === filter) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-black">Procurement</h1>
          <p className="text-[var(--muted-foreground)] mt-1">Browse open RFPs, place bids, and manage procurement on-chain.</p>
        </div>
        {address && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20"
          >
            + Create RFP
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {([['all', 'All'], [0, 'Open'], [1, 'In Progress'], [2, 'Completed'], [3, 'Cancelled']] as const).map(([val, label]) => (
          <button
            key={String(val)}
            onClick={() => setFilter(val as 'all' | 0 | 1 | 2 | 3)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filter === val
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-[var(--muted-foreground)] hover:text-black hover:bg-white/5 border border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="glass-card p-10 text-center animate-fade-in">
          <span className="text-4xl">⚠️</span>
          <p className="text-red-400 mt-3 font-medium">Failed to load procurement requests.</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Check your connection and try again.</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="glass-card p-10 text-center animate-fade-in">
          <span className="text-4xl">📭</span>
          <p className="text-black font-medium mt-3">No procurement requests found.</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {filter === 'all' ? 'Be the first to create one!' : 'Try a different filter.'}
          </p>
          {address && filter === 'all' && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-5 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
            >
              + Create First RFP
            </button>
          )}
        </div>
      )}

      {/* Request Cards Grid */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((req: ProcurementRequest) => {
            const budgetXLM = Number(req.budget) / 10000000;
            return (
              <button
                key={req.id}
                onClick={() => setSelectedId(req.id)}
                className="glass-card p-5 text-left hover:border-indigo-500/20 hover:scale-[1.01] transition-all animate-fade-in"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-[var(--muted-foreground)]">RFP #{req.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass[req.status]}`}>
                    {statusLabel[req.status]}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-black mb-2 line-clamp-1">{req.title}</h3>
                <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mb-4">{req.description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                  <span className="text-amber-400 font-bold text-sm">{budgetXLM.toLocaleString()} XLM</span>
                  <span className="text-xs text-[var(--muted-foreground)]">{timeAgo(req.createdAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Not Connected Banner */}
      {!address && (
        <div className="mt-8 glass-card p-6 border border-amber-500/10 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-sm font-medium text-amber-400">Wallet Not Connected</p>
              <p className="text-xs text-[var(--muted-foreground)]">Connect your Stellar wallet to create RFPs, place bids, and manage procurement.</p>
            </div>
          </div>
        </div>
      )}

      {showCreate && <CreateRFPModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
