import Link from "next/link";
export default function NotFound() { return <div className="space-y-5"><h1>Page not found</h1><p>The page is unavailable or does not belong to your account.</p><Link href="/projects" className="button">Browse projects</Link></div>; }
