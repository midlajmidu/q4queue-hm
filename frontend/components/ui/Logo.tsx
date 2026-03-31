import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeMap = {
    sm: "h-4",   // 16px - matches Dashboard header sm logo
    md: "h-5",   // 20px
    lg: "h-6",   // 24px - Landing navbar
  };

  const heightClass = sizeMap[size];

  return (
    <div className={cn("flex items-center group select-none cursor-pointer", className)}>
      <Image
        src="/logo-main-trimmed.png"
        alt="Q4Queue Logo"
        width={841}
        height={175}
        className={cn("object-contain w-auto", heightClass)}
        priority
      />
    </div>
  );
}
