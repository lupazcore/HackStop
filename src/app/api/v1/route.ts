import { NextResponse } from "next/server";
import { requiredEnv } from "@/lib/env";

export async function GET() {
  const baseUrl = requiredEnv("APP_URL");
  return NextResponse.json({
    name: "HackStop REST API",
    version: "v1",
    openapi_spec: `${baseUrl}/api/v1/openapi.json`,
    description: "Stable, versioned public REST API for HackStop hackathon management.",
    resources: [
      "/health",
      "/auth/login",
      "/auth/logout",
      "/auth/register",
      "/auth/me",
      "/events",
      "/events/{eventId}",
      "/projects",
      "/projects/new",
      "/projects/{projectId}",
      "/projects/{projectId}/comments",
      "/teams",
      "/teams/{teamId}",
      "/teams/{teamId}/invite",
      "/judge/assignments",
      "/judge/assignments/{projectId}",
      "/judge/scores",
      "/organizer/assignments",
      "/organizer/judges",
      "/organizer/progress",
      "/organizer/results",
      "/organizer/rubric",
      "/organizer/community-audit",
      "/votes",
      "/export.csv"
    ]
  }, {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
