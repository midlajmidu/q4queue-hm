"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  isHash?: boolean;
}

const navItems: NavItem[] = [
  { label: "Product", href: "/product" },
  { label: "Operations", href: "/operations" },
  { label: "Solutions", href: "/solutions" },
  { label: "How it works", href: "/#how-it-works", isHash: true },
  { label: "FAQ", href: "/#faq", isHash: true },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLightNav = scrolled || pathname === "/get-started";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.q4queue.com").replace(/\/$/, "");

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: NavItem
  ) => {
    setMobileOpen(false);
    if (item.isHash && pathname === "/") {
      e.preventDefault();
      const hash = item.href.replace("/", "");
      const target = document.querySelector(hash);
      if (target) {
        const offset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = target.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    } else if (item.isHash && pathname !== "/") {
      e.preventDefault();
      router.push(item.href);
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isLightNav
          ? "bg-white/92 backdrop-blur-lg border-b border-slate-200/60 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)]"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-[68px] flex items-center justify-between">
        {/* Left: Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group outline-none shrink-0"
        >
          <Logo
            size="md"
            className={cn(
              "transition-all duration-300",
              !isLightNav && "[&_img]:brightness-0 [&_img]:invert"
            )}
          />
        </Link>

        {/* Center: Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-8 lg:gap-10"
          aria-label="Main Navigation"
        >
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={cn(
                "text-[14px] font-medium transition-colors",
                isLightNav
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-white/65 hover:text-white"
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <a
            href={`${appUrl}/login`}
            className={cn(
              "hidden sm:inline-flex text-[14px] font-medium transition-colors",
              isLightNav
                ? "text-slate-600 hover:text-slate-900"
                : "text-white/70 hover:text-white"
            )}
          >
            Log in
          </a>

          <a
            href={`${appUrl}/signup`}
            className={cn(
              "hidden md:inline-flex text-[14px] font-medium transition-colors",
              isLightNav
                ? "text-slate-600 hover:text-slate-900"
                : "text-white/70 hover:text-white"
            )}
          >
            Sign up
          </a>

          <Button
            size="sm"
            onClick={() => router.push("/get-started")}
            className={cn(
              "h-[44px] px-5 text-[14px] font-semibold rounded-[9px] shadow-sm transition-all active:scale-[0.99] cursor-pointer",
              isLightNav
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-white hover:bg-slate-100 text-[#0B1220]"
            )}
          >
            Get started
          </Button>

          {/* Mobile hamburger */}
          <button
            type="button"
            className={cn(
              "md:hidden p-2 focus:outline-none transition-colors",
              scrolled
                ? "text-slate-600 hover:text-slate-900"
                : "text-white/80 hover:text-white"
            )}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className={cn(
            "md:hidden backdrop-blur-lg border-b px-6 pt-3 pb-6 space-y-3 shadow-lg",
            scrolled
              ? "bg-white/98 border-slate-200"
              : "bg-[#06133D]/95 border-white/10"
          )}
        >
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={cn(
                "block py-2 text-base font-medium transition-colors",
                scrolled
                  ? "text-slate-700 hover:text-slate-900"
                  : "text-white/80 hover:text-white"
              )}
            >
              {item.label}
            </a>
          ))}
          <div
            className={cn(
              "pt-4 border-t flex flex-col gap-3",
              scrolled ? "border-slate-100" : "border-white/10"
            )}
          >
            <a
              href={`${appUrl}/login`}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block py-2 text-base font-medium",
                scrolled ? "text-slate-700" : "text-white/80"
              )}
            >
              Log in
            </a>
            <a
              href={`${appUrl}/signup`}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block py-2 text-base font-medium",
                scrolled ? "text-slate-700" : "text-white/80"
              )}
            >
              Sign up
            </a>
            <Button
              size="default"
              onClick={() => {
                setMobileOpen(false);
                router.push("/get-started");
              }}
              className={cn(
                "w-full justify-center gap-2 h-11 rounded-lg text-sm font-semibold",
                scrolled
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-white hover:bg-slate-100 text-[#0B1220]"
              )}
            >
              Get started <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
