"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, FormError, SubmitButton } from "./Field";
import { useMutation } from "./use-mutation";

export function AuthForm({ register = false, next = "" }: { register?: boolean; next?: string }) {
  const mutation = useMutation();
  const router = useRouter();
  return <form className="panel space-y-5" onSubmit={async event => {
    event.preventDefault();
    const result = await mutation.send(`/api/auth/${register ? "register" : "login"}`, "POST", Object.fromEntries(new FormData(event.currentTarget)));
    if (result) {
      const destination = next.startsWith("/teams/") ? next : result.role === "organizer" ? "/organizer/events" : result.role === "participant" ? "/participant/teams" : "/projects";
      router.push(destination); router.refresh();
    }
  }}>
    {register && <Field label="Your name" name="name" autoComplete="name" required maxLength={255} />}
    <Field label="Email address" name="email" type="email" autoComplete="email" required maxLength={255} />
    <Field label="Password" name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 12 : 1} maxLength={72} hint={register ? "At least 12 characters, up to 72 UTF-8 bytes." : undefined} />
    <FormError error={mutation.error} /><SubmitButton pending={mutation.pending}>{register ? "Create account" : "Sign in"}</SubmitButton>
    <p className="text-sm text-ink-secondary">{register ? "Already registered?" : "New participant?"} <Link href={`${register ? "/login" : "/register"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{register ? "Sign in" : "Create an account"}</Link></p>
  </form>;
}
