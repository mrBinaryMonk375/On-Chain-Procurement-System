'use client';

import { useEvents } from '@/hooks/useProcurement';
import { shortenAddress, timeAgo } from '@/lib/utils';
import { ContractEvent } from '@/types';
import { useState } from 'react';

const eventIcons: Record<string, string> = {
  created: '📋',
  placed: '💰',
  selected: '✅',
  completed: '🎉',
  cancelled: '🚫',
};

const eventColors: Record<string, string> = {
  created: 'border-indigo-500/20 bg-indigo-500/5',
  placed: 'border-emerald-500/20 bg-emerald-500/5',
  selected: 'border-amber-500/20 bg-amber-500/5',
  completed: 'border-purple-500/20 bg-purple-500/5',
  cancelled: 'border-red-500/20 bg-red-500/5',
};

const eventLabels: Record<string, string> = {
  created: 'RFP Created',
  placed: 'Bid Placed',
  selected: 'Bid Selected',
  completed: 'Procurement Completed',
  cancelled: 'RFP Cancelled',
};

function SkeletonEvent() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-4">
        <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1">
          <div className="skeleton h-4 w-28 mb-2" />
          <div className="skeleton h-3 w-full mb-1" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const { data: events, isLoading, isError } = useEvents();
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = typeFilter === 'all' ? (events ?? []) : (events ?? []).filter(e => e.type === typeFilter);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-black">Activity Feed</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Real-time on-chain events from the procurement contract.
            <span className="inline-flex items-center gap-1 ml-2 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-refreshing
            </span>
          </p>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {[
          ['all', '🌐 All'],
          ['created', '📋 Created'],
          ['placed', '💰 Bids'],
          ['selected', '✅ Selected'],
          ['completed', '🎉 Completed'],
          ['cancelled', '🚫 Cancelled'],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTypeFilter(val)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              typeFilter === val
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-[var(--muted-foreground)] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <SkeletonEvent key={i} />)}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="glass-card p-10 text-center animate-fade-in">
          <span className="text-4xl">⚠️</span>
          <p className="text-red-400 mt-3 font-medium">Failed to load events.</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Check your connection and try again.</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="glass-card p-10 text-center animate-fade-in">
          <span className="text-4xl">📡</span>
          <p className="text-black font-medium mt-3">No events yet.</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Contract events will appear here in real-time as users interact with the system.
          </p>
        </div>
      )}

      {/* Event List */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((event: ContractEvent, idx: number) => (
            <div
              key={event.id}
              className={`glass-card p-5 border ${eventColors[event.type] || 'border-[var(--border)]'} hover:scale-[1.005] transition-all animate-fade-in`}
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--secondary)] flex items-center justify-center text-xl">
                  {eventIcons[event.type] || '📌'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-black">{eventLabels[event.type] || event.type}</span>
                    {event.requestId > 0 && (
                      <span className="text-xs font-mono text-[var(--muted-foreground)]">RFP #{event.requestId}</span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{event.details}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[var(--muted-foreground)]">
                    <span className="font-mono text-indigo-400">{shortenAddress(event.wallet, 6)}</span>
                    <span>{timeAgo(event.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
