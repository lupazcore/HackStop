"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import type { Actor } from "@/lib/permissions";
import { useMutation } from "../forms/use-mutation";

export function Navigation({ user }: { user: Actor | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const mutation = useMutation();
  const roleBorder = { organizer: "border-role-organizer", judge: "border-role-judge", participant: "border-role-participant", admin: "border-role-admin" };
  const links = [{ href: "/projects", label: "Project gallery" }, ...(user ? [{ href: "/vote", label: "Community vote" }] : []), ...(user?.role === "participant" ? [{ href: "/participant/teams", label: "My teams" }, { href: "/participant/submissions", label: "My submissions" }] : []), ...(user?.role === "organizer" ? [{ href: "/organizer/events", label: "My events" }] : []), ...(user?.role === "judge" ? [{ href: "/judge/assignments", label: "My reviews" }] : [])];
  const navigation = <>{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={pathname.startsWith(link.href) ? "page" : undefined} className={pathname.startsWith(link.href) ? "text-primary underline underline-offset-4" : "text-ink-secondary hover:text-primary"}>{link.label}</Link>)}</>;
  return <header className="border-b border-border bg-surface">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6 lg:px-12">
      <Link className="text-h4 font-semibold text-ink" href="/projects">HackStop<span className="ml-2 text-xs font-medium text-ink-secondary">PORTAL</span></Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-6 text-sm font-medium md:flex">{navigation}</nav>
      <div className="flex items-center gap-3 text-sm">{user ? <><span className="hidden text-ink-secondary lg:inline">{user.name}</span><span className={`rounded-full border px-2 py-1 text-xs font-medium text-ink ${roleBorder[user.role]}`}>{user.role}</span><button disabled={mutation.pending} onClick={async () => { if (await mutation.send("/api/auth/logout", "POST")) { router.push("/login"); router.refresh(); } }} className="hidden text-ink-secondary hover:text-primary md:block">Sign out</button></> : <Link href="/login" className="button-secondary">Sign in</Link>}
        <button className="button-secondary md:hidden" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </div>
    {open && <nav aria-label="Mobile navigation" className="flex flex-col gap-4 border-t border-border p-6 text-sm md:hidden">{navigation}{user && <button className="text-left text-primary" onClick={async () => { if (await mutation.send("/api/auth/logout", "POST")) { setOpen(false); router.push("/login"); router.refresh(); } }}>Sign out</button>}</nav>}
    {mutation.error && <p role="alert" className="px-6 text-sm text-error">{mutation.error}</p>}
  </header>;
}
