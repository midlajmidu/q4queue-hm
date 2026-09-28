import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Mail } from "lucide-react";

const faqs = [
  {
    question: "What hardware is required to run Q4Queue?",
    answer:
      "None. Q4Queue runs entirely in modern web browsers. Your staff can operate the counter dashboard from any laptop, desktop, or tablet. Customers join the queue simply by scanning a printed QR code with their phone camera.",
  },
  {
    question: "Do customers need to download an application or sign up?",
    answer:
      "No. There are no app installs, logins, or app store downloads required. When a visitor scans your venue QR code, their digital ticket opens directly in Safari, Chrome, or any default mobile browser.",
  },
  {
    question: "How does Q4Queue support multiple counters and service types?",
    answer:
      "You can configure unlimited service departments (e.g., General Consultation, Billing, Pharmacy, Diagnostics) and assign individual staff members to specific desks. When an operator calls the next ticket, the system routes the next visitor according to their requested service.",
  },
  {
    question: "Can we broadcast current queue numbers on lobby TV screens?",
    answer:
      "Yes. Q4Queue includes a built-in Lobby Display URL. You can load this on any smart TV, monitor, or digital signage display to broadcast currently called tokens, counter assignments, and recently completed numbers.",
  },
  {
    question: "How are customers notified when their turn arrives?",
    answer:
      "The visitor's mobile browser ticket updates in real time with dynamic wait time recalculations. When an operator calls their ticket, their phone screen flashes, rings an auditory chime, and displays their designated counter number.",
  },
  {
    question: "Can we test Q4Queue at a single location before rolling it out branch-wide?",
    answer:
      "Yes. You can set up and run a pilot queue at a single counter or clinic in less than five minutes. Our support team is available to help configure multi-location routing and custom operational policies whenever you are ready.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-20 md:py-28 bg-white border-b border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3">
            Frequently Asked Questions
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1220] tracking-[-0.03em] leading-tight">
            Frequently answered questions.
          </h2>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Everything operations managers and facility leads need to know about implementing Q4Queue.
          </p>
        </div>

        {/* Accordion */}
        <div className="mt-12 rounded-xl border border-slate-200 divide-y divide-slate-200 bg-white shadow-xs">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="px-5 border-none">
                <AccordionTrigger className="py-5 text-left text-sm sm:text-base font-bold text-slate-900 hover:text-blue-600 hover:no-underline transition-colors">
                  <div className="flex items-center gap-3 pr-4">
                    <span className="font-mono text-xs font-semibold text-slate-400 shrink-0">
                      0{i + 1}
                    </span>
                    <span>{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 text-sm leading-relaxed pb-5 pl-7 pr-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact Strip */}
        <div className="mt-8 p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="text-sm font-bold text-slate-900">Have specific technical or security requirements?</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Our operations engineering team is here to answer architecture and integration questions.
            </div>
          </div>
          <a
            href="mailto:contact@q4queue.com"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-colors shrink-0 shadow-xs"
          >
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            Contact team
          </a>
        </div>
      </div>
    </section>
  );
}
