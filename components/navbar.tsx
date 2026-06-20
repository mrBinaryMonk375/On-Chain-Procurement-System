'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getWalletKit } from '@/lib/wallet';
import { shortenAddress } from '@/lib/utils';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/dashboard', label: 'Dashboard', icon: '💼' },
  { href: '/procurement', label: 'Procurement', icon: '📋' },
  { href: '/activity', label: 'Activity', icon: '⚡' },
  { href: '/history', label: 'History', icon: '📜' },
];

export function Navbar() {
  const pathname = usePathname();
  const { address, walletName, isConnecting, setConnecting, connectWallet, disconnectWallet } = useAppStore();
  const [error, setError] = useState<string | null>(null);

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

  const handleDisconnect = () => {
    try { getWalletKit().then(kit => kit.disconnect()); } catch { /* ignore */ }
    disconnectWallet();
    setError(null);
  };

  // Auto-dismiss errors
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform">
              ⛓
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hidden sm:inline">
              StellarProcure
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === item.href 
                    ? 'bg-[var(--stellar-glow)] text-indigo-400 border border-indigo-500/30' 
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5'
                }`}
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Wallet Button */}
          <div className="flex items-center gap-3">
            {error && (
              <div className="hidden lg:flex items-center gap-1 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs max-w-[300px] truncate">
                ⚠ {error}
              </div>
            )}
            {address ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs text-[var(--muted-foreground)]">{walletName}</span>
                  <span className="text-sm font-mono text-indigo-400">{shortenAddress(address, 6)}</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 animate-glow"
              >
                {isConnecting ? '⏳ Connecting…' : '🔗 Connect Wallet'}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                pathname === item.href
                  ? 'bg-[var(--stellar-glow)] text-indigo-400'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
