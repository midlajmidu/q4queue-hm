"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

const navLinks = [
  { href: "/#features", label: "Features", scroll: true },
  { href: "/#how-it-works", label: "How It Works", scroll: true },
  { href: "/#faq", label: "FAQ", scroll: true },
  { href: "/about", label: "About", scroll: false },
];

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    // Hide navbar if scrolling down and past the threshold
    if (latest > previous && latest > 150) {
      setHidden(true);
      setMobileOpen(false); // Close mobile menu if open when scrolling down
    } else {
      setHidden(false);
    }
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;
    const scrollLinks = navLinks.filter((l) => l.scroll);
    const sections = scrollLinks.map((l) => document.querySelector(l.href.replace("/", "")));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive((entry.target as Element).id ? "#" + (entry.target as Element).id : "");
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => s && observer.observe(s));
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/about") setActive("/about");
  }, [pathname]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, link: (typeof navLinks)[0]) => {
    setMobileOpen(false);
    if (!link.scroll) return;
    e.preventDefault();
    const hash = link.href.split("#")[1];
    if (hash && pathname === "/") document.querySelector("#" + hash)?.scrollIntoView({ behavior: "smooth" });
    else router.push(link.href);
  };

  return (
    <motion.nav
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-colors duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
        <a href="/">
          <Logo size="lg" />
        </a>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = link.scroll ? active === "#" + link.href.split("#")[1] : active === link.href;
            const content = (
              <>
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </>
            );
            return link.scroll ? (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className={cn(
                  "text-sm font-heading font-medium transition-colors duration-200 relative tracking-wide",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {content}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-heading font-medium transition-colors duration-200 relative tracking-wide",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {content}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="hidden md:inline-block text-sm font-heading font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </a>
          <Button
            size="default"
            onClick={() => router.push('/get-started')}
            className="hidden md:flex gap-2 rounded-full px-6 font-heading font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all duration-300"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Button>
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border/40 px-6 pb-4 space-y-3">
          {navLinks.map((link) =>
            link.scroll ? (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className="block text-sm text-muted-foreground hover:text-foreground py-1.5 transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm text-muted-foreground hover:text-foreground py-1.5 transition-colors"
              >
                {link.label}
              </Link>
            )
          )}
          <Button
            size="sm"
            onClick={() => router.push('/get-started')}
            className="w-full gap-1.5 rounded-full font-semibold"
          >
            Get Started <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </motion.nav>
  );
};

export default Navbar;
