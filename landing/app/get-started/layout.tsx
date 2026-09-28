import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started | Q4Queue — Digital Queue System for Clinics",
  description: "Start your 1-week free trial with q4queue. Setup your clinic or business queue management system in under 5 minutes. No hardware required.",
};

export default function GetStartedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
