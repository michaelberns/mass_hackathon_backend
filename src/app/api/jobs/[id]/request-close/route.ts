import { NextRequest } from "next/server";
import { requestClose } from "@/lib/services/jobService";
import { apiErrorResponse } from "@/lib/errors";

/**
 * POST /api/jobs/:id/request-close
 * Labour requests to close the job. Header: X-User-Id: <labourId>
 * Only allowed when job.status === "reserved" and user is the accepted labour.
 * Sets closeRequestedBy = "labour". Does not close the job; client must approve via POST /api/jobs/:id/close.
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
    const job = await requestClose(id, userId);
    return Response.json(job);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
