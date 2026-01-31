import { NextRequest } from "next/server";
import { getFilteredJobsForMap } from "@/lib/services/jobService";
import { parseJobFilters } from "@/lib/jobFilters";
import { apiErrorResponse } from "@/lib/errors";

/**
 * GET /api/jobs/map
 * Returns jobs with valid coordinates, minimal payload for map. Same query params as GET /api/jobs (status, minBudget, maxBudget, q, location, skills).
 * Example: GET /api/jobs/map?status=reserved&q=kitchen
 *
 * Output example:
 * [
 *   {
 *     "id": "job_1",
 *     "title": "Fix plumbing",
 *     "budget": "100",
 *     "latitude": 51.5074,
 *     "longitude": -0.1278,
 *     "images": ["https://res.cloudinary.com/.../photo.jpg"]
 *   }
 * ]
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseJobFilters(request.nextUrl.searchParams);
    const jobs = await getFilteredJobsForMap(filters);
    return Response.json(jobs);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
