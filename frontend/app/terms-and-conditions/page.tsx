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
      <main className="flex-1 py-32 px-6">
        <div className="max-w-3xl mx-auto text-foreground">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📜</span>
            <h1 className="text-4xl font-heading font-bold uppercase tracking-tight">Terms & Conditions – Q4queue</h1>
          </div>
          <p className="text-muted-foreground mb-12">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-10 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">1. Introduction</h2>
              <p className="text-muted-foreground">
                Welcome to Q4queue. By accessing <a href="https://www.q4queue.com" className="text-primary hover:underline">www.q4queue.com</a>, 
                you agree to these Terms and Conditions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">2. Services</h2>
              <p className="text-muted-foreground mb-3">Q4queue provides a SaaS platform for businesses to manage queues, including:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Queue and session management</li>
                <li>Customer handling</li>
                <li>QR-based queue system</li>
                <li>Future WhatsApp notification integration</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">3. User Accounts</h2>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Accounts are created and provided by Q4queue</li>
                <li>Users must provide accurate information</li>
                <li>Users are responsible for maintaining account security</li>
                <li>We may suspend accounts if misuse is detected</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">4. Data Responsibility</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Q4queue does not access or manage customer data of businesses</li>
                <li>Businesses are fully responsible for the data they collect and use</li>
                <li>Q4queue acts only as a platform provider</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">5. Acceptable Use</h2>
              <p className="text-muted-foreground mb-3">Users agree not to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Use the platform for illegal activities</li>
                <li>Attempt to hack, overload, or disrupt the system</li>
                <li>Engage in spam or abusive behavior</li>
                <li>Misuse customer data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">6. Payments & Trial</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>We offer a 2-week free trial</li>
                <li>Payments are currently handled manually after onboarding</li>
                <li>Pricing details are shared during communication</li>
                <li>Future updates may include subscription-based billing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">7. Refund Policy</h2>
              <p className="text-muted-foreground">
                Payments are generally non-refundable, unless explicitly agreed otherwise.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">8. Intellectual Property</h2>
              <p className="text-muted-foreground">
                All platform content, software, and branding belong to Q4queue. 
                Unauthorized use or reproduction is strictly prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">9. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-3">Q4queue is not liable for:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Service interruptions or downtime</li>
                <li>Data loss or delays</li>
                <li>Actions or misuse by users</li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground italic">
                (We do not guarantee uninterrupted or error-free service.)
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">10. Termination</h2>
              <p className="text-muted-foreground mb-3">We may suspend or terminate accounts if:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Terms are violated</li>
                <li>Suspicious or harmful activity is detected</li>
                <li>Abuse, spam, or unauthorized access attempts occur</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">11. Data Deletion</h2>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Clients may request account deletion at any time</li>
                <li>Data will be removed as per our retention policy</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">12. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms are governed by the laws of India, with jurisdiction in Kerala.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">13. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may update these Terms at any time. Continued use means acceptance of updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">14. Contact</h2>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">📧 Email:</span> <a href="mailto:contact@q4queue.com" className="text-primary hover:underline">contact@q4queue.com</a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
