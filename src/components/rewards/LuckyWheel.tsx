import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface WheelSegment {
  label: string;
  emoji: string;
  color: string;
  rewardType: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const SEGMENTS: WheelSegment[] = [
  { label: "Boost 24h", emoji: "🚀", color: "hsl(var(--primary))", rewardType: "boost_24h", rarity: "rare" },
  { label: "50 XP", emoji: "⚡", color: "hsl(210, 70%, 50%)", rewardType: "xp_50", rarity: "common" },
  { label: "Badge exclusif", emoji: "🏅", color: "hsl(280, 70%, 50%)", rewardType: "exclusive_badge", rarity: "epic" },
  { label: "100 XP", emoji: "💎", color: "hsl(330, 70%, 50%)", rewardType: "xp_100", rarity: "rare" },
  { label: "Cadre avatar", emoji: "🎨", color: "hsl(160, 60%, 45%)", rewardType: "avatar_frame", rarity: "rare" },
  { label: "250 XP", emoji: "🔥", color: "hsl(30, 80%, 50%)", rewardType: "xp_250", rarity: "epic" },
  { label: "Boost gratuit", emoji: "✨", color: "hsl(50, 80%, 50%)", rewardType: "free_boost", rarity: "rare" },
  { label: "Décoration", emoji: "🎭", color: "hsl(200, 60%, 50%)", rewardType: "decoration", rarity: "common" },
];

const SPIN_COST = 200;

interface LuckyWheelProps {
  xp: number;
  onRewardClaimed: () => void;
}

export const LuckyWheel = ({ xp, onRewardClaimed }: LuckyWheelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<WheelSegment | null>(null);
  const [showResult, setShowResult] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canSpin = xp >= SPIN_COST && !spinning;

  const drawWheel = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;
    const segAngle = (2 * Math.PI) / SEGMENTS.length;

    ctx.clearRect(0, 0, size, size);

    // Draw segments
    SEGMENTS.forEach((seg, i) => {
      const startAngle = i * segAngle - Math.PI / 2;
      const endAngle = startAngle + segAngle;

      // Segment fill
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // Segment border
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + segAngle / 2);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(seg.emoji, radius * 0.6, 6);
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(seg.label, radius * 0.6, 22);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 28, 0, 2 * Math.PI);
    ctx.fillStyle = "hsl(var(--background))";
    ctx.fill();
    ctx.strokeStyle = "hsl(var(--border))";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "hsl(var(--foreground))";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", center, center);
  }, []);

  // Draw on mount
  const canvasRefCb = useCallback((node: HTMLCanvasElement | null) => {
    if (node) {
      const dpr = window.devicePixelRatio || 1;
      node.width = 300 * dpr;
      node.height = 300 * dpr;
      node.getContext("2d")?.scale(dpr, dpr);
      node.style.width = "300px";
      node.style.height = "300px";
      drawWheel(node);
      (canvasRef as any).current = node;
    }
  }, [drawWheel]);

  const handleSpin = async () => {
    if (!user || !canSpin) return;
    setSpinning(true);
    setShowResult(false);
    setResult(null);

    try {
      // Server-side: deduct XP and pick reward
      const winIndex = Math.floor(Math.random() * SEGMENTS.length);
      const won = SEGMENTS[winIndex];

      // Deduct XP
      const newXP = xp - SPIN_COST;
      await supabase.from("profiles").update({ xp: newXP, last_wheel_spin: new Date().toISOString() }).eq("user_id", user.id);
      await supabase.from("xp_transactions").insert({ user_id: user.id, amount: -SPIN_COST, reason: "Lucky Wheel spin" });

      // Award XP-based rewards
      let xpGain = 0;
      if (won.rewardType === "xp_50") xpGain = 50;
      if (won.rewardType === "xp_100") xpGain = 100;
      if (won.rewardType === "xp_250") xpGain = 250;

      if (xpGain > 0) {
        await supabase.from("profiles").update({ xp: newXP + xpGain }).eq("user_id", user.id);
        await supabase.from("xp_transactions").insert({ user_id: user.id, amount: xpGain, reason: `Lucky Wheel: ${won.label}` });
      }

      // Store reward
      await supabase.from("user_rewards").insert({
        user_id: user.id,
        reward_type: won.rewardType,
        reward_data: { label: won.label, emoji: won.emoji, rarity: won.rarity },
        expires_at: won.rewardType.includes("boost") ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
      });

      // Calculate spin animation
      const segAngle = 360 / SEGMENTS.length;
      const targetAngle = 360 - (winIndex * segAngle + segAngle / 2);
      const totalRotation = rotation + 360 * 5 + targetAngle;
      setRotation(totalRotation);

      // Show result after animation
      setTimeout(() => {
        setResult(won);
        setShowResult(true);
        setSpinning(false);
        onRewardClaimed();
      }, 4000);
    } catch {
      toast({ title: "Erreur", description: "Impossible de lancer la roue", variant: "destructive" });
      setSpinning(false);
    }
  };

  const RARITY_COLORS: Record<string, string> = {
    common: "text-emerald-400",
    rare: "text-blue-400",
    epic: "text-purple-400",
    legendary: "text-yellow-400",
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Wheel container */}
      <div className="relative">
        {/* Glow effect */}
        <div className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-500 ${spinning ? "opacity-60" : "opacity-20"}`}
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)" }} />

        {/* Pointer */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
        </div>

        {/* Wheel */}
        <div
          className="transition-transform ease-out"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: spinning ? "4s" : "0s",
            transitionTimingFunction: "cubic-bezier(0.17, 0.67, 0.12, 0.99)",
          }}
        >
          <canvas ref={canvasRefCb} className="rounded-full border-4 border-border shadow-2xl" />
        </div>

        {/* Particle effects during spin */}
        {spinning && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary animate-ping"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: "1.5s",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Result display */}
      {showResult && result && (
        <div className="animate-scale-in text-center bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-6 w-full max-w-xs shadow-2xl">
          <div className="text-5xl mb-3">{result.emoji}</div>
          <h3 className="text-lg font-bold mb-1">{result.label}</h3>
          <span className={`text-xs font-bold uppercase ${RARITY_COLORS[result.rarity]}`}>
            {result.rarity}
          </span>
          <p className="text-sm text-muted-foreground mt-2">
            Récompense ajoutée à votre inventaire !
          </p>
        </div>
      )}

      {/* Spin button */}
      <Button
        onClick={handleSpin}
        disabled={!canSpin}
        size="lg"
        className="w-full max-w-xs bg-gradient-to-r from-primary via-purple-500 to-blue-500 hover:opacity-90 text-white font-bold text-base shadow-lg shadow-primary/25"
      >
        {spinning ? (
          <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Rotation...</>
        ) : (
          <>🎰 Tourner ({SPIN_COST} XP)</>
        )}
      </Button>

      {xp < SPIN_COST && !spinning && (
        <p className="text-xs text-muted-foreground text-center">
          Il vous manque <span className="font-semibold text-foreground">{SPIN_COST - xp} XP</span> pour tourner
        </p>
      )}
    </div>
  );
};
