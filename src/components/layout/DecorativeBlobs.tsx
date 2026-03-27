import logo from "@/assets/gameswap-logo.png";

export const DecorativeBlobs = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Light mode gradient */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background: `linear-gradient(to top, #f97316 0%, #e11d48 30%, #7c3aed 70%, transparent 100%)`,
          opacity: 0.08,
        }}
      />
      {/* Dark mode gradient - stronger */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: `linear-gradient(to top, #f97316 0%, #e11d48 30%, #7c3aed 70%, transparent 100%)`,
          opacity: 0.15,
        }}
      />
      {/* Light overlay / Dark overlay for readability */}
      <div className="absolute inset-0 bg-white/70 dark:bg-black/50" />

      {/* Soft blobs */}
      <div className="absolute rounded-full w-32 h-32 -top-8 -left-8 opacity-20 dark:opacity-10 blur-sm" style={{ background: 'hsl(270 50% 80%)' }} />
      <div className="absolute rounded-full w-40 h-40 top-20 -right-12 opacity-15 dark:opacity-8 blur-sm" style={{ background: 'hsl(330 50% 85%)' }} />
      <div className="absolute rounded-full w-48 h-48 top-1/2 right-1/3 opacity-10 dark:opacity-5 blur-md" style={{ background: 'hsl(25 60% 85%)' }} />

      {/* Floating dice */}
      <div className="absolute top-[12%] right-[8%] opacity-[0.06] dark:opacity-[0.04] text-7xl animate-float blur-[0.5px]">🎲</div>
      <div className="absolute bottom-[25%] left-[5%] opacity-[0.05] dark:opacity-[0.03] text-6xl animate-float-slow blur-[0.5px]">🎲</div>

      {/* Floating pawns */}
      <div className="absolute top-[55%] right-[18%] opacity-[0.05] dark:opacity-[0.03] text-5xl animate-float-slow blur-[0.5px]">♟️</div>
      <div className="absolute top-[35%] left-[6%] opacity-[0.06] dark:opacity-[0.04] text-6xl animate-float blur-[0.5px]">♟️</div>

      {/* Extra game icons */}
      <div className="absolute bottom-[40%] right-[32%] opacity-[0.04] dark:opacity-[0.02] text-5xl animate-float">🃏</div>
      <div className="absolute top-[75%] left-[22%] opacity-[0.04] dark:opacity-[0.02] text-5xl animate-float-slow">🏆</div>

      {/* Transparent logo watermarks */}
      <div className="absolute bottom-[30%] right-[4%] opacity-[0.03] dark:opacity-[0.02] animate-float-slow">
        <img src={logo} alt="" className="w-28 h-28" />
      </div>
      <div className="absolute top-[20%] left-[12%] opacity-[0.02] dark:opacity-[0.01] animate-float">
        <img src={logo} alt="" className="w-20 h-20 rotate-12" />
      </div>
    </div>
  );
};
