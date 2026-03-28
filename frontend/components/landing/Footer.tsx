import React from "react";
import Link from "next/link";
import { Mail, Instagram, Linkedin, Phone } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const Footer = () => {
  return (
    <footer className="relative py-16 px-6 border-t border-border/40 bg-background overflow-hidden">
      {/* Subtle gradient glow at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      <div className="max-w-6xl mx-auto">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand column */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-block">
              <Logo size="md" />
            </Link>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed max-w-xs font-heading">
              Turn physical lines into digital queues. No app install, no hardware, no hassle.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <p className="text-sm font-heading font-semibold text-foreground mb-1 uppercase tracking-wider">Contact Support</p>
              <a 
                href="mailto:contact@q4queue.com" 
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                contact@q4queue.com
              </a>
              <a 
                href="tel:+919539679027" 
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                +91 9539679027
              </a>
            </div>
          </div>

          {/* Company links and Legal combined as requested */}
          <div>
            <h4 className="text-sm font-heading font-bold text-foreground mb-6 uppercase tracking-widest">Company</h4>
            <ul className="space-y-4">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-and-conditions" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Social icons - FOLLOW US section */}
          <div>
            <h4 className="text-sm font-heading font-bold text-foreground mb-6 uppercase tracking-widest">Follow Us</h4>
            <div className="flex flex-col gap-4">
              <a 
                href="https://www.instagram.com/q.4queue/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <Instagram className="w-4.5 h-4.5" />
                </div>
                <span>Instagram</span>
              </a>
              <a 
                href="https://www.linkedin.com/company/q4queue" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <Linkedin className="w-4.5 h-4.5" />
                </div>
                <span>LinkedIn</span>
              </a>
              <a 
                href="mailto:contact@q4queue.com" 
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <span>Gmail</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground font-medium">
            © {new Date().getFullYear()} Q4queue. All rights reserved.
          </p>
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">
            Privacy Driven • Reliability First
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
