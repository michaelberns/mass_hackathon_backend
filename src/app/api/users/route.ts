import { NextRequest } from "next/server";
import { createUser } from "@/lib/services/userService";
import { apiErrorResponse } from "@/lib/errors";
import type { UserCreate } from "@/types";

/**
 * POST /api/users - Create user (only name, email, role required; profileCompleted = false)
 * Example body: { "name": "Jane Doe", "email": "jane@example.com", "role": "labour" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const { name, email, role } = body as UserCreate;
    if (!name || !email || !role) {
      return Response.json(
        { error: "name, email and role are required" },
        { status: 400 }
      );
    }
    if (role !== "client" && role !== "labour") {
      return Response.json(
        { error: "role must be 'client' or 'labour'" },
        { status: 400 }
      );
    }
    const user = await createUser({ name, email, role });
    return Response.json(user, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
