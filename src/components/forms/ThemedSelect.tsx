"use client";

import { ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

export type SelectOption = { value: string; label: string };
type Props = {
  id: string;
  label: ReactNode;
  options: SelectOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  ariaLabel?: string;
  triggerClassName?: string;
};
type Placement = { left: number; top: number; width: number; maxHeight: number };
const subscribe = () => () => {};

export function ThemedSelect({ id, label, options, name, value, defaultValue = "", onValueChange, disabled = false, required = false, ariaLabel, triggerClassName = "" }: Props) {
  const listId = useId();
  const labelId = useId();
  const errorId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [localValue, setLocalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const selected = value ?? localValue;
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === selected));

  function update(next: string) {
    if (value === undefined) setLocalValue(next);
    if (next) setInvalid(false);
    onValueChange?.(next);
  }

  function positionPanel() {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(rect.width, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const flip = below < 160 && above > below;
    const maxHeight = Math.max(44, Math.min(320, window.innerHeight * .6, flip ? above : below));
    setPlacement({ left, top: flip ? Math.max(8, rect.top - maxHeight - 8) : rect.bottom + 8, width, maxHeight });
  }

  useEffect(() => {
    if (value !== undefined) return;
    const form = native.current?.form;
    const reset = () => { setLocalValue(defaultValue); setInvalid(false); };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [defaultValue, value]);

  useEffect(() => {
    if (!open) return;
    positionPanel();
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false);
    };
    const focusAway = (event: FocusEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusAway);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focusAway);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const item = panel.current?.children[active] as HTMLElement | undefined;
    if (!item || !panel.current) return;
    if (item.offsetTop < panel.current.scrollTop) panel.current.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > panel.current.scrollTop + panel.current.clientHeight) panel.current.scrollTop = item.offsetTop + item.offsetHeight - panel.current.clientHeight;
  }, [active, open, placement]);

  function choose(index: number) {
    update(options[index].value);
    setActive(index);
    setOpen(false);
    trigger.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); return; }
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else { setActive(selectedIndex); setOpen(true); }
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) setOpen(true);
      if (event.key === "Home") setActive(0);
      else if (event.key === "End") setActive(options.length - 1);
      else setActive(index => (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
      return;
    }
    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const now = Date.now();
      typeahead.current.text = now - typeahead.current.at > 700 ? event.key.toLowerCase() : typeahead.current.text + event.key.toLowerCase();
      typeahead.current.at = now;
      const match = options.findIndex(option => option.label.toLowerCase().startsWith(typeahead.current.text));
      if (match >= 0) { setActive(match); setOpen(true); }
    }
  }

  const style: CSSProperties | undefined = placement ? { left: placement.left, top: placement.top, width: placement.width, maxHeight: placement.maxHeight } : undefined;
  return <div className="field min-w-0">
    <label id={labelId} htmlFor={ready ? `${id}-trigger` : id}>{label}</label>
    <select ref={native} id={id} name={name} value={selected} onChange={event => update(event.target.value)} disabled={disabled} required={required} hidden={ready} onInvalid={event => { if (ready) { event.preventDefault(); setInvalid(true); trigger.current?.focus(); setActive(0); setOpen(true); } }}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {ready && <button ref={trigger} id={`${id}-trigger`} type="button" role="combobox" aria-label={ariaLabel} aria-labelledby={ariaLabel ? undefined : labelId} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-activedescendant={open ? `${listId}-${active}` : undefined} aria-required={required} aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : undefined} disabled={disabled || !options.length} onClick={() => { setActive(selectedIndex); setOpen(current => !current); }} onKeyDown={onKeyDown} className={`themed-select-trigger ${triggerClassName}`}><span className="min-w-0 truncate">{options[selectedIndex]?.label ?? ""}</span><ChevronDown size={18} className="shrink-0 text-ink-secondary" aria-hidden="true" /></button>}
    {invalid && <p id={errorId} className="text-sm text-error">Select {typeof label === "string" ? label.toLowerCase() : "an option"}.</p>}
    {ready && open && placement && createPortal(<div ref={panel} id={listId} role="listbox" aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)} aria-labelledby={ariaLabel ? undefined : labelId} className="themed-select-panel" style={style}>
      {options.map((option, index) => <div key={option.value} id={`${listId}-${index}`} role="option" aria-selected={selectedIndex === index} onPointerEnter={() => setActive(index)} onClick={() => choose(index)} className={`themed-select-option ${index === active ? "themed-select-option-active" : ""}`}>{option.label}</div>)}
    </div>, document.body)}
  </div>;
}
