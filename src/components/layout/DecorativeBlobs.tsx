export const DecorativeBlobs = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Top left blob */}
      <div className="blob w-32 h-32 -top-8 -left-8 opacity-40" />
      
      {/* Top right blob */}
      <div className="blob w-40 h-40 top-20 -right-12 opacity-30" />
      
      {/* Center left blob */}
      <div className="blob w-24 h-24 top-1/3 left-1/4 opacity-25" />
      
      {/* Center right blob */}
      <div className="blob w-48 h-48 top-1/2 right-1/3 opacity-20" />
      
      {/* Bottom left blob */}
      <div className="blob w-36 h-36 bottom-1/4 left-16 opacity-35" />
      
      {/* Bottom right blob */}
      <div className="blob w-28 h-28 bottom-32 right-1/4 opacity-30" />
    </div>
  );
};
