import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

type FieldProps = { label: string; name: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>;
export function Field({ label, name, hint, ...props }: FieldProps) {
  return <div className="field"><label htmlFor={name}>{label}</label><input id={name} name={name} aria-describedby={hint ? `${name}-hint` : undefined} {...props} />{hint && <p id={`${name}-hint`} className="text-xs text-ink-secondary">{hint}</p>}</div>;
}
export function TextField({ label, name, ...props }: { label: string; name: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <div className="field"><label htmlFor={name}>{label}</label><textarea id={name} name={name} {...props} /></div>;
}
export function FormError({ error }: { error: string }) { return error ? <p role="alert" className="rounded-sm border border-error bg-error-light p-3 text-sm text-error">{error}</p> : null; }
export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) { return <button className="button" type="submit" disabled={pending}>{pending ? "Saving…" : children}</button>; }
