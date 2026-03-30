import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AnimatedSection from "./AnimatedSection";
import { ArrowRight } from "lucide-react";

const faqs = [
  {
    question: "Is the Q4Queue token system free to try?",
    answer:
      "Yes! We offer a 1-week free trial for businesses to test our digital queue management software. After the trial, we provide transparent pricing for clinics, retail shops, and banks depending on your needs.",
  },
  {
    question: "Do customers need an app for the virtual queue?",
    answer:
      "No. Q4Queue is 100% web-based. Customers simply scan the QR queue code and join the virtual waiting room instantly through their mobile browser.",
  },
  {
    question: "What hardware is required for this waiting list software?",
    answer:
      "Zero hardware. You only need a smartphone, tablet, or laptop with an internet connection. Just generate your QR code, print it, and start managing your lines digitally.",
  },
  {
    question: "Can I manage clinic queues from my mobile phone?",
    answer:
      "Absolutely. Our SaaS dashboard is fully responsive. You can serve patients, call tokens, and monitor real-time queue analytics from any device, anywhere.",
  },
  {
    question: "How do visitors receive queue notifications?",
    answer:
      "Visitors stay updated through their live browser window. They get real-time position updates and proximity alerts when their turn is approaching in the digital line.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-20 md:py-28 px-6 bg-secondary/40">
      <div className="max-w-2xl mx-auto">
        <AnimatedSection className="text-center mb-12">
          <span className="inline-block text-primary font-semibold text-sm tracking-wide uppercase mb-3 px-3 py-1 rounded-full bg-primary/8 border border-primary/15">FAQ</span>
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-[-0.02em] text-foreground mt-4">
            Common Questions
          </h2>
          <p className="mt-3 text-muted-foreground text-base max-w-md mx-auto">
            Everything you need to know about getting started with Q4Q.
          </p>
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <div className="glass-card rounded-2xl p-6 md:p-8">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-gray-200/60">
                  <AccordionTrigger className="font-heading text-left font-semibold text-foreground hover:no-underline text-base py-4 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed text-sm pb-4 pl-10">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </AnimatedSection>

        {/* Contact block */}
        <AnimatedSection delay={0.2}>
          <div className="mt-8 text-center glass-card rounded-2xl p-6">
            <p className="text-foreground font-semibold">Still have questions?</p>
            <p className="text-muted-foreground text-sm mt-1">
              We&apos;re here to help. Reach out and we&apos;ll get back to you within 24 hours.
            </p>
            <a href="mailto:contact@q4queue.com" className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-primary hover:underline">
              Contact Support <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default FAQ;
