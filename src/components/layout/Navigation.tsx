"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Actor } from "@/lib/permissions";
import { useMutation } from "../forms/use-mutation";
import { AppearanceControl } from "./AppearanceControl";

type NavLink = { href: string; label: string };
type Props = { user: Actor | null; children: ReactNode };

export function Navigation({ user, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const mutation = useMutation();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const oldOverflow = useRef("");
  const [open, setOpen] = useState(false);
  const eventId = pathname.match(/^\/organizer\/events\/([^/]+)/)?.[1];
  const workspace = pathname.startsWith("/organizer/") || pathname.startsWith("/participant/") || pathname === "/judge/assignments";
  const links: NavLink[] = [
    { href: "/projects", label: "Project gallery" },
    ...(user ? [{ href: "/vote", label: "Community vote" }] : []),
    ...(user?.role === "participant" ? [{ href: "/participant/teams", label: "My teams" }, { href: "/participant/submissions", label: "My submissions" }] : []),
    ...(user?.role === "organizer" ? [{ href: "/organizer/events", label: "My events" }] : []),
    ...(user?.role === "judge" ? [{ href: "/judge/assignments", label: "My reviews" }] : []),
  ];
  const eventLinks: NavLink[] = user?.role === "organizer" && eventId ? [
    { href: `/organizer/events/${eventId}`, label: "Event overview" },
    { href: `/organizer/events/${eventId}/judging`, label: "Manage judging" },
    { href: `/organizer/events/${eventId}/community`, label: "Community activity" },
  ] : [];
  const allLinks = [...links, ...eventLinks];
  const current = allLinks.filter(link => pathname === link.href || pathname.startsWith(link.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  function closeDrawer(restore = true) {
    if (dialog.current?.open) dialog.current.close();
    document.body.style.overflow = oldOverflow.current;
    setOpen(false);
    if (restore) requestAnimationFrame(() => trigger.current?.focus());
  }
  function showDrawer() {
    oldOverflow.current = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
    setOpen(true);
    requestAnimationFrame(() => dialog.current?.querySelector<HTMLButtonElement>("[data-drawer-close]")?.focus());
  }
  useEffect(() => {
    const breakpoint = matchMedia("(min-width: 1024px)");
    const onResize = () => { if (breakpoint.matches && dialog.current?.open) closeDrawer(false); };
    breakpoint.addEventListener("change", onResize);
    return () => { breakpoint.removeEventListener("change", onResize); document.body.style.overflow = oldOverflow.current; };
  }, []);
  useEffect(() => {
    if (dialog.current?.open) {
      closeDrawer(false);
      requestAnimationFrame(() => document.getElementById("main")?.focus());
    }
  }, [pathname]);
  async function signOut() {
    if (await mutation.send("/api/auth/logout", "POST")) {
      if (dialog.current?.open) closeDrawer(false);
      router.push("/login");
      router.refresh();
    }
  }
  const navLinks = (mobile: boolean) => allLinks.map(link => <Link key={link.href} href={link.href} aria-current={current === link.href ? "page" : undefined} onClick={mobile ? () => closeDrawer(false) : undefined} className={`flex min-h-11 min-w-0 items-center border-l-[3px] px-3 text-sm font-medium no-underline transition-colors duration-150 ${current === link.href ? "border-primary bg-primary-light text-ink" : "border-transparent text-ink-secondary hover:bg-surface-hover hover:text-ink"}`}>{link.label}</Link>);
  if (pathname === "/login") return <main id="main" tabIndex={-1} className="min-h-screen">{children}</main>;
  return <div className="min-h-screen">
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-12">
        <button ref={trigger} type="button" aria-label="Open navigation" aria-controls="mobile-navigation" aria-expanded={open} onClick={showDrawer} className="button-secondary w-11 shrink-0 px-0 lg:hidden"><Menu size={20} aria-hidden="true" /></button>
        <Link href="/projects" className="shrink-0 text-lg font-bold tracking-tight text-ink no-underline">Hack<span className="text-primary-ink">Stop</span><span className="ml-2 hidden align-middle font-mono text-[10px] font-medium tracking-[.2em] text-ink-tertiary sm:inline">PORTAL</span></Link>
        <nav aria-label="Main navigation" className="ml-auto hidden items-center gap-1 lg:flex">{links.map(link => <Link key={link.href} href={link.href} aria-current={current === link.href ? "page" : undefined} className={`rounded-sm px-3 py-2 text-sm font-medium no-underline ${current === link.href ? "bg-primary-light text-ink" : "text-ink-secondary hover:bg-surface-hover hover:text-ink"}`}>{link.label}</Link>)}</nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          {user ? <><div aria-label={`${user.name}, ${user.role} account`} className="hidden min-w-0 text-right xl:block"><span className="block max-w-40 truncate text-sm font-medium">{user.name}</span></div><button disabled={mutation.pending} onClick={signOut} className="button-secondary hidden lg:inline-flex">Sign out</button></> : <Link href="/login" className="button-secondary hidden lg:inline-flex">Sign in</Link>}
          <div className="hidden lg:block"><AppearanceControl /></div>
        </div>
      </div>
      <noscript><nav aria-label="Navigation without JavaScript" className="flex flex-wrap gap-2 border-t border-border p-3 lg:hidden">{links.map(link => <a key={link.href} href={link.href} className="button-secondary">{link.label}</a>)}{!user && <a href="/login" className="button-secondary">Sign in</a>}</nav></noscript>
      {mutation.error && <p role="alert" className="px-4 py-2 text-sm text-error">{mutation.error}</p>}
    </header>
    <dialog ref={dialog} id="mobile-navigation" aria-label="Navigation" onClose={() => { document.body.style.overflow = oldOverflow.current; setOpen(false); }} onCancel={() => closeDrawer()} onClick={event => { if (event.target === dialog.current) closeDrawer(); }} className="drawer-dialog">
      <div className="drawer-panel">
        <div className="mb-5 flex items-center justify-between gap-3"><strong className="text-lg">HackStop</strong><button data-drawer-close type="button" aria-label="Close navigation" onClick={() => closeDrawer()} className="button-secondary w-11 px-0"><X size={20} aria-hidden="true" /></button></div>
        {user && <div aria-label={`${user.name}, ${user.role} account`} className="mb-5 border-b border-border pb-5"><p className="break-words font-medium">{user.name}</p></div>}
        <nav aria-label="Mobile navigation" className="space-y-1">{navLinks(true)}</nav>
        <div className="mt-6 border-t border-border pt-5"><AppearanceControl inline /></div>
        <div className="mt-6 border-t border-border pt-5">{user ? <button disabled={mutation.pending} onClick={signOut} className="button-secondary w-full">Sign out</button> : <Link href="/login" onClick={() => closeDrawer(false)} className="button-secondary w-full">Sign in</Link>}</div>
      </div>
    </dialog>
    <div className="page-atmosphere" data-intensity={workspace || pathname.startsWith("/judge/scoring") || pathname.startsWith("/vote") ? "quiet" : "public"}>
    <div className={workspace ? "mx-auto grid max-w-[1600px] min-w-0 lg:grid-cols-[240px_minmax(0,1fr)]" : ""}>
      {workspace && <aside aria-label="Workspace navigation" className="hidden border-r border-border bg-surface px-3 py-8 lg:block"><p className="px-3 pb-4 font-mono text-xs font-semibold uppercase tracking-widest text-ink-tertiary">Workspace</p><nav className="space-y-1">{navLinks(false)}</nav>{pathname.endsWith("/judging") && <nav aria-label="Judging sections" className="mt-6 space-y-1 border-t border-border pt-5 text-sm">{[["#judge-invitations","Judge invitations"],["#scoring-rubric","Scoring rubric"],["#manual-assignments","Manual assignments"],["#automatic-assignments","Automatic assignments"],["#judge-progress","Judge progress"],["#normalized-rankings","Normalized rankings"]].map(([href,label]) => <a key={href} href={href} className="block rounded-sm px-4 py-2 text-ink-secondary hover:bg-surface-hover hover:text-ink">{label}</a>)}</nav>}</aside>}
      <div className={workspace ? "min-w-0" : ""}>
        <main key={pathname} id="main" tabIndex={-1} className="route-content mx-auto min-h-[calc(100vh-8rem)] max-w-7xl px-4 py-8 sm:px-6 lg:px-12 lg:py-12">{children}</main>
      </div>
    </div>
    </div>
    <footer className="border-t border-border bg-surface px-4 py-6 text-xs text-ink-secondary sm:px-6 lg:px-12"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><span>HackStop · Self-hosted hackathon portal</span><span className="font-mono">Built for the work behind the showcase</span></div></footer>
  </div>;
}
