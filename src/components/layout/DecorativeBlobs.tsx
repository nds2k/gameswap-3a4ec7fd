import logo from "@/assets/gameswap-logo.png";

export const DecorativeBlobs = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Gradient background from bottom to top */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, hsl(174 72% 40% / 0.06), hsl(262 60% 55% / 0.03), transparent 70%)`,
        }}
      />

      {/* Decorative blobs */}
      <div className="blob w-32 h-32 -top-8 -left-8 opacity-30" />
      <div className="blob w-40 h-40 top-20 -right-12 opacity-20" />
      <div className="blob w-24 h-24 top-1/3 left-1/4 opacity-15" />
      <div className="blob w-48 h-48 top-1/2 right-1/3 opacity-10" />
      <div className="blob w-36 h-36 bottom-1/4 left-16 opacity-25" />
      <div className="blob w-28 h-28 bottom-32 right-1/4 opacity-20" />

      {/* Subtle dice icon */}
      <div className="absolute top-[15%] right-[10%] opacity-[0.04] text-7xl rotate-12">🎲</div>
      <div className="absolute bottom-[20%] left-[8%] opacity-[0.04] text-6xl -rotate-12">🎯</div>
      <div className="absolute top-[60%] right-[20%] opacity-[0.03] text-5xl rotate-6">♟️</div>
      <div className="absolute top-[40%] left-[5%] opacity-[0.03] text-5xl -rotate-6">🎮</div>

      {/* Transparent logo watermark */}
      <div className="absolute bottom-[35%] right-[5%] opacity-[0.03]">
        <img src={logo} alt="" className="w-32 h-32" />
      </div>
      <div className="absolute top-[25%] left-[15%] opacity-[0.02]">
        <img src={logo} alt="" className="w-20 h-20 rotate-12" />
      </div>
    </div>
  );
};
