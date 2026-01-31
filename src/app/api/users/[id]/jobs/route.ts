import { NextRequest } from "next/server";
import { getJobsForUser } from "@/lib/services/jobService";
import { apiErrorResponse } from "@/lib/errors";
import { getUserById } from "@/lib/services/userService";

/**
 * GET /api/users/:id/jobs
 * Returns "My Jobs" for the user:
 * - created: jobs they created (as client)
 * - workingOn: jobs where they have an accepted offer (as labour)
 * Sorted by createdAt desc, with images array and offerCount.
 *
 * Output example: { "created": [ {...job} ], "workingOn": [ {...job} ] }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    await getUserById(userId);
    const jobs = await getJobsForUser(userId);
    return Response.json(jobs);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
