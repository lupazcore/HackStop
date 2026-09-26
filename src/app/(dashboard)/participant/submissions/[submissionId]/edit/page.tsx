import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageActor } from "@/lib/page-auth";
import { ownedTeams } from "@/lib/permissions";
import { formTeams } from "@/lib/project-form";
import { stringList } from "@/lib/display";
import { ProjectForm } from "@/components/forms/ProjectForm";

export default async function EditSubmission({ params }: { params: Promise<{ submissionId: string }> }) {
  const actor = await pageActor("participant"); const { submissionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) notFound();
  const [project, teams] = await Promise.all([db.project.findFirst({ where: { id: submissionId, team: ownedTeams(actor) } }), formTeams(actor)]);
  if (!project) notFound();
  const answers = project.custom_answers && typeof project.custom_answers === "object" && !Array.isArray(project.custom_answers) ? Object.fromEntries(Object.entries(project.custom_answers).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
  const values = { id: project.id, team_id: project.team_id, track_id: project.track_id, title: project.title, tagline: project.tagline, summary: project.summary, thumbnail_url: project.thumbnail_url, demo_video_url: project.demo_video_url, repo_url: project.repo_url, live_url: project.live_url, image_urls: stringList(project.image_urls), tech_tags: stringList(project.tech_tags), custom_answers: answers, status: project.status };
  return <div className="mx-auto max-w-3xl space-y-8"><h1>Edit project</h1><ProjectForm teams={teams} project={values} /></div>;
}
