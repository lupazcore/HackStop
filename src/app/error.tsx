"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="panel space-y-5"><h1>Unable to load this page</h1><p>The server could not retrieve this page. Retry the request.</p><button className="button" onClick={reset}>Try again</button></div>; }
