import { NextRequest } from "next/server";
import { getUserById, updateUser } from "@/lib/services/userService";
import { apiErrorResponse } from "@/lib/errors";
import type { UserUpdate } from "@/types";

/**
 * GET /api/users/:id - Get full user profile (skills returned as array)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserById(id);
    return Response.json(user);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PUT /api/users/:id - Update profile
 * Example body: { "location": "London", "bio": "...", "skills": ["plumbing"], "yearsOfExperience": 5 }
 * profileCompleted is computed: true when location and bio set, and (if labour) skills and yearsOfExperience set.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const data: UserUpdate = {};
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.email === "string") data.email = body.email;
    if (body.role === "client" || body.role === "labour") data.role = body.role;
    if (typeof body.avatarUrl === "string" || body.avatarUrl === null) data.avatarUrl = body.avatarUrl ?? undefined;
    if (typeof body.location === "string" || body.location === null) data.location = body.location ?? undefined;
    if ("bio" in body) data.bio = body.bio === null ? undefined : String(body.bio);
    if (Array.isArray(body.skills)) data.skills = body.skills as string[];
    if (typeof body.yearsOfExperience === "number" || body.yearsOfExperience === null) data.yearsOfExperience = body.yearsOfExperience ?? undefined;
    if (typeof body.companyName === "string" || body.companyName === null) data.companyName = body.companyName ?? undefined;
    const user = await updateUser(id, data);
    return Response.json(user);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
