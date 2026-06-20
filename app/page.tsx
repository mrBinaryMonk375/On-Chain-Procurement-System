'use client';

import Link from 'next/link';
import { useRequests, useEvents } from '@/hooks/useProcurement';
import { useAppStore } from '@/lib/store';

import { RequestStatus } from '@/types';

const features = [
  {
    icon: '📋',
    title: 'Create RFPs',
    description: 'Post procurement requests with budgets locked in on-chain escrow. Transparent, tamper-proof, and fully auditable.',
    gradient: 'from-indigo-500/20 to-purple-500/20',
    border: 'border-indigo-500/20',
  },
  {
    icon: '💰',
    title: 'Place Competitive Bids',
    description: 'Vendors submit bids directly to the contract. Amount, delivery timeline, and scope are immutably recorded.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/20',
  },
  {
    icon: '🔒',
    title: 'Escrow & Auto-Settlement',
    description: 'Budgets are held in smart contract escrow. On completion, funds flow to vendor automatically — no intermediaries.',
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/20',
  },
  {
    icon: '⚡',
    title: 'Real-Time Event Feed',
    description: 'Every action emits on-chain events: RFP creation, bid placement, vendor selection, completion, and cancellation.',
    gradient: 'from-rose-500/20 to-pink-500/20',
    border: 'border-rose-500/20',
  },
];

const steps = [
  { num: '01', title: 'Connect Wallet', desc: 'Use Freighter, Albedo, or xBull to connect your Stellar wallet.' },
  { num: '02', title: 'Create or Browse RFPs', desc: 'Post a procurement request or browse open opportunities.' },
  { num: '03', title: 'Bid & Negotiate', desc: 'Vendors submit competitive bids; buyers review and select.' },
  { num: '04', title: 'Auto-Settle On-Chain', desc: 'Once delivered, escrow releases funds automatically.' },
];

export default function HomePage() {
  const { data: requests } = useRequests();
  const { data: events } = useEvents();
  const { address } = useAppStore();

  const openCount = requests?.filter(r => r.status === RequestStatus.Open).length ?? 0;
  const completedCount = requests?.filter(r => r.status === RequestStatus.Completed).length ?? 0;
  const totalVolume = requests?.reduce((sum, r) => sum + Number(r.budget) / 10000000, 0) ?? 0;
  const eventCount = events?.length ?? 0;

  return (
    <div className="relative">
      {/* Gradient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/[0.05] blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-teal-500/[0.04] blur-[80px]" />
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Built on Stellar · Soroban Smart Contracts
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-black">
            <span>
              On-Chain Procurement
            </span>
            <br />
            <span>Reinvented</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed">
            Create transparent RFPs, receive competitive bids, and let smart contracts handle escrow and settlement.
            Every transaction is verifiable on Stellar Testnet.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {address ? (
              <Link
                href="/procurement"
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-base hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                Open Procurement Dashboard →
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-base hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                Connect Wallet to Start →
              </Link>
            )}
            <Link
              href="/activity"
              className="px-8 py-3 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-medium text-base hover:bg-white/5 hover:border-indigo-500/30 transition-all"
            >
              View Live Activity
            </Link>
          </div>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-20 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {[
            { label: 'Open RFPs', value: openCount, icon: '📋', color: 'text-emerald-400' },
            { label: 'Completed', value: completedCount, icon: '✅', color: 'text-indigo-400' },
            { label: 'Total Volume', value: `${totalVolume.toLocaleString()} XLM`, icon: '💎', color: 'text-amber-400' },
            { label: 'On-Chain Events', value: eventCount, icon: '⚡', color: 'text-rose-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-5 text-center hover:border-indigo-500/20 transition-colors">
              <span className="text-2xl">{stat.icon}</span>
              <p className={`text-2xl sm:text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">How It Works</h2>
          <p className="mt-3 text-[var(--muted-foreground)] text-lg">End-to-end procurement powered by Soroban smart contracts</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`glass-card p-6 border ${f.border} hover:scale-[1.03] transition-all duration-300 animate-fade-in`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <span className="text-3xl">{f.icon}</span>
              <h3 className="text-lg font-semibold text-white mt-4">{f.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-2 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Step-by-Step */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Get Started in 4 Steps</h2>
        </div>
        <div className="space-y-6">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className="flex items-start gap-6 glass-card p-6 hover:border-indigo-500/20 transition-all animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {s.num}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-10 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              ⛓
            </div>
            <span className="text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Procure
            </span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Built on Stellar Testnet · Soroban Smart Contracts · {new Date().getFullYear()}
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://stellar.expert/explorer/testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Explorer ↗
            </a>
            <a
              href="https://developers.stellar.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Stellar Docs ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
