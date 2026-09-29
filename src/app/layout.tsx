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
const themeBootstrap = `(function(){var choice='system';try{var saved=localStorage.getItem('hackstop-theme');if(saved==='light'||saved==='dark'||saved==='system')choice=saved}catch(e){}var dark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=choice==='system'?(dark?'dark':'light'):choice})();`;
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head><body><a href="#main" className="skip-link sr-only">Skip to content</a><Navigation user={session?.user ?? null}>{children}</Navigation></body></html>;
}
