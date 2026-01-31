import { NextRequest } from "next/server";
import { getFilteredJobs, createJob } from "@/lib/services/jobService";
import { parseJobFilters } from "@/lib/jobFilters";
import { apiErrorResponse } from "@/lib/errors";

/**
 * GET /api/jobs - Get jobs with optional filters.
 * Query params: status (open|reserved|closed|all, default all), minBudget, maxBudget, q, location, skills (comma-separated).
 * Example: GET /api/jobs?status=open&minBudget=50&skills=plumbing&q=kitchen
 * Invalid params are ignored; status invalid or missing → "all".
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseJobFilters(request.nextUrl.searchParams);
    const jobs = await getFilteredJobs(filters);
    return Response.json(jobs);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/jobs - Create job
 * Example body: {
 *   "title": "Fix plumbing",
 *   "description": "Kitchen sink leak",
 *   "location": "London",
 *   "budget": "100",
 *   "images": ["https://example.com/1.jpg"],
 *   "video": "https://example.com/v.mp4",
 *   "createdBy": "<userId>",
 *   "latitude": 51.5074,
 *   "longitude": -0.1278
 * }
 * latitude must be -90 to 90, longitude -180 to 180.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const { title, description, location, budget: budgetRaw, images, video, createdBy, latitude, longitude, skills } = body as {
      title?: string;
      description?: string;
      location?: string;
      budget?: string | number;
      images?: string[];
      video?: string;
      createdBy?: string;
      latitude?: number;
      longitude?: number;
      skills?: string[];
    };
    const budget = budgetRaw != null && budgetRaw !== "" ? String(budgetRaw) : undefined;
    if (!title || !description || !location || !budget || !createdBy) {
      return Response.json(
        { error: "title, description, location, budget and createdBy are required" },
        { status: 400 }
      );
    }
    const job = await createJob({
      title,
      description,
      location,
      budget,
      images: Array.isArray(images) ? images : [],
      video,
      createdBy,
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      skills: Array.isArray(skills) ? skills : undefined,
    });
    return Response.json(
      { ...job, images: JSON.parse(job.images) as string[] },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
