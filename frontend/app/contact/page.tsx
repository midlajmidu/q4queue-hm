import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Mail, MapPin, Phone } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Q4Queue — Get Support for Your Token System",
  description: "Have questions about our digital queue management system? Reach out to the Q4Queue team for pricing, demos, or technical support.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 py-32 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight text-foreground mb-4">
              Get in <span className="text-primary">Touch</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Have questions about pricing, features, or need support? We're here to help. Reach out to us below.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8 h-full">
              <div className="bg-secondary/30 rounded-3xl p-8 lg:p-10 border border-border/50 h-full flex flex-col justify-center">
                <h2 className="text-2xl font-bold font-heading mb-10 text-foreground">Contact Information</h2>
                
                <div className="space-y-8">
                  <div className="flex items-start gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div className="pt-2">
                      <h3 className="font-semibold tracking-wide text-foreground uppercase text-xs mb-1">Our Address</h3>
                      <p className="text-muted-foreground leading-relaxed mt-1">
                        Kanam Kunnath, NIT (PO),<br />
                        Calicut, Kerala – 673601,<br />
                        India
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div className="pt-2">
                      <h3 className="font-semibold tracking-wide text-foreground uppercase text-xs mb-1">Email Us</h3>
                      <a href="mailto:contact@q4queue.com" className="text-muted-foreground hover:text-primary transition-colors mt-1 block font-medium">
                        contact@q4queue.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div className="pt-2">
                      <h3 className="font-semibold tracking-wide text-foreground uppercase text-xs mb-1">Call Us</h3>
                      <a href="tel:+919539679027" className="text-muted-foreground hover:text-primary transition-colors mt-1 block font-medium">
                        +91 9539679027
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-background rounded-3xl p-8 lg:p-10 border border-border shadow-sm">
              <h2 className="text-2xl font-bold font-heading mb-8 text-foreground">Send us a Message</h2>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground tracking-wide">First Name</label>
                    <input 
                      type="text" 
                      placeholder="John" 
                      className="w-full px-4 py-3.5 rounded-xl bg-secondary/40 border border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground tracking-wide">Last Name</label>
                    <input 
                      type="text" 
                      placeholder="Doe" 
                      className="w-full px-4 py-3.5 rounded-xl bg-secondary/40 border border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground tracking-wide">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="john@example.com" 
                    className="w-full px-4 py-3.5 rounded-xl bg-secondary/40 border border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground tracking-wide">Message</label>
                  <textarea 
                    rows={5}
                    placeholder="How can we help you?" 
                    className="w-full px-4 py-3.5 rounded-xl bg-secondary/40 border border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none placeholder:text-muted-foreground/50"
                  ></textarea>
                </div>

                <button 
                  type="button" 
                  className="w-full py-4 px-6 bg-primary text-primary-foreground font-semibold tracking-wide rounded-xl hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 active:scale-[0.98] mt-2"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
