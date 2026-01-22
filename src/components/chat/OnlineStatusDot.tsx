import { cn } from "@/lib/utils";

interface OnlineStatusDotProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const OnlineStatusDot = ({ isOnline, size = "md", className }: OnlineStatusDotProps) => {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };
  
  return (
    <span
      className={cn(
        "rounded-full border-2 border-background transition-colors duration-300",
        sizeClasses[size],
        isOnline ? "bg-green-500" : "bg-muted-foreground/50",
        className
      )}
    />
  );
};
