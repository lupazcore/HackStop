import Link from "next/link";
import { AuthForm } from "@/components/forms/AuthForm";
import { AppearanceControl } from "@/components/layout/AppearanceControl";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <div className="auth-shell">
    <section className="auth-story" aria-label="About HackStop">
      <Link href="/projects" className="inline-flex w-fit text-xl font-bold tracking-tight text-ink no-underline">Hack<span className="text-primary-ink">Stop</span></Link>
      <div className="auth-story-content">
        <p className="auth-story-headline">Run your hackathon.<br /><span className="auth-private text-primary-ink">Keep it private.</span></p>
        <ul className="mt-8 space-y-5 text-sm text-ink-secondary sm:text-base">
          <li className="flex gap-4"><span aria-hidden="true" className="auth-point bg-primary" />Self-hosted event operations on your own infrastructure.</li>
          <li className="flex gap-4"><span aria-hidden="true" className="auth-point bg-accent" />Judge scoring stays private to each assigned judge.</li>
          <li className="flex gap-4"><span aria-hidden="true" className="auth-point bg-primary" />Export normalized rankings when judging is complete.</li>
        </ul>
      </div>
    </section>
    <section className="auth-entry" aria-labelledby="login-title">
      <div className="auth-theme"><AppearanceControl /></div>
      <div className="auth-entry-content">
        <h1 id="login-title">Welcome back</h1>
        <p className="mt-3 mb-10 text-ink-secondary">Sign in to manage your event or submission.</p>
        <AuthForm next={(await searchParams).next} />
      </div>
    </section>
  </div>;
}
