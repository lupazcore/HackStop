import Link from "next/link";
import { pageActor } from "@/lib/page-auth";
import { formTeams } from "@/lib/project-form";
import { ProjectForm } from "@/components/forms/ProjectForm";

export default async function NewSubmission() {
  const actor = await pageActor("participant"); const teams = await formTeams(actor);
  return <div className="mx-auto max-w-3xl space-y-8"><h1>New project</h1>{teams.length ? <ProjectForm teams={teams} /> : <div className="panel space-y-5"><p>Join or create a team before starting your submission.</p><Link className="button" href="/participant/teams">Find your team</Link></div>}</div>;
}
