import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Q4queue",
  description: "Privacy policy for Q4queue.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 py-24 md:py-32 px-6 relative">
        {/* Subtle background gradient for premium feel */}
        <div className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-primary/5 via-primary/5 to-transparent pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight text-foreground mb-4">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-lg font-medium">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
          
          <div className="bg-background/60 backdrop-blur-xl rounded-3xl p-8 md:p-12 lg:p-16 border border-border shadow-sm space-y-12">
            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-loose">
                Welcome to Q4queue (“we”, “our”, “us”). We operate the website <a href="https://www.q4queue.com" className="text-primary hover:underline font-medium">www.q4queue.com</a>.
                This Privacy Policy explains how we collect, use, and protect your information when you use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">2. Information We Collect</h2>
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-3">A. Business (Client) Information</h3>
                  <p className="text-muted-foreground leading-loose mb-3">We collect the following information from businesses (our clients):</p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose">
                    <li>Name</li>
                    <li>Email Address</li>
                    <li>Phone Number</li>
                    <li>Login Credentials</li>
                    <li>Company Type</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-3">B. Customer Data (Managed by Clients)</h3>
                  <p className="text-muted-foreground leading-loose mb-3">Businesses using Q4queue may collect and manage their own customer data, including:</p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose">
                    <li>Name</li>
                    <li>Age</li>
                    <li>Phone Number</li>
                  </ul>
                  <div className="mt-6 p-5 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-sm font-heading font-bold text-foreground mb-2">Important Notice:</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Q4queue does not access, control, or manage this customer data. 
                      We act only as a service provider (data processor), and the respective business is fully responsible for the data they collect and manage.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-3">C. Technical Data</h3>
                  <p className="text-muted-foreground leading-loose">
                    We do not actively use technical data for tracking purposes. 
                    However, limited system logs (such as server logs) may be collected automatically for operational and security purposes.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">3. How We Collect Data</h2>
              <p className="text-muted-foreground leading-loose mb-3">We collect data through:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose">
                <li>Registration and onboarding forms</li>
                <li>Direct communication with clients</li>
                <li>Manual account creation by our team</li>
                <li>Cookies (for login/session management)</li>
                <li>Basic analytics tools (if enabled)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">4. How We Use Your Data</h2>
              <p className="text-muted-foreground leading-loose mb-3">We use your data to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose">
                <li>Verify and onboard clients</li>
                <li>Provide login credentials</li>
                <li>Deliver and maintain our services</li>
                <li>Communicate with clients</li>
                <li>Improve platform functionality</li>
                <li>Provide support and updates</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">5. Third-Party Services</h2>
              <p className="text-muted-foreground leading-loose mb-3">We may use:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose mb-4">
                <li>Google Analytics</li>
                <li>Google Search Console</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-border pl-4">
                Currently, WhatsApp integration is not active but may be added in the future for notifications.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">6. Data Sharing</h2>
              <p className="text-muted-foreground leading-loose mb-3">We do not sell or share your data with third parties. We may only share data:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose">
                <li>With secure hosting/service providers (for system operation)</li>
                <li>If required by law or legal authorities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">7. Data Storage & Retention</h2>
              <p className="text-muted-foreground leading-loose">
                Client data is stored securely for the duration of the active plan. 
                After plan expiry, data may be retained for up to 2 months for follow-up and renewal. 
                If not renewed, data will be permanently deleted.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">8. Data Security</h2>
              <p className="text-muted-foreground leading-loose mb-3">We implement reasonable security measures such as:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose mb-4">
                <li>Secure storage systems</li>
                <li>Restricted access</li>
                <li>Authentication controls</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-border pl-4">
                Note: While we strive for security, no system is completely secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">9. User Rights</h2>
              <p className="text-muted-foreground leading-loose mb-3">Clients (business users) have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose mb-6">
                <li>Access their data</li>
                <li>Update their data</li>
                <li>Request deletion of their account and data</li>
              </ul>
              <div className="bg-secondary/40 p-4 rounded-xl inline-block">
                <p className="text-sm font-medium text-foreground">
                  Requests can be made via email to: <a href="mailto:contact@q4queue.com" className="text-primary hover:underline ml-1">contact@q4queue.com</a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">10. Cookies</h2>
              <p className="text-muted-foreground leading-loose mb-3">We use cookies for:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-loose mb-4">
                <li>Login/session management</li>
              </ul>
              <p className="text-muted-foreground leading-loose">Users can disable cookies through browser settings.</p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">11. Children’s Privacy</h2>
              <p className="text-muted-foreground leading-loose">Our services are not intended for individuals under the age of 13.</p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">12. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-loose">We may update this Privacy Policy from time to time. Updates will be posted on this page.</p>
            </section>

            <section>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">13. Contact Us</h2>
              <div className="bg-secondary/20 border border-border/50 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-heading font-semibold text-foreground w-20">Email:</span>
                  <a href="mailto:contact@q4queue.com" className="text-primary hover:underline font-medium">contact@q4queue.com</a>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-heading font-semibold text-foreground w-20">Address:</span>
                  <span className="text-muted-foreground">Kanam Kunnath, NIT (PO), Calicut, Kerala – 673601, India</span>
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
