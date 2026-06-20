'use client';

import { useAppStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';

export default function HistoryPage() {
  const transactions = useAppStore((s) => s.transactions);

  const statusIcon: Record<string, string> = { pending: '⏳', success: '✅', failed: '❌' };
  const statusColor: Record<string, string> = {
    pending: 'status-pending',
    success: 'status-success',
    failed: 'status-failed',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Transaction History</h1>
        <p className="text-[var(--muted-foreground)] mt-1">Recent contract interactions from this session.</p>
      </div>

      {transactions.length === 0 ? (
        /* Empty State */
        <div className="glass-card p-10 text-center animate-fade-in">
          <span className="text-4xl">📜</span>
          <p className="text-white font-medium mt-3">No transactions yet.</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-sm mx-auto">
            When you create RFPs, place bids, or perform other contract actions, your transaction history will appear here with status tracking and explorer links.
          </p>
        </div>
      ) : (
        /* Transaction List */
        <div className="space-y-3">
          {transactions.map((tx, idx) => (
            <div
              key={tx.hash}
              className="glass-card p-5 hover:border-indigo-500/15 transition-all animate-fade-in"
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--secondary)] flex items-center justify-center text-xl">
                  {statusIcon[tx.status]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{tx.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[tx.status]}`}>
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </span>
                  </div>

                  <p className="font-mono text-xs text-[var(--muted-foreground)] truncate mt-1">{tx.hash}</p>

                  <div className="flex items-center gap-4 mt-3">
                    <a
                      href={tx.explorerLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
                    >
                      View on Explorer ↗
                    </a>
                    <span className="text-xs text-[var(--muted-foreground)]">{timeAgo(tx.timestamp)}</span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex-shrink-0">
                  {tx.status === 'pending' && (
                    <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                  )}
                  {tx.status === 'success' && (
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  )}
                  {tx.status === 'failed' && (
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="mt-8 glass-card p-5 border border-[var(--border)] animate-fade-in">
        <div className="flex items-start gap-3">
          <span className="text-lg">ℹ️</span>
          <div>
            <h4 className="text-sm font-semibold text-white">Transaction Tracking</h4>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
              Transactions are tracked per browser session. Each contract interaction shows its current status:
              <strong className="text-yellow-400"> Pending</strong> (submitted to network),
              <strong className="text-green-400"> Success</strong> (confirmed on ledger),
              <strong className="text-red-400"> Failed</strong> (rejected or timed out).
              Click &quot;View on Explorer&quot; to verify on Stellar Expert.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
