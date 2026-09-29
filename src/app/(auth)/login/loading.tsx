export default function LoginLoading() {
  return <div role="status" aria-label="Loading sign in" className="auth-shell auth-loading">
    <section className="auth-story" aria-hidden="true">
      <div className="auth-skeleton h-6 w-28" />
      <div className="auth-story-content space-y-5">
        <div className="auth-skeleton h-12 w-[min(100%,26rem)]" />
        <div className="auth-skeleton h-12 w-[min(80%,22rem)]" />
        <div className="auth-skeleton mt-8 h-5 w-[min(100%,28rem)]" />
        <div className="auth-skeleton h-5 w-[min(88%,25rem)]" />
      </div>
    </section>
    <section className="auth-entry" aria-hidden="true">
      <div className="auth-entry-content space-y-5">
        <div className="auth-skeleton h-9 w-48" />
        <div className="auth-skeleton h-5 w-72 max-w-full" />
        <div className="auth-skeleton mt-10 h-4 w-28" />
        <div className="auth-skeleton h-12 w-full" />
        <div className="auth-skeleton mt-6 h-4 w-24" />
        <div className="auth-skeleton h-12 w-full" />
        <div className="auth-skeleton mt-5 h-11 w-28" />
      </div>
    </section>
  </div>;
}
