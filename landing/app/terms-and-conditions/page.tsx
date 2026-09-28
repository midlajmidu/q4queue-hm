import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Q4queue",
  description: "Terms and conditions for using Q4queue services.",
};

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 py-24 md:py-32 px-6 relative">
        {/* Subtle background gradient for premium feel */}
        <div className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-primary/5 via-primary/5 to-transparent pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight text-foreground mb-4">
              Terms & Conditions
            </h1>
            <p className="text-muted-foreground text-lg font-medium">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="bg-background/60 backdrop-blur-xl rounded-3xl p-8 md:p-12 lg:p-16 border border-border shadow-sm space-y-12">
            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-loose">
                Welcome to Q4queue. By accessing <a href="https://www.q4queue.com" className="text-primary hover:underline font-medium">www.q4queue.com</a>, 
                you agree to these Terms and Conditions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">2. Services</h2>
              <p className="text-muted-foreground leading-loose mb-3">Q4queue provides a SaaS platform for businesses to manage queues, including:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose">
                <li>Queue and session management</li>
                <li>Customer handling</li>
                <li>QR-based queue system</li>
                <li>Future WhatsApp notification integration</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">3. User Accounts</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose">
                <li>Accounts are created and provided by Q4queue</li>
                <li>Users must provide accurate information</li>
                <li>Users are responsible for maintaining account security</li>
                <li>We may suspend accounts if misuse is detected</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">4. Data Responsibility</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose">
                <li>Q4queue does not access or manage customer data of businesses</li>
                <li>Businesses are fully responsible for the data they collect and use</li>
                <li>Q4queue acts only as a platform provider</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">5. Acceptable Use</h2>
              <p className="text-muted-foreground leading-loose mb-3">Users agree not to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose">
                <li>Use the platform for illegal activities</li>
                <li>Attempt to hack, overload, or disrupt the system</li>
                <li>Engage in spam or abusive behavior</li>
                <li>Misuse customer data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">6. Payments & Trial</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose">
                <li>We offer a 2-week free trial</li>
                <li>Payments are currently handled manually after onboarding</li>
                <li>Pricing details are shared during communication</li>
                <li>Future updates may include subscription-based billing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">7. Refund Policy</h2>
              <p className="text-muted-foreground leading-loose">
                Payments are generally non-refundable, unless explicitly agreed otherwise.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">8. Intellectual Property</h2>
              <p className="text-muted-foreground leading-loose">
                All platform content, software, and branding belong to Q4queue. 
                Unauthorized use or reproduction is strictly prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">9. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-loose mb-3">Q4queue is not liable for:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose mb-4">
                <li>Service interruptions or downtime</li>
                <li>Data loss or delays</li>
                <li>Actions or misuse by users</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-border pl-4">
                We do not guarantee uninterrupted or error-free service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">10. Termination</h2>
              <p className="text-muted-foreground leading-loose mb-3">We may suspend or terminate accounts if:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose">
                <li>Terms are violated</li>
                <li>Suspicious or harmful activity is detected</li>
                <li>Abuse, spam, or unauthorized access attempts occur</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">11. Data Deletion</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose">
                <li>Clients may request account deletion at any time</li>
                <li>Data will be removed as per our retention policy</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">12. Governing Law</h2>
              <p className="text-muted-foreground leading-loose">
                These Terms are governed by the laws of India, with jurisdiction in Kerala.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">13. Changes to Terms</h2>
              <p className="text-muted-foreground leading-loose">
                We may update these Terms at any time. Continued use means acceptance of updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">14. Contact</h2>
              <div className="bg-secondary/20 border border-border/50 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-heading font-semibold text-foreground w-20">Email:</span>
                  <a href="mailto:contact@q4queue.com" className="text-primary hover:underline font-medium">contact@q4queue.com</a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
