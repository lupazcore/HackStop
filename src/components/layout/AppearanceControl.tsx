"use client";
import { MoonStar, Sun, SunMoon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Choice = "light" | "dark" | "system";
let memoryChoice: Choice = "system";
const choices: { value: Choice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: MoonStar },
  { value: "system", label: "System", Icon: SunMoon },
];
function valid(value: string | null): value is Choice {
  return value === "light" || value === "dark" || value === "system";
}
function readChoice(): Choice {
  try { const stored = localStorage.getItem("hackstop-theme"); return valid(stored) ? stored : "system"; }
  catch { return memoryChoice; }
}
function paintChoice(value: Choice) {
  const resolved = value === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : value;
  document.documentElement.dataset.theme = resolved;
}
function transitionChoice(value: Choice) {
  const resolved = value === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : value;
  if (document.documentElement.dataset.theme === resolved || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    paintChoice(value);
  } else if (document.startViewTransition) {
    document.startViewTransition(() => paintChoice(value));
  } else {
    document.documentElement.classList.add("theme-transition-fallback");
    paintChoice(value);
    window.setTimeout(() => document.documentElement.classList.remove("theme-transition-fallback"), 460);
  }
}
function applyChoice(value: Choice) {
  memoryChoice = value;
  transitionChoice(value);
  try { localStorage.setItem("hackstop-theme", value); } catch { /* The current tab keeps its choice in memory. */ }
  window.dispatchEvent(new Event("hackstop-theme-change"));
}
export function AppearanceControl({ inline = false }: { inline?: boolean }) {
  const [choice, setChoice] = useState<Choice>("system");
  const [open, setOpen] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => { const next = readChoice(); setChoice(next); transitionChoice(next); };
    const syncInternal = () => setChoice(readChoice());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("hackstop-theme-change", syncInternal);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("hackstop-theme-change", syncInternal);
    };
  }, []);
  useEffect(() => {
    if (choice !== "system") return;
    const system = matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => transitionChoice("system");
    system.addEventListener("change", onSystem);
    return () => system.removeEventListener("change", onSystem);
  }, [choice]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!area.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const buttons = choices.map(({ value, label, Icon }) => <button key={value} type="button" aria-pressed={choice === value} onClick={() => { applyChoice(value); setChoice(value); setOpen(false); }} className={`flex min-h-11 w-full items-center gap-3 rounded-sm px-3 text-left text-sm ${choice === value ? "bg-accent-light font-semibold text-accent" : "text-ink hover:bg-surface-hover"}`}><Icon size={17} aria-hidden="true" />{label}</button>);
  if (inline) return <div role="group" aria-label="Appearance" className="space-y-1"><p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-tertiary">Appearance</p>{buttons}</div>;
  return <div ref={area} className="relative"><button type="button" aria-label="Appearance" aria-expanded={open} aria-controls="appearance-options" onClick={() => setOpen(!open)} className="button-secondary w-11 px-0"><SunMoon size={19} aria-hidden="true" /></button>{open && <div id="appearance-options" role="group" aria-label="Appearance" className="appearance-menu p-1">{buttons}</div>}</div>;
}
