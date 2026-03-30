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
    question: "Is Q4queue free to use?",
    answer:
      "We offer a 2-week free trial for businesses to explore our platform. After the trial, we offer competitive B2B pricing tailored to your business needs. Contact us to learn more about our professional plans.",
  },
  {
    question: "Do visitors need to install an app?",
    answer:
      "No. Everything works through the browser. Visitors just scan a QR code and they're in the queue.",
  },
  {
    question: "What do I need to get started?",
    answer:
      "Just a device with a browser. Create your queue, print the QR code, and you're ready to go. No special hardware needed.",
  },
  {
    question: "Can I manage the queue from my phone?",
    answer:
      "Absolutely. The management interface works on any device — phone, tablet, or desktop. No software to install.",
  },
  {
    question: "How do visitors know when it's their turn?",
    answer:
      "Visitors see real time updates on their phone screen and receive notifications when their turn is approaching.",
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
