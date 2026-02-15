import logo from "@/assets/gameswap-logo.png";

export const DecorativeBlobs = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Gradient background: violet → rose → orange, bottom to top */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, hsl(25 80% 55% / 0.08), hsl(330 65% 55% / 0.06), hsl(270 60% 55% / 0.04), transparent 80%)`,
        }}
      />

      {/* Decorative blobs with violet/rose hues */}
      <div className="absolute rounded-full w-32 h-32 -top-8 -left-8 opacity-20" style={{ background: 'hsl(270 50% 80%)' }} />
      <div className="absolute rounded-full w-40 h-40 top-20 -right-12 opacity-15" style={{ background: 'hsl(330 50% 85%)' }} />
      <div className="absolute rounded-full w-24 h-24 top-1/3 left-1/4 opacity-10" style={{ background: 'hsl(25 60% 85%)' }} />
      <div className="absolute rounded-full w-48 h-48 top-1/2 right-1/3 opacity-8" style={{ background: 'hsl(270 40% 88%)' }} />
      <div className="absolute rounded-full w-36 h-36 bottom-1/4 left-16 opacity-15" style={{ background: 'hsl(330 40% 82%)' }} />
      <div className="absolute rounded-full w-28 h-28 bottom-32 right-1/4 opacity-12" style={{ background: 'hsl(25 50% 82%)' }} />

      {/* Board game icons */}
      <div className="absolute top-[15%] right-[10%] opacity-[0.05] text-7xl rotate-12">🎲</div>
      <div className="absolute bottom-[20%] left-[8%] opacity-[0.05] text-6xl -rotate-12">🎯</div>
      <div className="absolute top-[60%] right-[20%] opacity-[0.04] text-5xl rotate-6">♟️</div>
      <div className="absolute top-[40%] left-[5%] opacity-[0.04] text-5xl -rotate-6">🎮</div>
      <div className="absolute bottom-[40%] right-[35%] opacity-[0.03] text-6xl rotate-[-8deg]">🃏</div>
      <div className="absolute top-[75%] left-[25%] opacity-[0.03] text-5xl rotate-[15deg]">🏆</div>

      {/* Transparent logo watermarks */}
      <div className="absolute bottom-[35%] right-[5%] opacity-[0.03]">
        <img src={logo} alt="" className="w-32 h-32" />
      </div>
      <div className="absolute top-[25%] left-[15%] opacity-[0.02]">
        <img src={logo} alt="" className="w-20 h-20 rotate-12" />
      </div>
    </div>
  );
};
