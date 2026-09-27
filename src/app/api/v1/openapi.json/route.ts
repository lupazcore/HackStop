import { NextResponse } from "next/server";
import { getOpenApiSpec } from "@/lib/openapi";

export async function GET() {
  const spec = getOpenApiSpec();
  return NextResponse.json(spec, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
