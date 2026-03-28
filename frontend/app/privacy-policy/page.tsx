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
      <main className="flex-1 py-32 px-6">
        <div className="max-w-3xl mx-auto text-foreground">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔐</span>
            <h1 className="text-4xl font-heading font-bold uppercase tracking-tight">Privacy Policy – Q4queue</h1>
          </div>
          <p className="text-muted-foreground mb-12">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="space-y-10 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">1. Introduction</h2>
              <p className="text-muted-foreground mb-4">
                Welcome to Q4queue (“we”, “our”, “us”).
                We operate the website <a href="https://www.q4queue.com" className="text-primary hover:underline">www.q4queue.com</a>.
                This Privacy Policy explains how we collect, use, and protect your information when you use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">2. Information We Collect</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">A. Business (Client) Information</h3>
                  <p className="text-muted-foreground mb-3">We collect the following information from businesses (our clients):</p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Name</li>
                    <li>Email Address</li>
                    <li>Phone Number</li>
                    <li>Login Credentials</li>
                    <li>Company Type</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">B. Customer Data (Managed by Clients)</h3>
                  <p className="text-muted-foreground mb-3">Businesses using Q4queue may collect and manage their own customer data, including:</p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Name</li>
                    <li>Age</li>
                    <li>Phone Number</li>
                  </ul>
                  <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-sm font-semibold text-foreground mb-1">Important:</p>
                    <p className="text-sm text-muted-foreground italic">
                      Q4queue does not access, control, or manage this customer data. 
                      We act only as a service provider (data processor), and the respective business is fully responsible for the data they collect and manage.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">C. Technical Data</h3>
                  <p className="text-muted-foreground mb-3">
                    We do not actively use technical data for tracking purposes. 
                    However, limited system logs (such as server logs) may be collected automatically for operational and security purposes.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">3. How We Collect Data</h2>
              <p className="text-muted-foreground mb-3">We collect data through:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Registration and onboarding forms</li>
                <li>Direct communication with clients</li>
                <li>Manual account creation by our team</li>
                <li>Cookies (for login/session management)</li>
                <li>Basic analytics tools (if enabled)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">4. How We Use Your Data</h2>
              <p className="text-muted-foreground mb-3">We use your data to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Verify and onboard clients</li>
                <li>Provide login credentials</li>
                <li>Deliver and maintain our services</li>
                <li>Communicate with clients</li>
                <li>Improve platform functionality</li>
                <li>Provide support and updates</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">5. Third-Party Services</h2>
              <p className="text-muted-foreground mb-3">We may use:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Google Analytics</li>
                <li>Google Search Console</li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground italic">
                (Currently, WhatsApp integration is not active but may be added in the future for notifications.)
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">6. Data Sharing</h2>
              <p className="text-muted-foreground mb-3">We do not sell or share your data with third parties. We may only share data:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>With secure hosting/service providers (for system operation)</li>
                <li>If required by law or legal authorities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">7. Data Storage & Retention</h2>
              <p className="text-muted-foreground mb-3">
                Client data is stored securely for the duration of the active plan. 
                After plan expiry, data may be retained for up to 2 months for follow-up and renewal. 
                If not renewed, data will be permanently deleted.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">8. Data Security</h2>
              <p className="text-muted-foreground mb-3">We implement reasonable security measures such as:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Secure storage systems</li>
                <li>Restricted access</li>
                <li>Authentication controls</li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground italic">
                (Note: While we strive for security, no system is completely secure.)
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">9. User Rights</h2>
              <p className="text-muted-foreground mb-3">Clients (business users) have the right to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                <li>Access their data</li>
                <li>Update their data</li>
                <li>Request deletion of their account and data</li>
              </ul>
              <p className="text-muted-foreground">
                Requests can be made via: <a href="mailto:contact@q4queue.com" className="text-primary hover:underline font-semibold">📧 contact@q4queue.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">10. Cookies</h2>
              <p className="text-muted-foreground mb-3">We use cookies for:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Login/session management</li>
              </ul>
              <p className="mt-4 text-muted-foreground">Users can disable cookies through browser settings.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">11. Children’s Privacy</h2>
              <p className="text-muted-foreground">Our services are not intended for individuals under the age of 13.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">12. Changes to This Policy</h2>
              <p className="text-muted-foreground">We may update this Privacy Policy from time to time. Updates will be posted on this page.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 font-heading border-b border-border pb-2">13. Contact Us</h2>
              <div className="space-y-2 text-muted-foreground">
                <p><span className="font-semibold text-foreground">📧 Email:</span> <a href="mailto:contact@q4queue.com" className="text-primary hover:underline">contact@q4queue.com</a></p>
                <p><span className="font-semibold text-foreground">📍 Address:</span> Kanam Kunnath, NIT (PO), Calicut, Kerala – 673601, India</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
