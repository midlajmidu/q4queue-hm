# Q4Queue — Digital Queue Management Landing Page

This repository contains the marketing and lead-capture landing page for **Q4Queue**, a premium SaaS platform designed for clinics and service centers to manage customer queues with precision. 

This landing page acts as the primary entry point for new users, highlighting the core benefits of our smart token system, real-time synchronization, and multi-tenant isolation.

---

## 🚀 Key Value Propositions

- **Seamless Onboarding**: Customers join queues instantly via QR scan — no apps required.
- **Smart Notifications**: Automated updates reduce perceived wait times and improve satisfaction.
- **Real-Time Analytics**: Actionable insights into peak hours and visitor flow.
- **Multi-Queue Support**: Centralized management across counters, doctors, or different services.

---

## 🛠️ Technology Stack

This landing page is built for maximum performance, SEO, and visual fidelity.

- **Framework**: [Next.js](https://nextjs.org) (App Router, v16+)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) 
- **UI Components**: Custom implementation based on [shadcn/ui](https://ui.shadcn.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚦 Running Locally

1. **Clone the repository and navigate to the project directory:**
   ```bash
   git clone https://github.com/q4queuee-ui/q4queue-landing.git
   cd q4queue-landing
   ```

2. **Install dependencies:**
   Ensure you are using a modern version of Node.js (v20+).
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. The page automatically updates as you modify the source files.

---

## 🏗️ Project Structure

```text
q4queue-landing/
├── app/                  # Next.js App Router (Layouts, Pages, Metadata)
├── components/           # Reusable React components
│   ├── landing/          # Domain-specific components (Hero, Features, FAQ, CTA)
│   └── ui/               # Core UI primitive components (Button, Accordion, Logo)
├── lib/                  # Shared utilities (e.g., tailwind merge tools)
└── public/               # Static assets (Images, Icons, Robots.txt)
```

---

## 📜 License

Proprietary SaaS Framework. Internal use only.
