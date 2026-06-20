'use client';

import { useEffect, useState } from 'react';

export function MoneyBackground() {
  const [particles, setParticles] = useState<{ id: number; left: string; size: string; duration: string; delay: string; symbol: string }[]>([]);

  useEffect(() => {
    // Prevent hydration mismatch by generating on mount
    const symbols = ['$', '💵', '💰', '🪙'];
    const newParticles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 20 + 20}px`,
      duration: `${Math.random() * 8 + 6}s`,
      delay: `${Math.random() * 5}s`,
      symbol: symbols[Math.floor(Math.random() * symbols.length)]
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] opacity-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute text-green-500 opacity-0"
          style={{
            left: p.left,
            fontSize: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            animationName: 'floatAndBurst',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in'
          }}
        >
          {p.symbol}
        </div>
      ))}
    </div>
  );
}
