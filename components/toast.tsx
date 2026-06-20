'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';


export function Toast() {
  const transactions = useAppStore((s) => s.transactions);
  const [visible, setVisible] = useState<string | null>(null);

  // Show toast for the most recent pending/success/failed transaction
  useEffect(() => {
    if (transactions.length > 0) {
      const latest = transactions[0];
      setVisible(latest.hash);
      const timer = setTimeout(() => setVisible(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [transactions]);

  if (!visible) return null;
  const tx = transactions.find(t => t.hash === visible);
  if (!tx) return null;

  const statusColor = tx.status === 'success' ? 'border-green-500/30 bg-green-500/10' :
                       tx.status === 'failed' ? 'border-red-500/30 bg-red-500/10' :
                       'border-yellow-500/30 bg-yellow-500/10';
  const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className={`glass-card p-4 border ${statusColor} max-w-sm`}>
        <div className="flex items-start gap-3">
          <span className="text-xl">{statusIcon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)] truncate">{tx.title}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-mono truncate">{tx.hash}</p>
            <a 
              href={tx.explorerLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block"
            >
              View on Explorer →
            </a>
          </div>
          <button onClick={() => setVisible(null)} className="text-[var(--muted-foreground)] hover:text-white text-xs">✕</button>
        </div>
      </div>
    </div>
  );
}
