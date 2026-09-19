"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, ArrowRight, ChevronDown, Building2, Stethoscope, Landmark, ShoppingBag, Gamepad2, Utensils } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";

interface NavItem {
  label: string;
  href: string;
  isHash?: boolean;
}

const navItems: NavItem[] = [
  { label: "Features", href: "/features" },
  { label: "How it works", href: "/#how-it-works", isHash: true },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq", isHash: true },
];

const industryLinks = [
  { label: "Healthcare & Clinics", href: "/industries/healthcare", icon: Stethoscope, desc: "Patient triage & clinical waiting" },
  { label: "Banking & Finance", href: "/industries/banking", icon: Landmark, desc: "Branch teller & wealth advisory" },
  { label: "Retail & Flagships", href: "/industries/retail", icon: ShoppingBag, desc: "Fitting rooms & boutique service" },
  { label: "Entertainment & Leisure", href: "/industries/entertainment", icon: Gamepad2, desc: "Bowling alleys, arcades & arenas" },
  { label: "Civic & Government", href: "/industries/government", icon: Building2, desc: "Municipal halls & permit desks" },
  { label: "Restaurants & Hospitality", href: "/industries/restaurants", icon: Utensils, desc: "Table waitlists & hostess stands" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLightNav = scrolled || pathname !== "/";

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: NavItem
  ) => {
    setMobileOpen(false);
    setIndustriesOpen(false);
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
          className="hidden md:flex items-center gap-7 lg:gap-9"
          aria-label="Main Navigation"
        >
          <Link
            href="/features"
            className={cn(
              "text-[14px] font-medium transition-colors",
              isLightNav
                ? "text-slate-600 hover:text-slate-900"
                : "text-white/65 hover:text-white"
            )}
          >
            Features
          </Link>

          {/* Minimal 2-Column Mega Dropdown: Industries */}
          <div
            className="relative"
            onMouseEnter={() => setIndustriesOpen(true)}
            onMouseLeave={() => setIndustriesOpen(false)}
          >
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 text-[14px] font-medium transition-colors py-2 cursor-pointer",
                isLightNav
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-white/65 hover:text-white"
              )}
            >
              <span>Industries</span>
              <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" />
            </button>

            {/* Dropdown Menu Box */}
            {industriesOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-[520px] rounded-2xl bg-white/98 backdrop-blur-xl border border-slate-200/90 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 border-b border-slate-100 mb-2 flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    Industries
                  </span>
                  <Link
                    href="/industries"
                    onClick={() => setIndustriesOpen(false)}
                    className="text-[11.5px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View All →
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {industryLinks.map((ind) => {
                    const Icon = ind.icon;
                    return (
                      <Link
                        key={ind.href}
                        href={ind.href}
                        onClick={() => setIndustriesOpen(false)}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50/80 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-[#0B1220] group-hover:text-blue-600 transition-colors truncate">
                            {ind.label}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {ind.desc}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <a
            href="/#how-it-works"
            onClick={(e) => handleNavClick(e, { label: "How it works", href: "/#how-it-works", isHash: true })}
            className={cn(
              "text-[14px] font-medium transition-colors",
              isLightNav
                ? "text-slate-600 hover:text-slate-900"
                : "text-white/65 hover:text-white"
            )}
          >
            How it works
          </a>

          <Link
            href="/pricing"
            className={cn(
              "text-[14px] font-medium transition-colors",
              isLightNav
                ? "text-slate-600 hover:text-slate-900"
                : "text-white/65 hover:text-white"
            )}
          >
            Pricing
          </Link>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-5">
          <a
            href={`${config.appUrl}/login`}
            className={cn(
              "hidden sm:inline-flex text-[14px] font-medium transition-colors",
              isLightNav
                ? "text-slate-600 hover:text-slate-900"
                : "text-white/70 hover:text-white"
            )}
          >
            Log in
          </a>

          <Button
            size="sm"
            onClick={() => router.push("/pricing")}
            className={cn(
              "h-[44px] px-5 text-[14px] font-semibold rounded-[9px] shadow-sm transition-all active:scale-[0.99] cursor-pointer",
              isLightNav
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-white hover:bg-slate-100 text-[#0B1220]"
            )}
          >
            Start 14-Day Free Trial
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
            "md:hidden backdrop-blur-lg border-b px-6 pt-3 pb-6 space-y-3 shadow-lg max-h-[85vh] overflow-y-auto",
            scrolled
              ? "bg-white/98 border-slate-200 text-slate-800"
              : "bg-[#06133D]/95 border-white/10 text-white"
          )}
        >
          <Link
            href="/features"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-base font-medium"
          >
            Features
          </Link>

          <div className="py-2 border-t border-b border-slate-100/20 my-2">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-2">
              Industries
            </div>
            <div className="grid grid-cols-1 gap-2 pl-2">
              {industryLinks.map((ind) => (
                <Link
                  key={ind.href}
                  href={ind.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-1 text-sm font-medium hover:text-blue-500"
                >
                  {ind.label}
                </Link>
              ))}
              <Link
                href="/industries"
                onClick={() => setMobileOpen(false)}
                className="py-1 text-xs font-bold text-blue-600"
              >
                View All Industries →
              </Link>
            </div>
          </div>

          <a
            href="/#how-it-works"
            onClick={(e) => handleNavClick(e, { label: "How it works", href: "/#how-it-works", isHash: true })}
            className="block py-2 text-base font-medium"
          >
            How it works
          </a>
          <Link
            href="/pricing"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-base font-medium"
          >
            Pricing
          </Link>

          <div className="pt-4 border-t border-slate-100/20 flex flex-col gap-3">
            <a
              href={`${config.appUrl}/login`}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-base font-medium"
            >
              Log in
            </a>
            <Button
              size="default"
              onClick={() => {
                setMobileOpen(false);
                router.push("/pricing");
              }}
              className="w-full justify-center gap-2 h-11 rounded-lg text-sm font-semibold bg-blue-600 text-white"
            >
              Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
