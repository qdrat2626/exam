import React from 'react';

export const LivingBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#f7f9fa]">
      {/* Subtle geometric dot grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1.2px, transparent 1.2px)',
          backgroundSize: '28px 28px'
        }}
      />

      {/* Floating Animated Gradient Glow Blobs */}
      {/* Emerald Green Glow Blob */}
      <div
        className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-[#58cc02]/15 blur-[90px] animate-pulse-glow"
        style={{ animationDuration: '9s' }}
      />

      {/* Sky Blue Glow Blob */}
      <div
        className="absolute top-1/3 -left-28 w-[460px] h-[460px] rounded-full bg-[#1cb0f6]/15 blur-[100px] animate-float-slow"
        style={{ animationDuration: '16s' }}
      />

      {/* Warm Gold/Amber Glow Blob */}
      <div
        className="absolute -bottom-24 right-1/4 w-[480px] h-[480px] rounded-full bg-[#ffc800]/12 blur-[100px] animate-float-reverse"
        style={{ animationDuration: '14s' }}
      />

      {/* Soft Rose Glow Blob */}
      <div
        className="absolute top-2/3 right-10 w-[320px] h-[320px] rounded-full bg-[#58cc02]/10 blur-[80px] animate-pulse-glow"
        style={{ animationDuration: '11s' }}
      />

      {/* Gentle Floating Geometric Elements (No emojis) */}
      <div className="absolute left-[8%] animate-particle-1">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#58cc02]">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" fillOpacity="0.4" />
        </svg>
      </div>

      <div className="absolute left-[28%] animate-particle-2">
        <div className="w-4 h-4 rounded-full border-2 border-[#1cb0f6]/40" />
      </div>

      <div className="absolute right-[12%] animate-particle-3">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-[#ffc800]">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" fillOpacity="0.45" />
        </svg>
      </div>

      <div className="absolute right-[32%] animate-particle-4">
        <div className="w-3.5 h-3.5 rotate-45 border-2 border-[#58cc02]/40" />
      </div>

      <div className="absolute left-[45%] animate-particle-5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#1cb0f6]">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.45" />
        </svg>
      </div>

      <div className="absolute right-[6%] animate-particle-6">
        <div className="w-3 h-3 rounded-md bg-[#ff9600]/25" />
      </div>
    </div>
  );
};
