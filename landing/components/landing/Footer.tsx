import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const footerLinks = {
  product: [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Get started", href: "/pricing" },
  ],
  solutions: [
    { label: "Healthcare & Clinics", href: "/pricing" },
    { label: "Banking & Finance", href: "/pricing" },
    { label: "Retail & Flagships", href: "/pricing" },
    { label: "Entertainment & Leisure", href: "/pricing" },
    { label: "Civic & Government", href: "/pricing" },
  ],
  resources: [
    { label: "FAQ", href: "/#faq" },
    { label: "Contact Support", href: "mailto:contact@q4queue.com" },
  ],
  company: [
    { label: "Schedule Architecture Review", href: "/pricing/custom" },
    { label: "Pilot Deployment", href: "/pricing/custom" },
    { label: "Contact Operations Team", href: "mailto:contact@q4queue.com" },
  ],
};

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand & Direct Contact Column (4 cols) */}
          <div className="col-span-2 md:col-span-4 space-y-4">
            <Link href="/" className="inline-block">
              <Logo size="md" />
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              Q4Queue provides digital queue infrastructure for clinics, service counters, and customer-facing businesses.
            </p>

            <div className="pt-2 space-y-2 text-xs">
              <div className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                Support &amp; Inquiries
              </div>
              <div>
                <a
                  href="mailto:contact@q4queue.com"
                  className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  contact@q4queue.com
                </a>
              </div>
              <div>
                <a
                  href="tel:+919539679027"
                  className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  +91 9539679027
                </a>
              </div>
            </div>

            {/* Social Links */}
            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://www.linkedin.com/company/q4queue"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors"
                aria-label="LinkedIn"
              >
                <LinkedinIcon className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/q.4queue/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product Links (2 cols) */}
          <div className="col-span-1 md:col-span-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-sm">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-slate-500 hover:text-slate-900 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions Links (2 cols) */}
          <div className="col-span-1 md:col-span-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Solutions
            </h4>
            <ul className="space-y-2.5 text-sm">
              {footerLinks.solutions.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-slate-500 hover:text-slate-900 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links (2 cols) */}
          <div className="col-span-1 md:col-span-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5 text-sm">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-slate-500 hover:text-slate-900 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Legal Links (2 cols) */}
          <div className="col-span-1 md:col-span-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-sm">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-slate-500 hover:text-slate-900 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom copyright bar */}
        <div className="mt-14 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            &copy; {new Date().getFullYear()} Q4Queue. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-slate-600 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms-and-conditions" className="hover:text-slate-600 transition-colors">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
