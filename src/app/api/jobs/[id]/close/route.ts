import { NextRequest } from "next/server";
import { closeJob } from "@/lib/services/jobService";
import { apiErrorResponse } from "@/lib/errors";

/**
 * POST /api/jobs/:id/close
 * Client closes the job. Header: X-User-Id: <clientId>
 * Only allowed when job.status === "reserved" and user is the job creator.
 * Sets status = "closed", closedAt = now(), closeRequestedBy = null.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("X-User-Id") ?? "";
    if (!userId) {
      return Response.json(
        { error: "X-User-Id header required" },
        { status: 400 }
      );
    }
    const job = await closeJob(id, userId);
    return Response.json(job);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
