import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeMap = {
    sm: {
      iconSize: "w-6 h-6",
      textSize: "text-lg",
      qSize: "text-sm",
    },
    md: {
      iconSize: "w-8 h-8",
      textSize: "text-2xl",
      qSize: "text-xl",
    },
    lg: {
      iconSize: "w-10 h-10",
      textSize: "text-3xl",
      qSize: "text-2xl",
    },
  };

  const { iconSize, textSize, qSize } = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2 group select-none cursor-pointer w-fit", className)}>
      <div className={cn("relative flex items-center justify-center shrink-0", iconSize)}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-900 rounded-[28%] transform rotate-3 group-hover:rotate-12 transition-all duration-500 shadow-lg shadow-blue-900/20" />
        <div className="absolute inset-0 bg-gradient-to-tl from-indigo-500 to-blue-400 rounded-[28%] transform -rotate-6 group-hover:-rotate-3 transition-all duration-500 opacity-70 mix-blend-overlay" />
        <div className="absolute inset-0 border-[1.5px] border-white/30 rounded-[28%] transform -rotate-3 group-hover:-rotate-0 transition-all duration-500" />
        <span className={cn("relative text-white font-heading font-black leading-none z-10", qSize)}>Q</span>
      </div>
      <span className={cn("font-heading font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800", textSize)}>
        4Queue
      </span>
    </div>
  );
}
