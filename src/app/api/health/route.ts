import { db } from "@/lib/db";
import { api, success } from "@/lib/http";

export async function GET() {
  return api(async () => {
    await db.event.count();
    return success({ status: "ready" });
  });
}
