"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="panel mx-auto max-w-2xl space-y-5 border-t-[3px] border-t-error"><h1>Unable to load this page</h1><p className="text-ink-secondary">The server could not retrieve this page. Retry the request.</p><button className="button" onClick={reset}>Try again</button></div>; }
