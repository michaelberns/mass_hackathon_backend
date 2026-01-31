import { NextRequest } from "next/server";
import { rejectCloseRequest } from "@/lib/services/jobService";
import { apiErrorResponse } from "@/lib/errors";

/**
 * POST /api/jobs/:id/reject-close
 * Client rejects labour's close request. Header: X-User-Id: <clientId>
 * Only the job creator can do this. Sets closeRequestedBy = null.
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
    const job = await rejectCloseRequest(id, userId);
    return Response.json(job);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
