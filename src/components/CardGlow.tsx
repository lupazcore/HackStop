"use client";
import { useEffect, useRef, type ReactNode, type PointerEvent } from "react";

export function CardGlow({ children }: { children: ReactNode }) {
  const card = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);
  const point = useRef({ x: 0, y: 0 });
  const enabled = useRef(false);
  useEffect(() => {
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      enabled.current = fine.matches && !reduced.matches;
      if (!enabled.current && frame.current !== null) cancelAnimationFrame(frame.current);
      if (!enabled.current) frame.current = null;
    };
    sync();
    fine.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      fine.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);
  function move(event: PointerEvent<HTMLElement>) {
    if (!enabled.current || event.pointerType === "touch") return;
    point.current = { x: event.clientX, y: event.clientY };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const element = card.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--pointer-x", `${point.current.x - rect.left}px`);
      element.style.setProperty("--pointer-y", `${point.current.y - rect.top}px`);
    });
  }
  function leave() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    card.current?.style.removeProperty("--pointer-x");
    card.current?.style.removeProperty("--pointer-y");
  }
  return <article ref={card} onPointerMove={move} onPointerLeave={leave} className="glow-card panel relative flex min-w-0 flex-col transition-colors duration-150"><div aria-hidden="true" className="card-glow" /><div className="relative z-10 flex flex-1 flex-col gap-5">{children}</div></article>;
}
