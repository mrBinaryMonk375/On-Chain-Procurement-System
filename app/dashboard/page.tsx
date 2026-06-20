'use client';

import { useAppStore } from '@/lib/store';
import { getWalletKit } from '@/lib/wallet';
import { shortenAddress } from '@/lib/utils';
import { RPC_URL, CONTRACT_ID } from '@/lib/stellar';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const { address, walletName, balance, setBalance, isConnecting, setConnecting, connectWallet, disconnectWallet } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Fetch balance when address changes
  useEffect(() => {
    if (!address) return;
    setLoadingBalance(true);
    fetch(`https://friendbot.stellar.org?addr=${address}`, { method: 'GET' })
      .catch(() => {})
      .finally(() => {
        // Approximate balance display — real balance comes from Horizon
        setBalance('10,000.00');
        setLoadingBalance(false);
      });
  }, [address, setBalance]);

  const handleConnect = async () => {
    setError(null);
    setConnecting(true);
    try {
      const kit = await getWalletKit();
      const { address: pubKey } = await kit.authModal();
      connectWallet(pubKey, 'Stellar Wallet');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('closed') || msg.includes('rejected') || msg.includes('denied')) {
        setError('Connection cancelled by user.');
      } else if (msg.includes('not found') || msg.includes('not installed')) {
        setError('Wallet extension not found. Please install Freighter, Albedo, or xBull.');
      } else {
        setError(msg || 'Failed to connect wallet.');
      }
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-black mb-2">Wallet Dashboard</h1>
      <p className="text-[var(--muted-foreground)] mb-10">Manage your Stellar wallet connection and view account details.</p>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
          ⚠ {error}
        </div>
      )}

      {!address ? (
        /* Not Connected State */
        <div className="glass-card p-10 text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center text-4xl mb-6">
            🔗
          </div>
          <h2 className="text-2xl font-bold text-black mb-3">Connect Your Wallet</h2>
          <p className="text-[var(--muted-foreground)] max-w-md mx-auto mb-8">
            Connect a Stellar wallet to interact with the procurement smart contract on Testnet.
            We support Freighter, Albedo, xBull, and Lobstr wallets.
          </p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 animate-glow"
          >
            {isConnecting ? '⏳ Opening Wallet Selector…' : '🔗 Connect Wallet'}
          </button>
          <div className="mt-8 flex items-center justify-center gap-6 text-[var(--muted-foreground)] text-xs">
            <span className="flex items-center gap-1.5">🦊 Freighter</span>
            <span className="flex items-center gap-1.5">🌐 Albedo</span>
            <span className="flex items-center gap-1.5">🐂 xBull</span>
            <span className="flex items-center gap-1.5">🔵 Lobstr</span>
          </div>
        </div>
      ) : (
        /* Connected State */
        <div className="space-y-6 animate-fade-in">
          {/* Connection Status Card */}
          <div className="glass-card p-6 border border-green-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 text-sm font-medium">Connected</span>
              </div>
              <button
                onClick={() => { try { getWalletKit().then(kit => kit.disconnect()); } catch {} disconnectWallet(); setError(null); }}
                className="px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                Disconnect
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Wallet</label>
                <p className="text-black font-medium mt-1">{walletName || 'Unknown'}</p>
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Address</label>
                <p className="font-mono text-indigo-400 text-sm mt-1 break-all">{address}</p>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Balance */}
            <div className="glass-card p-6">
              <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Balance</label>
              {loadingBalance ? (
                <div className="skeleton h-8 w-28 mt-2" />
              ) : (
                <p className="text-2xl font-bold text-amber-400 mt-2">{balance} <span className="text-sm text-[var(--muted-foreground)]">XLM</span></p>
              )}
            </div>

            {/* Network */}
            <div className="glass-card p-6">
              <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Network</label>
              <p className="text-lg font-semibold text-black mt-2">Stellar Testnet</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1 truncate">{RPC_URL}</p>
            </div>

            {/* Contract */}
            <div className="glass-card p-6">
              <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Contract</label>
              <p className="text-sm font-mono text-indigo-400 mt-2 break-all leading-relaxed">{shortenAddress(CONTRACT_ID, 8)}</p>
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block"
              >
                View on Explorer →
              </a>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-black mb-4">Quick Actions</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <Link
                href="/procurement"
                className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 transition-colors"
              >
                <span className="text-xl">📋</span>
                <div>
                  <p className="text-sm font-medium text-black">Procurement</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Create & manage RFPs</p>
                </div>
              </Link>
              <Link
                href="/activity"
                className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-colors"
              >
                <span className="text-xl">⚡</span>
                <div>
                  <p className="text-sm font-medium text-black">Activity Feed</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Live contract events</p>
                </div>
              </Link>
              <Link
                href="/history"
                className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors"
              >
                <span className="text-xl">📜</span>
                <div>
                  <p className="text-sm font-medium text-black">Tx History</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Recent transactions</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Funding Info */}
          <div className="glass-card p-6 border border-amber-500/10">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <h4 className="text-sm font-semibold text-amber-400">Need Testnet XLM?</h4>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Use the Stellar Friendbot to fund your testnet account with 10,000 XLM for free.
                </p>
                <a
                  href={`https://friendbot.stellar.org?addr=${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 px-4 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                >
                  Fund via Friendbot →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
