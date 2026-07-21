import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeMap = {
    sm: "h-10 scale-[2.3] translate-y-1 md:h-12 md:scale-[3] md:translate-y-1.5", 
    md: "h-12 scale-[3] translate-y-1.5",
    lg: "h-16 scale-[3] translate-y-1.5",
  };

  const darkSizeMap = {
    sm: "h-10 scale-[2.65] translate-x-4 sm:translate-x-6 translate-y-1 md:h-12 md:scale-[3.45] md:translate-x-7 md:translate-y-1.5", 
    md: "h-12 scale-[3.45] translate-x-7 translate-y-1.5",
    lg: "h-16 scale-[3.45] translate-x-7 translate-y-1.5",
  };

  const heightClass = sizeMap[size];
  const darkHeightClass = darkSizeMap[size];

  return (
    <div className={cn("flex items-center justify-center group select-none cursor-pointer overflow-visible", className)}>
      <Image
        src="/q4queue-new_logo.png"
        alt="Q4Queue Logo"
        width={1536}
        height={1024}
        className={cn("object-contain w-auto transform origin-left transition-all dark:hidden", heightClass)}
        priority
      />
      <Image
        src="/q4queue-darkThemeLogo.png"
        alt="Q4Queue Logo"
        width={1536}
        height={1024}
        className={cn("object-contain w-auto transform origin-left transition-all hidden dark:block", darkHeightClass)}
        priority
      />
    </div>
  );
}
