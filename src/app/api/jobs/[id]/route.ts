import { NextRequest } from "next/server";
import { getJobById, updateJob, deleteJob } from "@/lib/services/jobService";
import { apiErrorResponse } from "@/lib/errors";

/**
 * GET /api/jobs/:id - Get job by id (includes offerCount)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);
    return Response.json(job);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PUT /api/jobs/:id - Update job (creator only; pass X-User-Id header)
 * Example body: { "title": "Updated title", "status": "closed" }
 */
export async function PUT(
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
    const body = (await request.json()) as Record<string, unknown>;
    const data: {
      title?: string;
      description?: string;
      location?: string;
      budget?: string;
      images?: string[];
      video?: string;
      status?: "open" | "reserved" | "closed";
      latitude?: number;
      longitude?: number;
      skills?: string[];
    } = {};
    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.description === "string") data.description = body.description;
    if (typeof body.location === "string") data.location = body.location;
    if (body.budget !== undefined && body.budget !== null && body.budget !== "")
      data.budget = String(body.budget);
    if (Array.isArray(body.images)) data.images = body.images as string[];
    if (typeof body.video === "string" || body.video === null) data.video = body.video ?? undefined;
    if (body.status === "open" || body.status === "reserved" || body.status === "closed") data.status = body.status;
    if (body.latitude !== undefined && body.latitude !== null) data.latitude = Number(body.latitude);
    if (body.longitude !== undefined && body.longitude !== null) data.longitude = Number(body.longitude);
    if (Array.isArray(body.skills)) data.skills = body.skills as string[];
    const job = await updateJob(id, userId, data);
    const parseSkills = (s: string | null): string[] => {
      if (!s) return [];
      try {
        const arr = JSON.parse(s) as unknown;
        return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
      } catch {
        return [];
      }
    };
    return Response.json({
      ...job,
      images: typeof job.images === "string" ? (JSON.parse(job.images) as string[]) : job.images,
      skills: parseSkills(job.skills),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/jobs/:id - Delete job (creator only; pass X-User-Id header)
 */
export async function DELETE(
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
    await deleteJob(id, userId);
    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
