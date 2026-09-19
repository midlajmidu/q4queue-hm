import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  className?: string;
  imageClassName?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Logo({ className, imageClassName, size = "md" }: LogoProps) {
  const sizeMap = {
    sm: "h-5",
    md: "h-6",
    lg: "h-7",
    xl: "h-8",
  };

  return (
    <div className={cn("inline-flex items-center select-none", className)}>
      <Image
        src="/logo-main-trimmed.png"
        alt="Q4Queue"
        width={841}
        height={175}
        className={cn("object-contain w-auto", sizeMap[size], imageClassName)}
        priority
      />
    </div>
  );
}
