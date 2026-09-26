CREATE TYPE "Role" AS ENUM ('participant', 'judge', 'organizer', 'admin');

CREATE TYPE "MemberRole" AS ENUM ('leader', 'member');

CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'submitted');

CREATE TYPE "AssignmentStatus" AS ENUM ('pending', 'in_progress', 'completed');

CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "external_id" VARCHAR(50),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" VARCHAR(255) NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "external_id" VARCHAR(50),
    "organizer_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "submissions_open" TIMESTAMPTZ(6),
    "submissions_close" TIMESTAMPTZ(6) NOT NULL,
    "judging_open" TIMESTAMPTZ(6),
    "judging_close" TIMESTAMPTZ(6),
    "prizes" JSONB NOT NULL DEFAULT '[]',
    "custom_questions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Track" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "external_id" VARCHAR(50),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "external_id" VARCHAR(50),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "invite_code" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamMember" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'member',

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "external_id" VARCHAR(50),
    "team_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "tagline" VARCHAR(500),
    "summary" TEXT,
    "thumbnail_url" VARCHAR(2048),
    "image_urls" JSONB,
    "demo_video_url" VARCHAR(2048),
    "repo_url" VARCHAR(2048),
    "live_url" VARCHAR(2048),
    "tech_tags" JSONB,
    "custom_answers" JSONB,
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Rubric" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RubricCriterion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rubric_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "max_score" INTEGER NOT NULL DEFAULT 5,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JudgeTrackAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "judge_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,

    CONSTRAINT "JudgeTrackAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JudgeAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "judge_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'pending',
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgeAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Score" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "judge_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "criterion_id" UUID NOT NULL,
    "value" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NormalizedResult" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "criterion_scores" JSONB NOT NULL,
    "weighted_total" DECIMAL(10,6) NOT NULL,
    "rank" INTEGER,
    "review_count" INTEGER NOT NULL,
    "raw_avg" JSONB,
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NormalizedResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_external_id_key" ON "User"("external_id");

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");

CREATE UNIQUE INDEX "Event_external_id_key" ON "Event"("external_id");

CREATE INDEX "Event_organizer_id_idx" ON "Event"("organizer_id");

CREATE UNIQUE INDEX "Track_external_id_key" ON "Track"("external_id");

CREATE INDEX "Track_event_id_idx" ON "Track"("event_id");

CREATE UNIQUE INDEX "Team_external_id_key" ON "Team"("external_id");

CREATE UNIQUE INDEX "Team_invite_code_key" ON "Team"("invite_code");

CREATE INDEX "Team_event_id_idx" ON "Team"("event_id");

CREATE INDEX "TeamMember_user_id_idx" ON "TeamMember"("user_id");

CREATE UNIQUE INDEX "TeamMember_team_id_user_id_key" ON "TeamMember"("team_id", "user_id");

CREATE UNIQUE INDEX "Project_external_id_key" ON "Project"("external_id");

CREATE INDEX "Project_track_id_idx" ON "Project"("track_id");

CREATE INDEX "Project_team_id_idx" ON "Project"("team_id");

CREATE INDEX "Project_status_idx" ON "Project"("status");

CREATE UNIQUE INDEX "Rubric_event_id_key" ON "Rubric"("event_id");

CREATE UNIQUE INDEX "RubricCriterion_rubric_id_name_key" ON "RubricCriterion"("rubric_id", "name");

CREATE INDEX "JudgeTrackAssignment_track_id_idx" ON "JudgeTrackAssignment"("track_id");

CREATE UNIQUE INDEX "JudgeTrackAssignment_judge_id_track_id_key" ON "JudgeTrackAssignment"("judge_id", "track_id");

CREATE INDEX "JudgeAssignment_project_id_idx" ON "JudgeAssignment"("project_id");

CREATE UNIQUE INDEX "JudgeAssignment_judge_id_project_id_key" ON "JudgeAssignment"("judge_id", "project_id");

CREATE INDEX "Score_project_id_idx" ON "Score"("project_id");

CREATE INDEX "Score_criterion_id_idx" ON "Score"("criterion_id");

CREATE UNIQUE INDEX "Score_judge_id_project_id_criterion_id_key" ON "Score"("judge_id", "project_id", "criterion_id");

CREATE UNIQUE INDEX "NormalizedResult_project_id_key" ON "NormalizedResult"("project_id");

ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Track" ADD CONSTRAINT "Track_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Team" ADD CONSTRAINT "Team_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "Rubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JudgeTrackAssignment" ADD CONSTRAINT "JudgeTrackAssignment_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JudgeTrackAssignment" ADD CONSTRAINT "JudgeTrackAssignment_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JudgeAssignment" ADD CONSTRAINT "JudgeAssignment_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JudgeAssignment" ADD CONSTRAINT "JudgeAssignment_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Score" ADD CONSTRAINT "Score_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Score" ADD CONSTRAINT "Score_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Score" ADD CONSTRAINT "Score_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "RubricCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Score" ADD CONSTRAINT "Score_judge_id_project_id_fkey" FOREIGN KEY ("judge_id", "project_id") REFERENCES "JudgeAssignment"("judge_id", "project_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NormalizedResult" ADD CONSTRAINT "NormalizedResult_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
