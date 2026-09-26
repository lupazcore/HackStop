import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";
import { getSession } from "@/lib/session";
import { Navigation } from "@/components/layout/Navigation";

export const metadata: Metadata = { title: { default: "HackStop", template: "%s | HackStop" }, description: "A self-hosted hackathon portal." };
export const dynamic = "force-dynamic";
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return <html lang="en"><body><a href="#main" className="sr-only focus:not-sr-only">Skip to content</a><Navigation user={session?.user ?? null} /><main id="main" className="mx-auto max-w-7xl px-6 py-12 lg:px-12">{children}</main><footer className="mx-auto max-w-7xl border-t border-border px-6 py-6 text-xs text-ink-secondary lg:px-12">HackStop · Self-hosted hackathon portal</footer></body></html>;
}
