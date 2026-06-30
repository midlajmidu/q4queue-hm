import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeMap = {
    sm: "h-7",   // Dashboard header
    md: "h-9",
    lg: "h-12",  // Landing navbar
  };

  const heightClass = sizeMap[size];

  return (
    <div className={cn("flex items-center group select-none cursor-pointer", className)}>
      <Image
        src="/q4queue-main-logo.png"
        alt="Q4Queue Logo"
        width={760}
        height={219}
        className={cn("object-contain w-auto", heightClass)}
        priority
      />
    </div>
  );
}
